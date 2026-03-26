import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as tenantController from '../controllers/tenantController';
import * as groupController from '../controllers/groupController';
import { requireAdminAuth, requirePermission, requireTenantScope } from '../middleware/rbac';
import { csvUploadMiddleware } from '../middleware/upload';

const router = Router();
router.use(requireAdminAuth);

router.get('/', requirePermission('tenants:list'), tenantController.listTenants);
router.post('/', requirePermission('tenants:create'), tenantController.createTenant);
router.get('/:id', requirePermission('tenants:read'), requireTenantScope('id'), tenantController.getTenant);
router.post('/:id/resend-invite', requirePermission('tenants:patch'), requireTenantScope('id'), tenantController.resendTenantInvite);
router.patch('/:id', requirePermission('tenants:patch'), tenantController.patchTenant);
router.get('/:id/invoices', requirePermission('tenants:read'), requireTenantScope('id'), tenantController.listTenantInvoices);
router.post('/:id/invoices', requirePermission('tenants:patch'), requireTenantScope('id'), tenantController.createTenantInvoice);
router.get('/:id/users', requirePermission('tenants:users:*'), requireTenantScope('id'), tenantController.getTenantUsers);
router.get('/:id/groups', requirePermission('tenants:groups:*'), requireTenantScope('id'), groupController.listGroups);
router.post('/:id/groups', requirePermission('tenants:groups:*'), requireTenantScope('id'), groupController.createGroup);
router.get('/:id/groups/:groupId', requirePermission('tenants:groups:*'), requireTenantScope('id'), groupController.getGroup);
router.patch('/:id/groups/:groupId', requirePermission('tenants:groups:*'), requireTenantScope('id'), groupController.patchGroup);
router.delete('/:id/groups/:groupId', requirePermission('tenants:groups:*'), requireTenantScope('id'), groupController.deleteGroup);
router.get('/:id/groups/:groupId/users', requirePermission('tenants:users:*'), requireTenantScope('id'), groupController.getGroupUsers);
router.post('/:id/groups/:groupId/users', requirePermission('tenants:users:*'), requireTenantScope('id'), groupController.createGroupUser);
router.post('/:id/groups/:groupId/users/import', requirePermission('tenants:users:*'), requireTenantScope('id'), (req: Request, res: Response, next: NextFunction) => {
  csvUploadMiddleware(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' });
      }
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
    }
    next();
  });
}, groupController.importGroupUsers);
export default router;
