import {
    bigserial,
    bigint,
    boolean,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
    timestamp,
} from 'drizzle-orm/pg-core';

export const serverEvents = pgTable('server_events', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    eventId: text('event_id').unique(),
    serverName: text('server_name').notNull(),
    webhookUrl: text('webhook_url'),
    webhookSecret: text('webhook_secret'),
    eventType: text('event_type'),
    eventStatus: text('event_status').default('started'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const serverBattles = pgTable('server_battles', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    battleId: text('battle_id').unique().notNull(),
    serverName: text('server_name').notNull(),
    webhookUrl: text('webhook_url'),
    webhookSecret: text('webhook_secret'),
    player1SteamId: text('player1_steam_id').notNull(),
    player2SteamId: text('player2_steam_id').notNull(),
    status: text('status').default('active'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const lapRecords = pgTable('lap_records', {
    id: integer('id').primaryKey(),
    steamId: text('steam_id').notNull(),
    carModel: text('car_model').notNull(),
    track: text('track').notNull(),
    trackConfig: text('track_config'),
    serverName: text('server_name'),
    lapTime: integer('lap_time').notNull(),
    validLap: integer('valid_lap').notNull(),
    timestamp: bigint('timestamp', { mode: 'number' }),
    date: text('date'),
});

export const drivers = pgTable('drivers', {
    steamId: text('steam_id').primaryKey(),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
});

/**
 * Estado deseado del servidor AC leído por el poller (sin API).
 * `instance_id` debe coincidir con AC_INSTANCE_ID (o VPS_ID) en cada VPS para no pisarse entre máquinas.
 */
export const acServerControl = pgTable(
    'ac_server_control',
    {
        /** Identificador del nodo/VPS (ej. eu-1, vps-assetto-01). */
        instanceId: text('instance_id').notNull().default('default'),
        serverName: text('server_name').notNull(),
        /** running | stopped */
        powerState: text('power_state').notNull().default('stopped'),
        displayName: text('display_name'),
        password: text('password'),
        track: text('track'),
        configTrack: text('config_track'),
        maxClients: integer('max_clients'),
        entries: jsonb('entries').$type<Array<{ model: string; skin?: string; count?: number }>>(),
        /** Si es true, el poller reinicia el proceso del servidor cada ~24 h (ver `lastDailyRestartAt`). */
        dailyRestartEnabled: boolean('daily_restart_enabled').notNull().default(false),
        /** Último reinicio por rotación (o marca de inicio del intervalo si aún no hubo reinicio). */
        lastDailyRestartAt: timestamp('last_daily_restart_at', { withTimezone: true }),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    },
    (t) => [primaryKey({ columns: [t.instanceId, t.serverName] })],
);
