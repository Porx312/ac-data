/**
 * Envía JSON de prueba a los webhooks HTTP (servidor debe estar en marcha: npm run dev).
 * Uso: npm run test:http
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const base = process.env.TEST_API_BASE ?? 'http://127.0.0.1:3000';
const apiKey = process.env.API_KEY;
const suffix = Date.now().toString(36);

if (!apiKey) {
    console.error('❌ Falta API_KEY en .env');
    process.exit(1);
}

const post = async (path: string, body: object) => {
    const url = `${base}/ac-server${path}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(res.status, path, text.slice(0, 200));
};

await post('/webhook', {
    serverName: 'test-server-ac-data',
    webhookUrl: 'https://example.com/hook',
    eventId: `test-event-${suffix}`,
    eventType: 'test_ping',
    eventStatus: 'started',
    metadata: { source: 'http-test-webhooks', at: new Date().toISOString() },
});

await post('/battles/webhook', {
    battleId: `test-battle-${suffix}`,
    serverName: 'test-server-ac-data',
    player1SteamId: '76561198000000001',
    player2SteamId: '76561198000000002',
    webhookUrl: 'https://example.com/battle',
    webhookSecret: 'test-secret',
    status: 'active',
    metadata: { round: 1, source: 'http-test-webhooks' },
});

console.log('✅ Peticiones de prueba enviadas (revisa logs del servidor y la BD).');
