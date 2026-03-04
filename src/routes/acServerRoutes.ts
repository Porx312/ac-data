import { Router } from 'express';
import {
  startServer,
  stopServer,
  restartServer,
  serverStatus,
  setPassword,
  setTrack,
} from '../controller/controller.js';
import {
  getDriverRecords,
  getTrackLeaderboard,
  getTrackCarLeaderboard,
  getDriverTrackRecords,
  getAvailableTracks,
  getDrivers,
  getLiveBattles,
  getBattleHistory,
} from '../controller/recordsController.js';

import { saveWebhookEvent } from '../controller/webhookController.js';

const router = Router();

// ─── Control AC Server ───
router.post('/start', startServer);
router.post('/stop', stopServer);
router.post('/restart', restartServer);
router.post('/status', serverStatus);

// ─── Configuración del servidor ───
router.post('/password', setPassword);
router.post('/track', setTrack);

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

export default router;
