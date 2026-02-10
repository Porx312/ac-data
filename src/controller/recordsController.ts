import { Request, Response } from 'express';
import pool from '../db.js';
import type { RowDataPacket } from 'mysql2';

// ─────────────────── TIPOS ───────────────────
interface LapRecord extends RowDataPacket {
    id: number;
    steam_id: string;
    car_model: string;
    track: string;
    server_name: string;
    lap_time: number;
    valid_lap: number;
    timestamp: number;
    date: string;
}

interface DriverRow extends RowDataPacket {
    steam_id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

// ─────────────────── HELPERS ───────────────────

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
        const { steamId } = req.params;
        if (!steamId) return res.status(400).json({ error: 'steamId es requerido' });

        const [rows] = await pool.query<LapRecord[]>(
            `SELECT lr.*, d.name as driver_name
       FROM lap_records lr
       LEFT JOIN drivers d ON lr.steam_id = d.steam_id
       WHERE lr.steam_id = ? AND lr.valid_lap = 1
       ORDER BY lr.track, lr.car_model`,
            [steamId]
        );

        const records = rows.map(r => ({
            id: r.id,
            steamId: r.steam_id,
            driverName: r.driver_name,
            carModel: r.car_model,
            track: r.track,
            serverName: r.server_name,
            lapTime: r.lap_time,
            lapTimeFormatted: formatTime(r.lap_time),
            valid: r.valid_lap === 1,
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
        const { trackName } = req.params;
        if (!trackName) return res.status(400).json({ error: 'trackName es requerido' });

        const [rows] = await pool.query<LapRecord[]>(
            `SELECT lr.*, d.name as driver_name
       FROM lap_records lr
       LEFT JOIN drivers d ON lr.steam_id = d.steam_id
       WHERE lr.track = ? AND lr.valid_lap = 1
       ORDER BY lr.lap_time ASC`,
            [trackName]
        );

        const leaderboard = rows.map((r, i) => ({
            position: i + 1,
            steamId: r.steam_id,
            driverName: r.driver_name,
            carModel: r.car_model,
            track: r.track,
            serverName: r.server_name,
            lapTime: r.lap_time,
            lapTimeFormatted: formatTime(r.lap_time),
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
        const { trackName, carModel } = req.params;
        if (!trackName || !carModel) {
            return res.status(400).json({ error: 'trackName y carModel son requeridos' });
        }

        const [rows] = await pool.query<LapRecord[]>(
            `SELECT lr.*, d.name as driver_name
       FROM lap_records lr
       LEFT JOIN drivers d ON lr.steam_id = d.steam_id
       WHERE lr.track = ? AND lr.car_model = ? AND lr.valid_lap = 1
       ORDER BY lr.lap_time ASC`,
            [trackName, carModel]
        );

        const leaderboard = rows.map((r, i) => ({
            position: i + 1,
            steamId: r.steam_id,
            driverName: r.driver_name,
            carModel: r.car_model,
            lapTime: r.lap_time,
            lapTimeFormatted: formatTime(r.lap_time),
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
        const { steamId, trackName } = req.params;
        if (!steamId || !trackName) {
            return res.status(400).json({ error: 'steamId y trackName son requeridos' });
        }

        const [rows] = await pool.query<LapRecord[]>(
            `SELECT lr.*, d.name as driver_name
       FROM lap_records lr
       LEFT JOIN drivers d ON lr.steam_id = d.steam_id
       WHERE lr.steam_id = ? AND lr.track = ? AND lr.valid_lap = 1
       ORDER BY lr.lap_time ASC`,
            [steamId, trackName]
        );

        const records = rows.map(r => ({
            steamId: r.steam_id,
            driverName: r.driver_name,
            carModel: r.car_model,
            track: r.track,
            lapTime: r.lap_time,
            lapTimeFormatted: formatTime(r.lap_time),
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
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT track, COUNT(*) as total_records, MIN(lap_time) as best_time
       FROM lap_records
       WHERE valid_lap = 1
       GROUP BY track
       ORDER BY track`
        );

        const tracks = rows.map(r => ({
            track: r.track,
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
        const [rows] = await pool.query<DriverRow[]>(
            `SELECT d.*, COUNT(lr.id) as total_laps,
              MIN(lr.lap_time) as best_time
       FROM drivers d
       LEFT JOIN lap_records lr ON d.steam_id = lr.steam_id AND lr.valid_lap = 1
       GROUP BY d.steam_id
       ORDER BY d.name`
        );

        const drivers = rows.map(r => ({
            steamId: r.steam_id,
            name: r.name,
            totalLaps: r.total_laps,
            bestTime: r.best_time,
            bestTimeFormatted: r.best_time ? formatTime(r.best_time) : null,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));

        res.json({ totalDrivers: drivers.length, drivers });
    } catch (err) {
        console.error('Error getDrivers:', err);
        res.status(500).json({ error: 'Error al consultar pilotos' });
    }
};
