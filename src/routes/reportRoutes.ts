import { Router } from 'express';
import { tenantAuthMiddleware } from '../middleware/auth';
import { requireAdminAuth, requirePermission, requireTenantScope } from '../middleware/rbac';
import * as reportController from '../controllers/reportController';

const router = Router();

/** Platform report - super admin only (must be before /) */
router.get(
  '/platform',
  requireAdminAuth,
  requirePermission('overview:read'),
  reportController.getPlatformReport
);

/** Tenant report - admin with tenant scope */
router.get(
  '/tenants/:tenantId',
  requireAdminAuth,
  requirePermission('overview:read'),
  requireTenantScope('tenantId'),
  reportController.getTenantReport
);

/** User's own report - tenant auth */
router.get('/', tenantAuthMiddleware, reportController.getMyReport);

export default router;
