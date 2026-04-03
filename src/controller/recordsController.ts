import { Request, Response } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { drivers, lapRecords } from '../db/schema.js';

// ─────────────────── HELPERS ───────────────────

function paramString(v: string | string[] | undefined): string | undefined {
    if (v === undefined) return undefined;
    return typeof v === 'string' ? v : v[0];
}

/** Convierte ms a formato M:SS.mmm */
function formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds) < 10 ? '0' : ''}${seconds}`;
}

// ─────────────────── CONTROLLERS ───────────────────

/**
 * GET /records/driver/:steamId
 * Todos los mejores tiempos de un usuario (por cada combo car+track)
 */
export const getDriverRecords = async (req: Request, res: Response) => {
    try {
        const steamId = paramString(req.params.steamId);
        if (!steamId) return res.status(400).json({ error: 'steamId es requerido' });

        const rows = await db
            .select({
                id: lapRecords.id,
                steamId: lapRecords.steamId,
                carModel: lapRecords.carModel,
                track: lapRecords.track,
                trackConfig: lapRecords.trackConfig,
                serverName: lapRecords.serverName,
                lapTime: lapRecords.lapTime,
                validLap: lapRecords.validLap,
                timestamp: lapRecords.timestamp,
                date: lapRecords.date,
                driverName: drivers.name,
            })
            .from(lapRecords)
            .leftJoin(drivers, eq(lapRecords.steamId, drivers.steamId))
            .where(and(eq(lapRecords.steamId, steamId), eq(lapRecords.validLap, 1)))
            .orderBy(asc(lapRecords.track), asc(lapRecords.carModel));

        const records = rows.map(r => ({
            id: r.id,
            steamId: r.steamId,
            driverName: r.driverName,
            carModel: r.carModel,
            track: r.track,
            trackConfig: r.trackConfig,
            serverName: r.serverName,
            lapTime: r.lapTime,
            lapTimeFormatted: formatTime(r.lapTime),
            valid: r.validLap === 1,
            timestamp: r.timestamp,
            date: r.date,
        }));

        res.json({ steamId, totalRecords: records.length, records });
    } catch (err) {
        console.error('Error getDriverRecords:', err);
        res.status(500).json({ error: 'Error al consultar records del piloto' });
    }
};

/**
 * GET /records/track/:trackName
 * Leaderboard de un track: mejor tiempo por piloto (cualquier coche)
 */
export const getTrackLeaderboard = async (req: Request, res: Response) => {
    try {
        const trackName = paramString(req.params.trackName);
        if (!trackName) return res.status(400).json({ error: 'trackName es requerido' });

        const rows = await db
            .select({
                steamId: lapRecords.steamId,
                carModel: lapRecords.carModel,
                track: lapRecords.track,
                trackConfig: lapRecords.trackConfig,
                serverName: lapRecords.serverName,
                lapTime: lapRecords.lapTime,
                date: lapRecords.date,
                driverName: drivers.name,
            })
            .from(lapRecords)
            .leftJoin(drivers, eq(lapRecords.steamId, drivers.steamId))
            .where(and(eq(lapRecords.track, trackName), eq(lapRecords.validLap, 1)))
            .orderBy(asc(lapRecords.lapTime));

        const leaderboard = rows.map((r, i) => ({
            position: i + 1,
            steamId: r.steamId,
            driverName: r.driverName,
            carModel: r.carModel,
            track: r.track,
            trackConfig: r.trackConfig,
            serverName: r.serverName,
            lapTime: r.lapTime,
            lapTimeFormatted: formatTime(r.lapTime),
            date: r.date,
        }));

        res.json({ track: trackName, totalDrivers: leaderboard.length, leaderboard });
    } catch (err) {
        console.error('Error getTrackLeaderboard:', err);
        res.status(500).json({ error: 'Error al consultar leaderboard del track' });
    }
};

/**
 * GET /records/track/:trackName/car/:carModel
 * Leaderboard de un track+coche específico
 */
export const getTrackCarLeaderboard = async (req: Request, res: Response) => {
    try {
        const trackName = paramString(req.params.trackName);
        const carModel = paramString(req.params.carModel);
        if (!trackName || !carModel) {
            return res.status(400).json({ error: 'trackName y carModel son requeridos' });
        }

        const rows = await db
            .select({
                steamId: lapRecords.steamId,
                carModel: lapRecords.carModel,
                trackConfig: lapRecords.trackConfig,
                lapTime: lapRecords.lapTime,
                date: lapRecords.date,
                driverName: drivers.name,
            })
            .from(lapRecords)
            .leftJoin(drivers, eq(lapRecords.steamId, drivers.steamId))
            .where(
                and(
                    eq(lapRecords.track, trackName),
                    eq(lapRecords.carModel, carModel),
                    eq(lapRecords.validLap, 1),
                ),
            )
            .orderBy(asc(lapRecords.lapTime));

        const leaderboard = rows.map((r, i) => ({
            position: i + 1,
            steamId: r.steamId,
            driverName: r.driverName,
            carModel: r.carModel,
            trackConfig: r.trackConfig,
            lapTime: r.lapTime,
            lapTimeFormatted: formatTime(r.lapTime),
            date: r.date,
        }));

        res.json({ track: trackName, carModel, totalDrivers: leaderboard.length, leaderboard });
    } catch (err) {
        console.error('Error getTrackCarLeaderboard:', err);
        res.status(500).json({ error: 'Error al consultar leaderboard' });
    }
};

/**
 * GET /records/driver/:steamId/track/:trackName
 * Todos los tiempos de un piloto en un track específico (cada coche)
 */
export const getDriverTrackRecords = async (req: Request, res: Response) => {
    try {
        const steamId = paramString(req.params.steamId);
        const trackName = paramString(req.params.trackName);
        if (!steamId || !trackName) {
            return res.status(400).json({ error: 'steamId y trackName son requeridos' });
        }

        const rows = await db
            .select({
                steamId: lapRecords.steamId,
                carModel: lapRecords.carModel,
                track: lapRecords.track,
                trackConfig: lapRecords.trackConfig,
                lapTime: lapRecords.lapTime,
                date: lapRecords.date,
                driverName: drivers.name,
            })
            .from(lapRecords)
            .leftJoin(drivers, eq(lapRecords.steamId, drivers.steamId))
            .where(
                and(
                    eq(lapRecords.steamId, steamId),
                    eq(lapRecords.track, trackName),
                    eq(lapRecords.validLap, 1),
                ),
            )
            .orderBy(asc(lapRecords.lapTime));

        const records = rows.map(r => ({
            steamId: r.steamId,
            driverName: r.driverName,
            carModel: r.carModel,
            track: r.track,
            trackConfig: r.trackConfig,
            lapTime: r.lapTime,
            lapTimeFormatted: formatTime(r.lapTime),
            date: r.date,
        }));

        res.json({ steamId, track: trackName, totalRecords: records.length, records });
    } catch (err) {
        console.error('Error getDriverTrackRecords:', err);
        res.status(500).json({ error: 'Error al consultar records' });
    }
};

/**
 * GET /records/tracks
 * Lista todos los tracks disponibles con cantidad de records
 */
export const getAvailableTracks = async (_req: Request, res: Response) => {
    try {
        const result = await db.execute(sql`
            SELECT track, MAX(track_config) as track_config, COUNT(*)::int as total_records, MIN(lap_time) as best_time
            FROM lap_records
            WHERE valid_lap = 1
            GROUP BY track
            ORDER BY track
        `);
        const rows = result.rows as {
            track: string;
            track_config: string | null;
            total_records: number;
            best_time: number;
        }[];

        const tracks = rows.map(r => ({
            track: r.track,
            trackConfig: r.track_config,
            totalRecords: r.total_records,
            bestTime: r.best_time,
            bestTimeFormatted: formatTime(r.best_time),
        }));

        res.json({ totalTracks: tracks.length, tracks });
    } catch (err) {
        console.error('Error getAvailableTracks:', err);
        res.status(500).json({ error: 'Error al consultar tracks' });
    }
};

/**
 * GET /records/drivers
 * Lista todos los pilotos registrados
 */
export const getDrivers = async (_req: Request, res: Response) => {
    try {
        const result = await db.execute(sql`
            SELECT d.*, COUNT(lr.id)::int as total_laps,
              MIN(lr.lap_time) as best_time
            FROM drivers d
            LEFT JOIN lap_records lr ON d.steam_id = lr.steam_id AND lr.valid_lap = 1
            GROUP BY d.steam_id
            ORDER BY d.name
        `);
        const rows = result.rows as {
            steam_id: string;
            name: string | null;
            created_at: string | null;
            updated_at: string | null;
            total_laps: number;
            best_time: number | null;
        }[];

        const driversOut = rows.map(r => ({
            steamId: r.steam_id,
            name: r.name,
            totalLaps: r.total_laps,
            bestTime: r.best_time,
            bestTimeFormatted: r.best_time != null ? formatTime(r.best_time) : null,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));

        res.json({ totalDrivers: driversOut.length, drivers: driversOut });
    } catch (err) {
        console.error('Error getDrivers:', err);
        res.status(500).json({ error: 'Error al consultar pilotos' });
    }
};

/**
 * GET /records/battles/live
 * Fetches currently active Touge Battles including live points and event log.
 */
export const getLiveBattles = async (_req: Request, res: Response) => {
    try {
        const result = await db.execute(sql`
            SELECT tb.*,
                    d1.name as player1_name,
                    d2.name as player2_name
             FROM touge_battles tb
             LEFT JOIN drivers d1 ON tb.player1_steam_id = d1.steam_id
             LEFT JOIN drivers d2 ON tb.player2_steam_id = d2.steam_id
             WHERE tb.status = 'active'
             ORDER BY tb.started_at DESC
        `);
        const rows = result.rows as Record<string, unknown>[];

        const battles = rows.map(r => ({
            ...r,
            trackConfig: r.track_config,
            player1Car: r.player1_car,
            player2Car: r.player2_car,
        }));

        res.json({ activeBattles: battles.length, battles });
    } catch (err) {
        console.error('Error getLiveBattles:', err);
        res.status(500).json({ error: 'Error fetching live battles' });
    }
};

/**
 * GET /records/battles/history
 * Fetches completed Touge Battles including winners and event log.
 */
export const getBattleHistory = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await db.execute(sql`
            SELECT tb.*,
                    d1.name as player1_name,
                    d2.name as player2_name,
                    w.name as winner_name
             FROM touge_battles tb
             LEFT JOIN drivers d1 ON tb.player1_steam_id = d1.steam_id
             LEFT JOIN drivers d2 ON tb.player2_steam_id = d2.steam_id
             LEFT JOIN drivers w ON tb.winner_steam_id = w.steam_id
             WHERE tb.status = 'finished'
             ORDER BY tb.updated_at DESC
             LIMIT ${limit}
        `);
        const rows = result.rows as Record<string, unknown>[];

        const battles = rows.map(r => ({
            ...r,
            trackConfig: r.track_config,
            player1Car: r.player1_car,
            player2Car: r.player2_car,
        }));

        res.json({ totalBattles: battles.length, battles });
    } catch (err) {
        console.error('Error getBattleHistory:', err);
        res.status(500).json({ error: 'Error fetching battle history' });
    }
};
