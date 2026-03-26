import { Router } from 'express';
import * as liveavatarController from '../controllers/liveavatarController';
import { requireAdminAuth } from '../middleware/rbac';

const router = Router();
router.use(requireAdminAuth);
router.get('/avatars/public', liveavatarController.proxyGetAvatarsPublic);
router.get('/contexts', liveavatarController.proxyGetContexts);
router.post('/contexts', liveavatarController.proxyPostContexts);
router.get('/contexts/:contextId', liveavatarController.proxyGetContextById);
router.patch('/contexts/:contextId', liveavatarController.proxyPatchContext);
router.post('/sessions/token', liveavatarController.proxyPostSessionToken);
router.post('/sessions/start', liveavatarController.proxyPostSessionStart);
router.get('/preview-url', liveavatarController.getPreviewUrl);
export default router;
