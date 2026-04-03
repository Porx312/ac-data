import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from './db/schema.js';

dotenv.config();

const connectionString =
    process.env.DATABASE_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASS || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'postgres'}`;

const useSsl =
    connectionString.includes('supabase.com') ||
    connectionString.includes('supabase.co');

const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
});

export const db = drizzle(pool, { schema });
export { pool };

export const initDB = async () => {
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS server_events (
                id BIGSERIAL PRIMARY KEY,
                event_id TEXT UNIQUE,
                server_name TEXT NOT NULL,
                webhook_url TEXT,
                webhook_secret TEXT,
                event_type TEXT,
                event_status TEXT DEFAULT 'started',
                metadata JSONB,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS server_battles (
                id BIGSERIAL PRIMARY KEY,
                battle_id TEXT UNIQUE NOT NULL,
                server_name TEXT NOT NULL,
                webhook_url TEXT,
                webhook_secret TEXT,
                player1_steam_id TEXT NOT NULL,
                player2_steam_id TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                metadata JSONB,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS ac_server_control (
                instance_id TEXT NOT NULL DEFAULT 'default',
                server_name TEXT NOT NULL,
                power_state TEXT NOT NULL DEFAULT 'stopped',
                display_name TEXT,
                password TEXT,
                track TEXT,
                config_track TEXT,
                max_clients INTEGER,
                entries JSONB,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (instance_id, server_name)
            )
        `);

        const acControlMigrations = [
            'ALTER TABLE ac_server_control ADD COLUMN IF NOT EXISTS instance_id TEXT DEFAULT \'default\'',
            "UPDATE ac_server_control SET instance_id = 'default' WHERE instance_id IS NULL",
            'ALTER TABLE ac_server_control ALTER COLUMN instance_id SET NOT NULL',
            'ALTER TABLE ac_server_control DROP CONSTRAINT IF EXISTS ac_server_control_pkey',
            'ALTER TABLE ac_server_control ADD PRIMARY KEY (instance_id, server_name)',
        ];
        for (const m of acControlMigrations) {
            try {
                await db.execute(sql.raw(m));
            } catch {
                // ya migrado o restricción distinta
            }
        }

        const migrations = [
            'ALTER TABLE server_events ADD COLUMN IF NOT EXISTS event_id TEXT',
            "ALTER TABLE server_events ADD COLUMN IF NOT EXISTS event_status TEXT DEFAULT 'started'",
            'ALTER TABLE server_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP',
        ];
        for (const m of migrations) {
            try {
                await db.execute(sql.raw(m));
            } catch {
                // columna ya existe u otro error benigno
            }
        }

        console.log('✅ Base de datos verificada/inicializada (server_events).');
    } catch (err) {
        console.error('❌ Error inicializando la BD:', err);
    }
};
