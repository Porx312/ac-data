import ACRemoteTelemetryClient from 'ac-remote-telemetry-client';

const client = new ACRemoteTelemetryClient('127.0.0.1');

let sessionInfo = {
    car: 'Unknown',
    track: 'Unknown',
    bestLap: Infinity
};

// Implement desired listeners
client.on('HANDSHAKER_RESPONSE', (data) => {
    sessionInfo.car = data.carName;
    sessionInfo.track = data.trackName;
    console.log(`🏎️  Session Started: ${sessionInfo.car} @ ${sessionInfo.track}`);
});

client.on('RT_CAR_INFO', (data) => {
    // bestLap is in milliseconds
    if (data.bestLap > 0 && data.bestLap < sessionInfo.bestLap) {
        sessionInfo.bestLap = data.bestLap;
        const seconds = (data.bestLap / 1000).toFixed(3);
        console.log(`⏱️  New Best Lap: ${seconds}s`);
    }
});

client.on('RT_LAP', (data) => {
    const seconds = (data.time / 1000).toFixed(3);
    console.log(`🏁 Lap Completed: ${seconds}s`);
});

// Start listening
client.start();

// Send initial handshake
client.handshake();

// Subscribe to desired updates
client.subscribeUpdate();
client.subscribeSpot();

// Stop listening (Commented out to keep the process running)
// client.stop();


