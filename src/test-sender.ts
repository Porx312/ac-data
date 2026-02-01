import dgram from 'dgram';
import { ACSP } from './types/ac-server-protocol.js';

const client = dgram.createSocket('udp4');
const TARGET_PORT = 13000;
const TARGET_HOST = '127.0.0.1';

/**
 * Crea un buffer de caracteres de 4 bytes (UTF-32LE) SIN byte de longitud al principio
 */
function createRawUTF32(str: string): Buffer {
    const dataBuf = Buffer.alloc(str.length * 4);
    for (let i = 0; i < str.length; i++) {
        dataBuf.writeUInt32LE(str.charCodeAt(i), i * 4);
    }
    return dataBuf;
}

/**
 * Crea un buffer con length (byte) y caracteres de 4 bytes
 */
function createUTF32WithLen(str: string): Buffer {
    const lenBuf = Buffer.alloc(1);
    lenBuf.writeUInt8(str.length, 0);
    const dataBuf = createRawUTF32(str);
    return Buffer.concat([lenBuf, dataBuf]);
}

/**
 * Crea un buffer con length (byte) y caracteres ASCII
 */
function createASCIIWithLen(str: string): Buffer {
    const lenBuf = Buffer.alloc(1);
    lenBuf.writeUInt8(str.length, 0);
    const dataBuf = Buffer.from(str, 'ascii');
    return Buffer.concat([lenBuf, dataBuf]);
}

async function sendUserPacket() {
    console.log('Sending exact 125-byte User Packet (Type 51)...');
    
    const type = Buffer.from([ACSP.NEW_CAR_CONNECTION]);
    const carId = Buffer.from([4]);
    const driverName = createRawUTF32('Porx'); // SIN length byte
    const guid = createUTF32WithLen('76561199230780195');
    const unknown = Buffer.from([1]);
    const carModel = createASCIIWithLen('ks_toyota_ae86_tuned');
    const carSkin = createASCIIWithLen('05_white_carbon');
    
    const msg = Buffer.concat([
        type, carId, driverName, guid, unknown, carModel, carSkin
    ]);
    
    console.log(`Total size: ${msg.length} bytes`);
    client.send(msg, TARGET_PORT, TARGET_HOST);
}

async function sendShortLap() {
    console.log('Sending short LAP_COMPLETED (2 bytes)...');
    client.send(Buffer.from([ACSP.LAP_COMPLETED, 0x01]), TARGET_PORT, TARGET_HOST);
}

setTimeout(async () => {
    await sendUserPacket();
    setTimeout(async () => {
        await sendShortLap();
        setTimeout(() => {
            console.log('Verification packets sent.');
            client.close();
        }, 500);
    }, 500);
}, 500);
