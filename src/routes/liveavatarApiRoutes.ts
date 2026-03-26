/**
 * Proxy for LiveAvatar SDK session start/stop/keep-alive.
 * Mounted at /liveavatar-api - SDK calls e.g. /liveavatar-api/v1/sessions/start
 */
import { Router } from 'express';
import * as liveavatarController from '../controllers/liveavatarController';

const router = Router();
router.post('/v1/sessions/start', liveavatarController.proxyPostSessionStart);
router.post('/v1/sessions/stop', liveavatarController.proxyPostSessionStop);
router.post('/v1/sessions/keep-alive', liveavatarController.proxyPostSessionKeepAlive);
export default router;
