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

    readString(): string {
        if (this.offset >= this.buffer.length) return '';
        
        const startOffset = this.offset;
        let length = this.readUInt8();
        if (length === null) return '';

        // --- DETECCIÓN DE UTF-32 (Padded 4-bytes) ---
        
        // Caso A: Sin prefijo de longitud (Autodetect)
        // Si el byte 'length' + los siguientes 3 bytes parecen un char UTF-32 (bytes 1,2,3 son 0)
        // y no es un null char inicial.
        if (this.offset + 3 <= this.buffer.length) {
            const val = this.buffer.readUInt32LE(this.offset - 1);
            if ((val & 0xFFFFFF00) === 0 && val !== 0) {
                // Probablemente no había longitud. Rebobinamos y leemos como UTF-32.
                this.offset--;
                let res = '';
                while (this.offset + 4 <= this.buffer.length) {
                    const charCode = this.buffer.readUInt32LE(this.offset);
                    if (charCode === 0) { this.offset += 4; break; }
                    if ((charCode & 0xFFFFFF00) !== 0) break;
                    res += String.fromCharCode(charCode);
                    this.offset += 4;
                }
                if (res.length > 0) return res.trim();
                else this.offset = startOffset + 1; // Restaurar si falló
            }
        }

        // Caso B: Con prefijo de longitud
        if (this.offset + (length * 4) <= this.buffer.length && length > 0) {
            const sub = this.buffer.slice(this.offset, this.offset + (length * 4));
            if (sub[1] === 0 && sub[2] === 0 && sub[3] === 0) {
                let res = '';
                for (let i = 0; i < length; i++) {
                    res += String.fromCharCode(sub.readUInt32LE(i * 4));
                }
                this.offset += length * 4;
                return res.trim();
            }
        }

        if (length === 0) return '';

        // --- DETECCIÓN DE UTF-16LE (2-bytes) ---
        if (this.offset + (length * 2) <= this.buffer.length) {
            const sub = this.buffer.slice(this.offset, this.offset + (length * 2));
            if (sub[1] === 0) {
                const res = this.buffer.toString('utf16le', this.offset, this.offset + (length * 2));
                this.offset += length * 2;
                return res.split('\0')[0] || '';
            }
        }

        // --- CASO POR DEFECTO: ASCII / UTF-8 ---
        if (this.offset + length <= this.buffer.length) {
            const res = this.buffer.toString('utf8', this.offset, this.offset + length);
            this.offset += length;
            return res.split('\0')[0] || '';
        }

        return 'Err';
    }

    readUInt16LE(): number | null {
        if (this.offset + 2 > this.buffer.length) return null;
        const val = this.buffer.readUInt16LE(this.offset);
        this.offset += 2;
        return val;
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
                const proto = reader.readUInt8();
                const sessionIdx = reader.readUInt8();
                const currentIdx = reader.readUInt8();
                const sessionCount = reader.readUInt8();

                if (proto === null || sessionIdx === null || currentIdx === null || sessionCount === null) break;
                
                const serverName = reader.readString();
                const trackName = reader.readString();
                const trackConfig = reader.readString();
                const sessionName = reader.readString();

                currentTrack = trackName;
                console.log(`   - Server: ${serverName}`);
                console.log(`   - Pista: ${trackName} (${trackConfig})`);
                console.log(`   - Sesión: ${sessionName} (#${currentIdx + 1}/${sessionCount})`);
                break;
            }

            case ACSP.NEW_CAR_CONNECTION: {
                const carId = reader.readUInt8();
                if (carId === null) break;

                const name = reader.readString();
                const guid = reader.readString();
                reader.readUInt8(); // unknown toggle (01/00)
                const car = reader.readString();
                const skin = reader.readString();

                activeDrivers.set(carId, { name, guid, model: car });
                console.log(`🏎️  [ACSP] Piloto Conectado [ID ${carId}]: ${name} (${car}) - SteamID: ${guid}`);
                break;
            }

            case ACSP.CAR_DISCONNECTED: {
                const carId = reader.readUInt8();
                const name = reader.readString();

                if (carId === null) break;

                const driver = activeDrivers.get(carId);
                if (driver) {
                    console.log(`👋 [ACSP] Piloto Desconectado: ${driver.name} (SteamID: ${driver.guid})`);
                    activeDrivers.delete(carId);
                } else {
                    console.log(`👋 [ACSP] Coche Desconectado (ID: ${carId}) ${name ? '- ' + name : ''}`);
                }
                break;
            }

            case ACSP.LAP_COMPLETED: {
                const carId = reader.readUInt8();
                const lapTime = reader.readUInt32LE();
                const cuts = reader.readUInt8();
                
                if (carId === null || lapTime === null || cuts === null) break;

                const driver = activeDrivers.get(carId);
                const timeStr = lapTime ? (lapTime / 1000).toFixed(3) : '?.???';
                
                if (driver) {
                    console.log(`${cuts === 0 ? '✅' : '❌'} [ACSP] Vuelta ${driver.name} (SteamID: ${driver.guid}): ${timeStr}s (${cuts || 0} cortes)`);
                } else {
                    console.log(`${cuts === 0 ? '✅' : '❌'} [ACSP] Vuelta Detectada ID ${carId}: ${timeStr}s`);
                }
                break;
            }

            case 130:
                // Plugin Data (Realtime)
                break;
            
            case 73: {
                // Plugin Leaderboard Update
                reader.readUInt8(); // proto
                const sessionTime = reader.readUInt32LE();
                const carCount = reader.readUInt8();
                
                if (carCount !== null && carCount < 50) {
                    console.log(`📈 [ACSP] Leaderboard Update (${carCount} coches)`);
                    for (let i = 0; i < carCount; i++) {
                        const bestTime = reader.readUInt32LE();
                        const carId = reader.readUInt8();
                        
                        if (bestTime === null || carId === null) break;
                        
                        if (bestTime !== null && bestTime > 0 && bestTime < 2147483647) {
                            const driver = activeDrivers.get(carId);
                            const timeStr = (bestTime / 1000).toFixed(3);
                            if (driver) {
                                console.log(`   🏆 Best Lap [${driver.name}]: ${timeStr}s`);
                            }
                        }
                    }
                }
                break;
            }

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
