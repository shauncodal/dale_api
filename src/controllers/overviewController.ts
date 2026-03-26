import { Request, Response } from 'express';
import * as overviewService from '../services/overviewService';
import { overviewUsageTrendQuerySchema, overviewMostActiveUsersQuerySchema } from '../lib/schemas';

export async function getKpis(_req: Request, res: Response): Promise<void> {
  const data = await overviewService.getKpis();
  res.json(data);
}

export async function getUsageTrend(req: Request, res: Response): Promise<void> {
  const parsed = overviewUsageTrendQuerySchema.safeParse(req.query);
  const months = parsed.success ? parsed.data.months : 6;
  const data = await overviewService.getUsageTrend(months);
  res.json(data);
}

export async function getMostUsedCoaches(_req: Request, res: Response): Promise<void> {
  const data = await overviewService.getMostUsedCoaches();
  res.json(data);
}

export async function getScoreDistribution(_req: Request, res: Response): Promise<void> {
  const data = await overviewService.getScoreDistribution();
  res.json(data);
}

export async function getPlanDistribution(_req: Request, res: Response): Promise<void> {
  const data = await overviewService.getPlanDistribution();
  res.json(data);
}

export async function getMostActiveUsers(req: Request, res: Response): Promise<void> {
  const parsed = overviewMostActiveUsersQuerySchema.safeParse(req.query);
  const limit = parsed.success ? parsed.data.limit : 5;
  const data = await overviewService.getMostActiveUsers(limit);
  res.json(data);
}

export async function getTenantMonthlyMinutes(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'tenantId required' });
    return;
  }
  const parsed = overviewUsageTrendQuerySchema.safeParse(req.query);
  const months = parsed.success ? parsed.data.months : 6;
  const data = await overviewService.getTenantMonthlyMinutesBreakdown(tenantId, months);
  if (!data) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  res.json(data);
}

export async function getTenantKpis(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'tenantId required' });
    return;
  }
  const data = await overviewService.getTenantKpis(tenantId);
  if (!data) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  res.json(data);
}

export async function getTenantUsageTrend(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'tenantId required' });
    return;
  }
  const parsed = overviewUsageTrendQuerySchema.safeParse(req.query);
  const months = parsed.success ? parsed.data.months : 6;
  const data = await overviewService.getTenantUsageTrend(tenantId, months);
  res.json(data);
}

export async function getTenantMostUsedCoaches(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'tenantId required' });
    return;
  }
  const data = await overviewService.getTenantMostUsedCoaches(tenantId);
  res.json(data);
}

export async function getTenantScoreDistribution(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'tenantId required' });
    return;
  }
  const data = await overviewService.getTenantScoreDistribution(tenantId);
  res.json(data);
}

export async function getTenantMostActiveUsers(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'tenantId required' });
    return;
  }
  const parsed = overviewMostActiveUsersQuerySchema.safeParse(req.query);
  const limit = parsed.success ? parsed.data.limit : 5;
  const data = await overviewService.getTenantMostActiveUsers(tenantId, limit);
  res.json(data);
}
