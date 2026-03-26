import { Router } from 'express';
import * as tenantController from '../controllers/tenantController';
import { requireAdminAuth, requirePermission } from '../middleware/rbac';

const router = Router();
router.use(requireAdminAuth);
router.use(requirePermission('tenants:users:*'));
router.post('/:id/resend-invite', tenantController.resendInvite);
router.get('/:id', tenantController.getUser);
router.patch('/:id', tenantController.patchUser);
router.get('/:id/sessions', tenantController.getUserSessions);
export default router;
