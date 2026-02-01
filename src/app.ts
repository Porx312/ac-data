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

console.log('=== DEBUG: AC Server Admin Listener ===');

server.on('error', (err) => {
    console.error(`❌ Errror de Socket:\n${err.stack}`);
});

// LOG PARA CUALQUIER DATO CRUDO
server.on('message', (msg, rinfo) => {
    console.log(`\n📡 [RAW] Recibido paquete de ${rinfo.address}:${rinfo.port}`);
    console.log(`📏 Tamaño: ${msg.length} bytes | Hex: ${msg.toString('hex').match(/.{1,2}/g)?.join(' ')}`);

    if (msg.length === 0) return;

    const type = msg.readUInt8(0);
    let offset = 1;
    
    switch (type) {
        case ACSP.NEW_SESSION: {
            console.log(`🌍 [ACSP] Nueva sesión detectada (Type: ${type})`);
            const protocolVersion = msg.readUInt8(offset++);
            const sessionIndex = msg.readUInt8(offset++);
            const currentSessionIndex = msg.readUInt8(offset++);
            const sessionCount = msg.readUInt8(offset++);
            
            const { value: serverName, nextOffset: next1 } = readUTF16String(msg, offset);
            const { value: trackName, nextOffset: next2 } = readUTF16String(msg, next1);
            const { value: trackConfig, nextOffset: next3 } = readUTF16String(msg, next2);
            const { value: sessionName, nextOffset: next4 } = readUTF16String(msg, next3);
            
            currentTrack = trackName;
            console.log(`   - Protocolo: ${protocolVersion}`);
            console.log(`   - Server: ${serverName}`);
            console.log(`   - Pista: ${trackName} (${trackConfig})`);
            console.log(`   - Sesión: ${sessionName} (${currentSessionIndex + 1}/${sessionCount})`);
            break;
        }

        case ACSP.NEW_CAR_CONNECTION: {
            const carId = msg.readUInt8(offset++);
            const { value: carModel, nextOffset: next1 } = readUTF16String(msg, offset);
            const { value: carSkin, nextOffset: next2 } = readUTF16String(msg, next1);
            const { value: driverName, nextOffset: next3 } = readUTF16String(msg, next2);
            const { value: driverTeam, nextOffset: next4 } = readUTF16String(msg, next3);
            const { value: guid, nextOffset: next5 } = readUTF16String(msg, next4);

            activeDrivers.set(carId, { name: driverName, guid, model: carModel });
            console.log(`🏎️  [ACSP] Piloto Conectado [ID ${carId}]: ${driverName} (${carModel}) - GUID: ${guid}`);
            break;
        }

        case ACSP.CAR_DISCONNECTED: {
            const carId = msg.readUInt8(offset++);
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
            const carId = msg.readUInt8(offset++);
            const lapTime = msg.readUInt32LE(offset);
            offset += 4;
            const cuts = msg.readUInt8(offset++);
            const carCount = msg.readUInt8(offset++);
            
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

function readUTF16String(buffer: Buffer, offset: number): { value: string, nextOffset: number } {
    if (offset >= buffer.length) return { value: 'Err', nextOffset: offset };
    const length = buffer.readUInt8(offset);
    if (length === 0) return { value: '', nextOffset: offset + 1 };
    
    // length is number of characters, UTF16 is 2 bytes per char
    const start = offset + 1;
    const end = start + (length * 2);
    
    if (end > buffer.length) return { value: 'Err (Truncated)', nextOffset: buffer.length };
    
    const value = buffer.toString('utf16le', start, end);
    return { value, nextOffset: end };
}
