import { Router } from 'express';
import * as financeController from '../controllers/financeController';
import { requireAdminAuth, requirePermission } from '../middleware/rbac';

const router = Router();
router.use(requireAdminAuth);
router.get('/summary', requirePermission('overview:read'), financeController.getFinanceSummary);
export default router;
