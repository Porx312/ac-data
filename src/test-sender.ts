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

async function sendNewSession() {
    console.log('Sending NEW_SESSION...');
    const type = Buffer.from([ACSP.NEW_SESSION]);
    const protocol = Buffer.from([1]);
    const sessionIdx = Buffer.from([0]);
    const currentSessionIdx = Buffer.from([0]);
    const sessionCount = Buffer.from([1]);
    
    const serverName = createUTF16Buffer('Test Server');
    const trackName = createUTF16Buffer('monza');
    const trackConfig = createUTF16Buffer('gp');
    const sessionName = createUTF16Buffer('Qualifying');
    
    const msg = Buffer.concat([
        type, protocol, sessionIdx, currentSessionIdx, sessionCount,
        serverName, trackName, trackConfig, sessionName
    ]);
    
    client.send(msg, TARGET_PORT, TARGET_HOST);
}

async function sendNewCar() {
    console.log('Sending NEW_CAR_CONNECTION...');
    const type = Buffer.from([ACSP.NEW_CAR_CONNECTION]);
    const carId = Buffer.from([7]);
    
    const carModel = createUTF16Buffer('rss_formula_hybrid_2023');
    const carSkin = createUTF16Buffer('red_bull');
    const driverName = createUTF16Buffer('Max Verstappen');
    const driverTeam = createUTF16Buffer('Red Bull Racing');
    const guid = createUTF16Buffer('12345678901234567');
    
    const msg = Buffer.concat([
        type, carId, carModel, carSkin, driverName, driverTeam, guid
    ]);
    
    client.send(msg, TARGET_PORT, TARGET_HOST);
}

setTimeout(async () => {
    await sendNewSession();
    setTimeout(async () => {
        await sendNewCar();
        setTimeout(() => {
            console.log('Tests sent.');
            client.close();
        }, 500);
    }, 500);
}, 500);
