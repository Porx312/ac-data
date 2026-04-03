/**
 * Inserta filas de prueba en server_events, server_battles, drivers y lap_records.
 * Uso: npm run seed:test
 *
 * Requiere DATABASE_URL válido en .env (raíz del proyecto ac-data).
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envResult = dotenv.config({ path: path.join(projectRoot, '.env') });
if (envResult.error) {
    console.warn('Aviso al cargar .env:', envResult.error.message);
}
if (!process.env.DATABASE_URL?.trim()) {
    console.error('❌ DATABASE_URL no está definido en .env (ruta:', path.join(projectRoot, '.env'), ')');
    process.exit(1);
}

const { db, pool } = await import('../src/db.js');
const { drivers, lapRecords, serverBattles, serverEvents } = await import('../src/db/schema.js');

const run = async () => {
    const suffix = Date.now().toString(36);

    await db.insert(serverEvents).values({
        eventId: `test-event-${suffix}`,
        serverName: 'test-server-ac-data',
        webhookUrl: 'https://example.com/hook',
        eventType: 'test_ping',
        eventStatus: 'started',
        metadata: { source: 'seed-test-data', at: new Date().toISOString() },
        updatedAt: new Date(),
    });

    await db.insert(serverBattles).values({
        battleId: `test-battle-${suffix}`,
        serverName: 'test-server-ac-data',
        webhookUrl: 'https://example.com/battle',
        webhookSecret: 'test-secret',
        player1SteamId: '76561198000000001',
        player2SteamId: '76561198000000002',
        status: 'active',
        metadata: { round: 1, source: 'seed-test-data' },
        updatedAt: new Date(),
    });

    await db
        .insert(drivers)
        .values({
            steamId: '76561198000000001',
            name: 'Piloto Prueba',
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .onConflictDoNothing();

    const lapId = Math.floor(Math.random() * 2_000_000_000) + 1;

    await db.insert(lapRecords).values({
        id: lapId,
        steamId: '76561198000000001',
        carModel: 'ks_toyota_ae86',
        track: 'akina',
        trackConfig: '',
        serverName: 'test-server-ac-data',
        lapTime: 125_430,
        validLap: 1,
        timestamp: Date.now(),
        date: new Date().toISOString().slice(0, 10),
    });

    console.log('✅ Datos de prueba insertados:', {
        eventId: `test-event-${suffix}`,
        battleId: `test-battle-${suffix}`,
        lapId,
    });
};

run()
    .catch((e) => {
        console.error('❌ Error insertando datos de prueba:', e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
