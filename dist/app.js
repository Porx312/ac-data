import dgram from 'dgram';
import { ACSP } from './types/ac-server-protocol.js';
const LISTEN_PORT = 12000;
const server = dgram.createSocket('udp4');
const activeDrivers = new Map();
let currentTrack = 'Unknown';
console.log('--- Assetto Corsa Server Admin Listener ---');
server.on('error', (err) => {
    console.error(`❌ Server Error:\n${err.stack}`);
    server.close();
});
server.on('message', (msg, rinfo) => {
    const type = msg.readUInt8(0);
    // console.log(`📡 Recibido tipo ${type} de ${rinfo.address}:${rinfo.port}`);
    switch (type) {
        case ACSP.NEW_SESSION: {
            // Un packete complejo, extraemos lo básico
            // El offset suele variar según versión, pero el nombre suele estar tras version byte
            // Para simplificar buscamos strings utf-16le
            const trackName = readUTF16String(msg, 2);
            currentTrack = trackName;
            console.log(`🌍 Nueva sesión detectada en: ${currentTrack}`);
            break;
        }
        case ACSP.NEW_CAR_CONNECTION: {
            const carId = msg.readUInt8(1);
            const carModel = readUTF16String(msg, 2);
            const driverName = readUTF16String(msg, 2 + (carModel.length + 1) * 2);
            const guid = readUTF16String(msg, 2 + (carModel.length + 1) * 2 + (driverName.length + 1) * 2);
            activeDrivers.set(carId, { name: driverName, guid, model: carModel });
            console.log(`🏎️  Piloto Conectado [ID ${carId}]: ${driverName} (${carModel}) - GUID: ${guid}`);
            break;
        }
        case ACSP.CAR_DISCONNECTED: {
            const carId = msg.readUInt8(1);
            const driver = activeDrivers.get(carId);
            if (driver) {
                console.log(`👋 Piloto Desconectado: ${driver.name}`);
                activeDrivers.delete(carId);
            }
            break;
        }
        case ACSP.LAP_COMPLETED: {
            const carId = msg.readUInt8(1);
            const lapTime = msg.readUInt32LE(2); // ms
            const cuts = msg.readUInt8(6);
            const driver = activeDrivers.get(carId);
            const timeStr = (lapTime / 1000).toFixed(3);
            if (driver) {
                if (cuts === 0) {
                    console.log(`✅ ¡VUELTA VÁLIDA! [${driver.name}]: ${timeStr}s en ${driver.model}`);
                    // AQUÍ ES DONDE GUARDARÍAS EN TU BASE DE DATOS
                }
                else {
                    console.log(`❌ Vuelta invalidada (${cuts} cortes) [${driver.name}]: ${timeStr}s`);
                }
            }
            break;
        }
    }
});
server.on('listening', () => {
    const address = server.address();
    console.log(`� Oyente UDP activo en ${address.address}:${address.port}`);
    console.log(`⚠️  Configura tus servidores para enviar datos a esta IP:${address.port}`);
});
server.bind(LISTEN_PORT);
/**
 * Utilidad simple para leer strings UTF-16LE de los paquetes de AC
 */
function readUTF16String(buffer, offset) {
    const length = buffer.readUInt8(offset);
    if (length === 0)
        return '';
    return buffer.toString('utf16le', offset + 1, offset + 1 + (length * 2));
}
console.log('💡 Tip: No olvides abrir el puerto UDP 12000 en tu router/firewall.');
//# sourceMappingURL=app.js.map