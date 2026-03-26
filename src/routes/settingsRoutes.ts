import { Router } from 'express';
import * as settingsController from '../controllers/settingsController';
import { requireAdminAuth, requirePermission } from '../middleware/rbac';

const router = Router();
router.use(requireAdminAuth);
router.get('/cost-management', requirePermission('settings:read'), settingsController.getCostManagement);
router.patch('/cost-management', requirePermission('settings:patch'), settingsController.patchCostManagement);
export default router;
