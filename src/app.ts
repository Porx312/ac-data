import ACRemoteTelemetryClient from 'ac-remote-telemetry-client';

const AC_IP = '127.0.0.1'; // IP del PC donde corre Assetto Corsa
const client = new ACRemoteTelemetryClient(AC_IP);

console.log('--- Diagnóstico de Telemetría v2 ---');
console.log(`Configurado para conectar a: ${AC_IP}:9996`);

// Escuchar errores de red
(client as any).client.on('error', (err: any) => {
    console.error('❌ Error de red (UDP):', err);
});

// Listener de bajo nivel para confirmar que el socket se activa
(client as any).client.on('listening', () => {
    const address = (client as any).client.address();
    console.log(`✅ Socket local abierto en el puerto ${address.port} (esperando datos de AC)`);
});

// Capturar CUALQUIER mensaje entrante
(client as any).client.on('message', (msg: Buffer, rinfo: any) => {
    console.log(`📡 Datos recibidos desde AC (${rinfo.address}:${rinfo.port}) - ${msg.length} bytes`);
});

client.on('HANDSHAKER_RESPONSE', (data) => {
    console.log(`🏎️  ¡Conectado! Coche: ${data.carName} | Pista: ${data.trackName}`);
});

client.on('RT_CAR_INFO', (data) => {
    if (data.bestLap > 0) {
        console.log(`⏱️  Lap: ${data.lapCount} | Best: ${(data.bestLap / 1000).toFixed(3)}s`);
    }
});

// Iniciar listeners
client.start();

// Enviar handshake inicial y reintentar cada 5 segundos hasta conectar
console.log('🚀 Enviando primer handshake...');
client.handshake();
client.subscribeUpdate();
client.subscribeSpot();

const retryInterval = setInterval(() => {
    console.log('🔄 Reintentando handshake (asegúrate de que el juego esté en pista)...');
    client.handshake();
    client.subscribeUpdate();
    client.subscribeSpot();
}, 5000);

// Detener reintentos si conectamos
client.on('HANDSHAKER_RESPONSE', () => {
    clearInterval(retryInterval);
});

console.log('💡 Tip: Si el juego está en otro PC, cambia "127.0.0.1" por su IP local.');


