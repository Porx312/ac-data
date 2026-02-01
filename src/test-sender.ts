import dgram from 'dgram';
import { ACSP } from './types/ac-server-protocol.js';

const client = dgram.createSocket('udp4');
const TARGET_PORT = 13000;
const TARGET_HOST = '127.0.0.1';

function createRawUTF32(str: string): Buffer {
    const dataBuf = Buffer.alloc(str.length * 4);
    for (let i = 0; i < str.length; i++) {
        dataBuf.writeUInt32LE(str.charCodeAt(i), i * 4);
    }
    return dataBuf;
}

function createASCIIWithLen(str: string): Buffer {
    const lenBuf = Buffer.alloc(1);
    lenBuf.writeUInt8(str.length, 0);
    const dataBuf = Buffer.from(str, 'ascii');
    return Buffer.concat([lenBuf, dataBuf]);
}

async function sendNewSession() {
    console.log('Sending NEW_SESSION (Type 50)...');
    const type = Buffer.from([ACSP.NEW_SESSION]);
    const protocol = Buffer.from([1, 0, 0, 1]); // proto, idx, curr, count
    const serverName = createASCIIWithLen('Drift Server');
    const trackName = createASCIIWithLen('vallelunga');
    const trackConfig = createASCIIWithLen('drift');
    const sessionName = createASCIIWithLen('Practice');
    
    const msg = Buffer.concat([type, protocol, serverName, trackName, trackConfig, sessionName]);
    client.send(msg, TARGET_PORT, TARGET_HOST);
}

async function sendNewCar() {
    console.log('Sending NEW_CAR_CONNECTION (Type 51)...');
    const type = Buffer.from([ACSP.NEW_CAR_CONNECTION]);
    const carId = Buffer.from([4]);
    const driverName = createRawUTF32('Porx');
    const guid = createASCIIWithLen('76561199230780195'); // En el log del user a veces es ASCII a veces Padded, probamos ASCII
    const unknown = Buffer.from([1]);
    const carModel = createASCIIWithLen('ks_toyota_ae86');
    const carSkin = createASCIIWithLen('drift');
    
    const msg = Buffer.concat([type, carId, driverName, guid, unknown, carModel, carSkin]);
    client.send(msg, TARGET_PORT, TARGET_HOST);
}

async function sendLeaderboard() {
    console.log('Sending Type 73 Leaderboard...');
    const type = Buffer.from([73]);
    const proto = Buffer.from([1]);
    const time = Buffer.alloc(4);
    time.writeUInt32LE(500000, 0); // 500s de sesion
    const count = Buffer.from([1]);
    
    const bestTime = Buffer.alloc(4);
    bestTime.writeUInt32LE(85430, 0); // 1:25.430
    const carId = Buffer.from([4]);
    
    const msg = Buffer.concat([type, proto, time, count, bestTime, carId]);
    client.send(msg, TARGET_PORT, TARGET_HOST);
}

setTimeout(async () => {
    await sendNewSession();
    setTimeout(async () => {
        await sendNewCar();
        setTimeout(async () => {
            await sendLeaderboard();
            setTimeout(() => {
                console.log('Verification packets sent.');
                client.close();
            }, 500);
        }, 500);
    }, 500);
}, 500);
