import dgram from 'dgram';
import { ACSP } from './types/ac-server-protocol.js';
import readline from 'readline';

const LISTEN_PORT = 13000;
const server = dgram.createSocket('udp4');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const activeDrivers = new Map<number, DriverInfo>();
let currentTrack = 'Unknown';

interface DriverInfo {
    name: string;
    guid: string;
    model: string;
}

/**
 * Clase para lectura segura de Buffers
 */
class SafeBufferReader {
    private offset = 0;
    constructor(private buffer: Buffer) {}

    readUInt8(): number | null {
        if (this.offset + 1 > this.buffer.length) return null;
        return this.buffer.readUInt8(this.offset++);
    }

    readUInt32LE(): number | null {
        if (this.offset + 4 > this.buffer.length) return null;
        const val = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return val;
    }

    /**
     * Lee un string intentando detectar su formato (ASCII, UTF16 o UTF32/padded)
     * Ahora más robusto: si no hay un byte de longitud claro, intenta detectarlo.
     */
    readString(): string {
        const offsetBefore = this.offset;
        let length = this.readUInt8();
        if (length === null) return '';

        // HEURÍSTICA: Si el siguiente byte después del "length" es un char UTF32 (00 00)
        // Pero el byte de "length" parece un carácter printable (> 32), entonces 
        // probablemente NO es un byte de longitud, sino el primer carácter del string.
        if (length > 32 && this.offset + 3 <= this.buffer.length) {
            if (this.buffer[this.offset] === 0 && 
                this.buffer[this.offset + 1] === 0 && 
                this.buffer[this.offset + 2] === 0) {
                // Retrocedemos: el byte 'length' era en realidad el primer byte del string
                this.offset = offsetBefore;
                // Leemos carácteres de 4 bytes hasta que no coincidan con el patrón
                let res = '';
                while (this.offset + 4 <= this.buffer.length) {
                    if (this.buffer[this.offset + 1] === 0 && 
                        this.buffer[this.offset + 2] === 0 && 
                        this.buffer[this.offset + 3] === 0) {
                        res += String.fromCharCode(this.buffer.readUInt32LE(this.offset));
                        this.offset += 4;
                    } else break;
                }
                return res.trim();
            }
        }

        if (length === 0) return '';

        // Caso estándar: Detectar si los bytes que siguen son UTF32, UTF16 o ASCII
        const bytesToRead4 = length * 4;
        const bytesToRead2 = length * 2;
        const bytesToRead1 = length;

        if (this.offset + bytesToRead4 <= this.buffer.length) {
            const sub = this.buffer.slice(this.offset, this.offset + bytesToRead4);
            if (sub[1] === 0 && sub[2] === 0 && sub[3] === 0) {
                let res = '';
                for (let i = 0; i < length; i++) {
                    res += String.fromCharCode(sub.readUInt32LE(i * 4));
                }
                this.offset += bytesToRead4;
                return res.trim();
            }
        }

        if (this.offset + bytesToRead2 <= this.buffer.length) {
            const res = this.buffer.toString('utf16le', this.offset, this.offset + bytesToRead2);
            this.offset += bytesToRead2;
            return res.split('\0')[0] || '';
        }

        if (this.offset + bytesToRead1 <= this.buffer.length) {
            const res = this.buffer.toString('utf8', this.offset, this.offset + bytesToRead1);
            this.offset += bytesToRead1;
            return res.split('\0')[0] || '';
        }

        return 'Err (Truncated)';
    }

    getRemaining(): number {
        return this.buffer.length - this.offset;
    }
}

console.log('=== DEBUG: AC Server Admin Listener ===');

server.on('error', (err) => {
    console.error(`❌ Errror de Socket:\n${err.stack}`);
});

