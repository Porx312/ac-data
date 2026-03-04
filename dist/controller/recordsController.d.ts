import { Request, Response } from 'express';
/**
 * GET /records/driver/:steamId
 * Todos los mejores tiempos de un usuario (por cada combo car+track)
 */
export declare const getDriverRecords: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /records/track/:trackName
 * Leaderboard de un track: mejor tiempo por piloto (cualquier coche)
 */
export declare const getTrackLeaderboard: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /records/track/:trackName/car/:carModel
 * Leaderboard de un track+coche específico
 */
export declare const getTrackCarLeaderboard: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /records/driver/:steamId/track/:trackName
 * Todos los tiempos de un piloto en un track específico (cada coche)
 */
export declare const getDriverTrackRecords: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /records/tracks
 * Lista todos los tracks disponibles con cantidad de records
 */
export declare const getAvailableTracks: (_req: Request, res: Response) => Promise<void>;
/**
 * GET /records/drivers
 * Lista todos los pilotos registrados
 */
export declare const getDrivers: (_req: Request, res: Response) => Promise<void>;
/**
 * GET /records/battles/live
 * Fetches currently active Touge Battles including live points and event log.
 */
export declare const getLiveBattles: (_req: Request, res: Response) => Promise<void>;
/**
 * GET /records/battles/history
 * Fetches completed Touge Battles including winners and event log.
 */
export declare const getBattleHistory: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=recordsController.d.ts.map