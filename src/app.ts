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
    console.log(`📏 Tamaño: ${msg.length} bytes | Primeros bytes: [${[...msg.slice(0, 10)].join(', ')}]`);

    const type = msg.readUInt8(0);
    
    switch (type) {
        case ACSP.NEW_SESSION: {
            const trackName = readUTF16String(msg, 2); 
            currentTrack = trackName;
            console.log(`🌍 [ACSP] Nueva sesión: ${currentTrack}`);
            break;
        }

        case ACSP.NEW_CAR_CONNECTION: {
            const carId = msg.readUInt8(1);
            const carModel = readUTF16String(msg, 2);
            const driverName = readUTF16String(msg, 2 + (carModel.length + 1) * 2);
            const guid = readUTF16String(msg, 2 + (carModel.length + 1) * 2 + (driverName.length + 1) * 2);

            activeDrivers.set(carId, { name: driverName, guid, model: carModel });
            console.log(`🏎️  [ACSP] Piloto Conectado [ID ${carId}]: ${driverName} (${carModel}) - GUID: ${guid}`);
            break;
        }

        case ACSP.LAP_COMPLETED: {
            const carId = msg.readUInt8(1);
            const lapTime = msg.readUInt32LE(2);
            const cuts = msg.readUInt8(6);
            const driver = activeDrivers.get(carId);
            const timeStr = (lapTime / 1000).toFixed(3);
            
            if (driver) {
                console.log(`${cuts === 0 ? '✅' : '❌'} [ACSP] Vuelta ${driver.name}: ${timeStr}s (${cuts} cortes)`);
            } else {
                console.log(`${cuts === 0 ? '✅' : '❌'} [ACSP] Vuelta ID ${carId}: ${timeStr}s (${cuts} cortes)`);
            }
            break;
        }
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

function readUTF16String(buffer: Buffer, offset: number): string {
    if (offset >= buffer.length) return 'Err';
    const length = buffer.readUInt8(offset);
    if (length === 0) return '';
    return buffer.toString('utf16le', offset + 1, offset + 1 + (length * 2));
}
