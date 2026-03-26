import { Router } from 'express';
import * as liteController from '../controllers/liteController';
import { tenantAuthMiddleware } from '../middleware/auth';

const router = Router();
router.use(tenantAuthMiddleware);
router.get('/me', liteController.getMe);
router.get('/avatars', liteController.getAvatars);
router.get('/sessions', liteController.getSessions);
router.post('/sessions', liteController.createSession);
export default router;
