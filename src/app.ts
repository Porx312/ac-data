import ACRemoteTelemetryClient from 'ac-remote-telemetry-client';

const AC_IP = '127.0.0.1'; // Cambia esto si el juego corre en otra IP
const client = new ACRemoteTelemetryClient(AC_IP);

let sessionInfo = {
    car: 'Unknown',
    track: 'Unknown',
    bestLap: Infinity
};

console.log('--- Diagnóstico de Telemetría ---');
console.log(`Conectando a: ${AC_IP}:9996`);

// Implement desired listeners
client.on('HANDSHAKER_RESPONSE', (data) => {
    sessionInfo.car = data.carName;
    sessionInfo.track = data.trackName;
    console.log(`🏎️  Sesión Iniciada: ${sessionInfo.car} @ ${sessionInfo.track}`);
});

client.on('RT_CAR_INFO', (data) => {
    if (data.bestLap > 0 && data.bestLap < sessionInfo.bestLap) {
        sessionInfo.bestLap = data.bestLap;
        const seconds = (data.bestLap / 1000).toFixed(3);
        console.log(`⏱️  Nuevo mejor tiempo: ${seconds}s`);
    }
});

client.on('RT_LAP', (data) => {
    const seconds = (data.time / 1000).toFixed(3);
    console.log(`🏁 Vuelta completada: ${seconds}s`);
});

// Listener de bajo nivel para depuración
(client as any).client.on('message', (msg: Buffer, rinfo: any) => {
    console.log(`📡 Mensaje UDP recibido de ${rinfo.address}:${rinfo.port} - Tamaño: ${rinfo.size} bytes`);
});

(client as any).client.on('listening', () => {
    console.log('✅ Socket UDP escuchando. Enviando handshake...');
    // El handshake debe enviarse después de que el socket esté listo
    client.handshake();
    client.subscribeUpdate();
    client.subscribeSpot();
});

// Iniciar
client.start();

// Recordatorio para el usuario
console.log('💡 Tip: Asegúrate de que Assetto Corsa esté en pista (driving), no solo en los menús.');