server.on('message', (msg, rinfo) => {
    try {
        console.log(`\n📡 [RAW] Recibido paquete de ${rinfo.address}:${rinfo.port} (${msg.length} bytes)`);
        console.log(`📏 Hex: ${msg.toString('hex').match(/.{1,2}/g)?.join(' ')}`);

        const reader = new SafeBufferReader(msg);
        const type = reader.readUInt8();

        if (type === null) return;

        switch (type) {
            case ACSP.NEW_SESSION: {
                console.log(`🌍 [ACSP] Nueva sesión (Type: ${type})`);
                reader.readUInt8(); // protocol
                reader.readUInt8(); // session idx
                reader.readUInt8(); // current idx
                reader.readUInt8(); // count
                console.log(`   - Server: ${reader.readString()}`);
                console.log(`   - Pista: ${reader.readString()}`);
                break;
            }

            case ACSP.NEW_CAR_CONNECTION: {
                const carId = reader.readUInt8();
                if (carId === null) break;

                // Orden detectado por logs del usuario: Name (Padded), GUID (Padded), ?, Car (ASCII), Skin (ASCII)
                const name = reader.readString();
                const guid = reader.readString();
                reader.readUInt8(); // Byte desconocido (01)
                const car = reader.readString();
                const skin = reader.readString();

                activeDrivers.set(carId, { name, guid, model: car });
                console.log(`🏎️  [ACSP] Piloto Conectado [ID ${carId}]: ${name} (${car}) - SteamID: ${guid}`);
                break;
            }

            case ACSP.CAR_DISCONNECTED: {
                const carId = reader.readUInt8();
                const name = reader.readString(); // A veces envían el nombre al desconectar
                const driver = activeDrivers.get(carId || -1);
                if (driver) {
                    console.log(`👋 [ACSP] Piloto Desconectado: ${driver.name} (SteamID: ${driver.guid})`);
                    activeDrivers.delete(carId!);
                } else {
                    console.log(`👋 [ACSP] Coche Desconectado (ID: ${carId}) ${name ? '- ' + name : ''}`);
                }
                break;
            }

            case ACSP.LAP_COMPLETED: {
                const carId = reader.readUInt8();
                const lapTime = reader.readUInt32LE();
                const cuts = reader.readUInt8();
                
                const driver = activeDrivers.get(carId || -1);
                const timeStr = lapTime ? (lapTime / 1000).toFixed(3) : '?.???';
                
                if (driver) {
                    console.log(`${cuts === 0 ? '✅' : '❌'} [ACSP] Vuelta ${driver.name} (SteamID: ${driver.guid}): ${timeStr}s (${cuts || 0} cortes)`);
                } else {
                    console.log(`${cuts === 0 ? '✅' : '❌'} [ACSP] Vuelta ID ${carId}: ${timeStr}s (${cuts || 0} cortes)`);
                }
                break;
            }

            case 130:
                console.log(`📊 [ACSP] Plugin Data (Tipo 130 - Realtime Update)`);
                break;
            
            case 73:
                console.log(`📈 [ACSP] Plugin Data (Tipo 73 - Telemetry Update)`);
                break;

            default:
                console.log(`❓ [ACSP] Paquete desconocido: ${type}`);
        }
    } catch (err) {
        console.error('❌ Error procesando paquete:', err);
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`🚀 Escuchando en el puerto ${address.port} (UDP)`);
    console.log(`💡 Para que el server te envíe datos, usa esta IP y puerto en server_cfg.ini`);
    
    askForRegistration();
});

function askForRegistration() {
    rl.question('\n¿Quieres forzar registro con un server? Pon la IP:PUERTO (ej: 1.2.3.4:9600) o pulsa ENTER para seguir esperando: ', (answer) => {
        if (answer.includes(':')) {
            const [host, port] = answer.split(':');
            sendRegistration(host!, parseInt(port!));
        }
        askForRegistration();
    });
}

function sendRegistration(host: string, port: number) {
    console.log(`✉️ Enviando solicitud de registro a ${host}:${port}...`);
    const buffer = Buffer.alloc(1);
    buffer.writeUInt8(ACSP.SUBSCRIBE_UPDATE, 0); // 200
    server.send(buffer, 0, buffer.length, port, host, (err) => {
        if (err) console.error('❌ Error enviando registro:', err);
        else console.log('✅ Registro enviado. Espera unos segundos a ver si llega algo.');
    });
}

server.bind(LISTEN_PORT);
