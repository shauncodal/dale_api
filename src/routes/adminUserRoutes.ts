import { Router } from 'express';
import * as adminUserController from '../controllers/adminUserController';
import { requireAdminAuth, requirePermission } from '../middleware/rbac';

const router = Router();
router.use(requireAdminAuth);

router.get('/roles', requirePermission('admin_users:list'), adminUserController.listRoles);
router.get('/', requirePermission('admin_users:list'), adminUserController.listAdminUsers);
router.post('/', requirePermission('admin_users:create'), adminUserController.createAdminUser);
router.patch('/:id', requirePermission('admin_users:patch'), adminUserController.patchAdminUser);
router.post('/:id/resend-invite', requirePermission('admin_users:patch'), adminUserController.resendInvite);

export default router;
