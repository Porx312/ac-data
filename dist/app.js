import { ACRemoteTelemetryClient } from 'ac-remote-telemetry-client';
// const ACRemoteTelemetryClient = require('ac-remote-telemetry-client');
const client = new ACRemoteTelemetryClient();
// Implement desired listeners
client.on('HANDSHAKER_RESPONSE', (data) => console.log(data));
client.on('RT_CAR_INFO', (data) => console.log(data));
client.on('RT_LAP', (data) => console.log(data));
// Start listening
client.start();
// Send initial handshake
client.handshake();
// Subscribe to desired updates
client.subscribeUpdate();
client.subscribeSpot();
// Stop listening
client.stop();
//# sourceMappingURL=app.js.map