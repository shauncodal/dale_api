import { Router } from 'express';
import * as overviewController from '../controllers/overviewController';
import { requireAdminAuth, requirePermission, requireTenantScope } from '../middleware/rbac';

const router = Router();
router.use(requireAdminAuth);

router.get('/kpis', requirePermission('overview:read'), overviewController.getKpis);
router.get('/usage-trend', requirePermission('overview:read'), overviewController.getUsageTrend);
router.get('/most-used-coaches', requirePermission('overview:read'), overviewController.getMostUsedCoaches);
router.get('/score-distribution', requirePermission('overview:read'), overviewController.getScoreDistribution);
router.get('/plan-distribution', requirePermission('overview:read'), overviewController.getPlanDistribution);
router.get('/most-active-users', requirePermission('overview:read'), overviewController.getMostActiveUsers);

router.get('/tenant/:tenantId/monthly-minutes', requirePermission('overview:read'), overviewController.getTenantMonthlyMinutes);

router.get('/tenant/:tenantId/kpis', requirePermission('overview:read_own_tenant'), requireTenantScope('tenantId'), overviewController.getTenantKpis);
router.get('/tenant/:tenantId/usage-trend', requirePermission('overview:read_own_tenant'), requireTenantScope('tenantId'), overviewController.getTenantUsageTrend);
router.get('/tenant/:tenantId/most-used-coaches', requirePermission('overview:read_own_tenant'), requireTenantScope('tenantId'), overviewController.getTenantMostUsedCoaches);
router.get('/tenant/:tenantId/score-distribution', requirePermission('overview:read_own_tenant'), requireTenantScope('tenantId'), overviewController.getTenantScoreDistribution);
router.get('/tenant/:tenantId/most-active-users', requirePermission('overview:read_own_tenant'), requireTenantScope('tenantId'), overviewController.getTenantMostActiveUsers);

export default router;
