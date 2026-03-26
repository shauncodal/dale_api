import { Router } from 'express';
import * as authController from '../controllers/authController';
import { tenantAuthMiddleware } from '../middleware/auth';
import { requireAdminAuth } from '../middleware/rbac';

const router = Router();
router.post('/login', authController.login);
router.post('/tenant-login', authController.tenantLogin);
router.post('/lite-login', authController.liteLogin);
router.post('/change-password', tenantAuthMiddleware, authController.changePassword);
router.post('/change-password-admin', requireAdminAuth, authController.changePasswordAdmin);
export default router;
