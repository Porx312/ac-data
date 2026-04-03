import { Router } from 'express';
import { getDriverRecords, getTrackLeaderboard, getTrackCarLeaderboard, getDriverTrackRecords, getAvailableTracks, getDrivers, getLiveBattles, getBattleHistory, } from '../controller/recordsController.js';
import { saveWebhookEvent, saveBattleWebhook, receiveServerEvent } from '../controller/webhookController.js';
const router = Router();
// Control del servidor AC: tabla ac_server_control (ver serverControlPoller), no rutas HTTP.
// ─── Records / Leaderboards ───
router.get('/records/drivers', getDrivers);
router.get('/records/tracks', getAvailableTracks);
router.get('/records/driver/:steamId', getDriverRecords);
router.get('/records/driver/:steamId/track/:trackName', getDriverTrackRecords);
router.get('/records/track/:trackName', getTrackLeaderboard);
router.get('/records/track/:trackName/car/:carModel', getTrackCarLeaderboard);
// ─── Touge Battles ───
router.get('/records/battles/live', getLiveBattles);
router.get('/records/battles/history', getBattleHistory);
// ─── Webhooks / Server Events ───
router.post('/webhook', saveWebhookEvent);
router.post('/battles/webhook', saveBattleWebhook);
router.post('/server-event', receiveServerEvent);
export default router;
//# sourceMappingURL=acServerRoutes.js.map