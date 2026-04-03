import { and, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { acServerControl } from '../db/schema.js';
import { getAcInstanceId } from '../config/acInstance.js';
import {
    activeServers,
    applyServerConfiguration,
    restartServerCore,
    startServerCore,
    stopServerCore,
    type ServerConfigPayload,
} from '../controller/controller.js';

const POLL_MS = Number(process.env.SERVER_CONTROL_POLL_MS) || 5000;

/** Intervalo entre reinicios por rotación (por defecto 24 h). */
const DAILY_RESTART_MS = Number(process.env.DAILY_RESTART_INTERVAL_MS) || 24 * 60 * 60 * 1000;

/** Clave: `${instanceId}:${serverName}` (aislado por VPS). */
const lastSnapshot = new Map<string, { configFp: string; power: 'running' | 'stopped' }>();

let pollInFlight = false;

function normalizePower(raw: string | null | undefined): 'running' | 'stopped' {
    const s = (raw ?? 'stopped').toLowerCase().trim();
    if (s === 'running' || s === 'start' || s === 'on') return 'running';
    return 'stopped';
}

function rowKey(row: typeof acServerControl.$inferSelect): string {
    return `${row.instanceId}:${row.serverName}`;
}

function configFingerprint(row: typeof acServerControl.$inferSelect): string {
    return JSON.stringify({
        d: row.displayName ?? null,
        p: row.password ?? null,
        t: row.track ?? null,
        c: row.configTrack ?? null,
        m: row.maxClients ?? null,
        e: row.entries ?? null,
    });
}

function hasConfigFields(row: typeof acServerControl.$inferSelect): boolean {
    return (
        row.displayName != null ||
        row.password != null ||
        row.track != null ||
        row.configTrack != null ||
        row.maxClients != null ||
        (row.entries != null && Array.isArray(row.entries) && row.entries.length > 0)
    );
}

async function setLastDailyRestartAt(row: typeof acServerControl.$inferSelect, at: Date): Promise<void> {
    await db
        .update(acServerControl)
        .set({ lastDailyRestartAt: at, updatedAt: new Date() })
        .where(and(eq(acServerControl.instanceId, row.instanceId), eq(acServerControl.serverName, row.serverName)));
}

/**
 * Si `daily_restart_enabled` está activo en Supabase y el servidor corre aquí,
 * reinicia como máximo una vez cada `DAILY_RESTART_MS`.
 * La primera vez que se activa el flag, solo guarda `last_daily_restart_at` (empieza la ventana de 24 h sin reinicio inmediato).
 */
async function maybeDailyRotationRestart(row: typeof acServerControl.$inferSelect): Promise<void> {
    if (!row.dailyRestartEnabled) return;
    if (normalizePower(row.powerState) !== 'running') return;

    const name = row.serverName;
    if (!activeServers[name]) return;

    const now = Date.now();
    const lastMs = row.lastDailyRestartAt ? new Date(row.lastDailyRestartAt).getTime() : null;

    if (lastMs === null) {
        await setLastDailyRestartAt(row, new Date());
        console.log(
            `[server-control] ${name} rotación diaria: intervalo iniciado (primer reinicio programado en ~${Math.round(DAILY_RESTART_MS / 3600000)} h)`,
        );
        return;
    }

    if (now - lastMs < DAILY_RESTART_MS) return;

    const rr = await restartServerCore(name);
    if (rr.ok) {
        await setLastDailyRestartAt(row, new Date());
        console.log(`[server-control] ${name} reinicio por rotación (${DAILY_RESTART_MS / 3600000} h):`, rr.message);
    } else {
        console.error(`[server-control] ${name} reinicio por rotación falló:`, rr.message);
    }
}

function rowToPayload(row: typeof acServerControl.$inferSelect): ServerConfigPayload {
    const payload: ServerConfigPayload = {};
    if (row.displayName != null) payload.displayName = row.displayName;
    if (row.password != null) payload.password = row.password;
    if (row.track != null) payload.track = row.track;
    if (row.configTrack !== null && row.configTrack !== undefined) payload.configTrack = row.configTrack;
    if (row.maxClients != null) payload.maxClients = row.maxClients;
    if (row.entries != null && row.entries.length > 0) payload.entries = row.entries;
    return payload;
}

async function processRow(row: typeof acServerControl.$inferSelect): Promise<void> {
    const name = row.serverName;
    const key = rowKey(row);
    const fp = configFingerprint(row);
    const power = normalizePower(row.powerState);
    const prev = lastSnapshot.get(key);

    const configChanged = prev === undefined || fp !== prev.configFp;
    const powerChanged = prev === undefined || power !== prev.power;

    if (configChanged && hasConfigFields(row)) {
        const result = applyServerConfiguration(name, rowToPayload(row));
        if (!result.ok) {
            console.error(`[server-control] ${name} config:`, result.reason);
        } else if (result.modifications.length > 0) {
            console.log(`[server-control] ${name} config:`, result.modifications.join(', '));
            if (activeServers[name]) {
                const rr = await restartServerCore(name);
                console.log(`[server-control] ${name} reinicio tras config:`, rr.message);
            }
        }
    }

    if (powerChanged) {
        if (power === 'running' && !activeServers[name]) {
            const st = startServerCore(name);
            console.log(`[server-control] ${name} start:`, st.message);
        } else if (power === 'stopped' && activeServers[name]) {
            const st = await stopServerCore(name);
            console.log(`[server-control] ${name} stop:`, st.message);
        }
    }

    await maybeDailyRotationRestart(row);

    lastSnapshot.set(key, { configFp: fp, power });
}

async function tick(): Promise<void> {
    const instanceId = getAcInstanceId();
    const rows = await db.select().from(acServerControl).where(eq(acServerControl.instanceId, instanceId));
    for (const row of rows) {
        await processRow(row);
    }
}

export function startServerControlPoller(): void {
    const instanceId = getAcInstanceId();
    console.log(
        `[server-control] instance_id="${instanceId}" (AC_INSTANCE_ID / VPS_ID) — polling cada ${POLL_MS} ms`,
    );

    void tick().catch((e) => console.error('[server-control] primer tick:', e));

    setInterval(() => {
        if (pollInFlight) return;
        pollInFlight = true;
        void tick()
            .catch((e) => console.error('[server-control] poll:', e))
            .finally(() => {
                pollInFlight = false;
            });
    }, POLL_MS);
}
