import dgram from 'dgram';
import { ACSP } from './types/ac-server-protocol.js';

const client = dgram.createSocket('udp4');
const TARGET_PORT = 13000;
const TARGET_HOST = '127.0.0.1';

function createUTF16Buffer(str: string): Buffer {
    const strBuf = Buffer.from(str, 'utf16le');
    const lenBuf = Buffer.alloc(1);
    lenBuf.writeUInt8(str.length, 0);
    return Buffer.concat([lenBuf, strBuf]);
}

/**
 * Simula el formato de 4-bytes por char visto en los logs del usuario
 */
function createPaddedBuffer(str: string): Buffer {
    const lenBuf = Buffer.alloc(1);
    lenBuf.writeUInt8(str.length, 0);
    
    const dataBuf = Buffer.alloc(str.length * 4);
    for (let i = 0; i < str.length; i++) {
        dataBuf.writeUInt32LE(str.charCodeAt(i), i * 4);
    }
    return Buffer.concat([lenBuf, dataBuf]);
}

async function sendPoisonLap() {
    console.log('Sending malformed LAP_COMPLETED (2 bytes)...');
    client.send(Buffer.from([ACSP.LAP_COMPLETED, 0x01]), TARGET_PORT, TARGET_HOST);
}

async function sendPaddedCar() {
    console.log('Sending NEW_CAR_CONNECTION with padded strings...');
    const type = Buffer.from([ACSP.NEW_CAR_CONNECTION]);
    const carId = Buffer.from([4]);
    
    // Formato detectado: [carId][Padded Name][Padded Car][Padded Color][Normal Name]...
    // Probamos con DriverName y GUID en formato padded
    const carModel = createPaddedBuffer('ks_toyota_ae86');
    const carSkin = createPaddedBuffer('white');
    const driverName = createPaddedBuffer('Porx');
    const driverTeam = createPaddedBuffer('None');
    const guid = createPaddedBuffer('76561199230780195');
    
    const msg = Buffer.concat([
        type, carId, carModel, carSkin, driverName, driverTeam, guid
    ]);
    
    client.send(msg, TARGET_PORT, TARGET_HOST);
}

setTimeout(async () => {
    await sendPoisonLap();
    setTimeout(async () => {
        await sendPaddedCar();
        setTimeout(() => {
            console.log('Poison tests sent.');
            client.close();
        }, 500);
    }, 500);
}, 500);
