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
     */
    readString(): string {
        const length = this.readUInt8();
        if (length === null || length === 0) return '';

        // Intentamos detectar si es formato de 4-bytes-por-caracter mirando los siguientes bytes
        // Si hay suficientes bytes para leer length * 4, comprobamos si parece estar "padded" con ceros
        const bytesToRead4 = length * 4;
        const bytesToRead2 = length * 2;
        const bytesToRead1 = length;

        if (this.offset + bytesToRead4 <= this.buffer.length) {
            // Caso sospechoso: 4 bytes por char (visto en algunos servidores)
            const sub = this.buffer.slice(this.offset, this.offset + bytesToRead4);
            // Si parece que cada char tiene ceros extra (ej: P \0 \0 \0 o \0 \0 \0)
            if (sub[1] === 0 && sub[2] === 0 && sub[3] === 0) {
                let res = '';
                for (let i = 0; i < length; i++) {
                    res += String.fromCharCode(sub.readUInt32LE(i * 4));
                }
                this.offset += bytesToRead4;
                return res;
            }
        }

        if (this.offset + bytesToRead2 <= this.buffer.length) {
            // Caso estándar: UTF16LE
            const sub = this.buffer.slice(this.offset, this.offset + bytesToRead2);
            if (sub[1] === 0) {
                const res = this.buffer.toString('utf16le', this.offset, this.offset + bytesToRead2);
                this.offset += bytesToRead2;
                return res;
            }
        }

        if (this.offset + bytesToRead1 <= this.buffer.length) {
            // Caso: ASCII simple
            const res = this.buffer.toString('utf8', this.offset, this.offset + bytesToRead1);
            this.offset += bytesToRead1;
            return res;
        }

        return 'Err (Truncated)';
    }

    getRemaining(): number {
        return this.buffer.length - this.offset;
    }

    getCurrentOffset(): number {
        return this.offset;
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
                console.log(`🌍 [ACSP] Nueva sesión detectada (Type: ${type})`);
                const protocolVersion = reader.readUInt8();
                const sessionIndex = reader.readUInt8();
                const currentSessionIndex = reader.readUInt8();
                const sessionCount = reader.readUInt8();
                
                const serverName = reader.readString();
                const trackName = reader.readString();
                const trackConfig = reader.readString();
                const sessionName = reader.readString();
                
                currentTrack = trackName;
                console.log(`   - Server: ${serverName}`);
                console.log(`   - Pista: ${trackName} (${trackConfig})`);
                console.log(`   - Sesión: ${sessionName} (${(currentSessionIndex || 0) + 1}/${sessionCount})`);
                break;
            }

            case ACSP.NEW_CAR_CONNECTION: {
                const carId = reader.readUInt8();
                if (carId === null) break;

                const carModel = reader.readString();
                const carSkin = reader.readString();
                const driverName = reader.readString();
                const driverTeam = reader.readString();
                const guid = reader.readString();

                activeDrivers.set(carId, { name: driverName, guid, model: carModel });
                console.log(`🏎️  [ACSP] Piloto Conectado [ID ${carId}]: ${driverName} (${carModel}) - GUID: ${guid}`);
                break;
            }

            case ACSP.CAR_DISCONNECTED: {
                const carId = reader.readUInt8();
                if (carId === null) break;

                const driver = activeDrivers.get(carId);
                if (driver) {
                    console.log(`👋 [ACSP] Piloto Desconectado: ${driver.name} (ID: ${carId})`);
                    activeDrivers.delete(carId);
                } else {
                    console.log(`👋 [ACSP] Coche Desconectado (ID: ${carId})`);
                }
                break;
            }

            case ACSP.LAP_COMPLETED: {
                const carId = reader.readUInt8();
                const lapTime = reader.readUInt32LE();
                const cuts = reader.readUInt8();
                const carCount = reader.readUInt8();
                
                if (carId === null || lapTime === null || cuts === null) {
                    console.warn('⚠️  Paquete LAP_COMPLETED truncado');
                    break;
                }

                const driver = activeDrivers.get(carId);
                const timeStr = (lapTime / 1000).toFixed(3);
                
                if (driver) {
                    console.log(`${cuts === 0 ? '✅' : '❌'} [ACSP] Vuelta ${driver.name}: ${timeStr}s (${cuts} cortes)`);
                } else {
                    console.log(`${cuts === 0 ? '✅' : '❌'} [ACSP] Vuelta ID ${carId}: ${timeStr}s (${cuts} cortes)`);
                }
                break;
            }

            default:
                console.log(`❓ [ACSP] Paquete desconocido o no manejado: ${type}`);
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
