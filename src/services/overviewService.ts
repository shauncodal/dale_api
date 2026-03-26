import * as overviewRepo from '../repositories/overviewRepository';

export async function getKpis() {
  return overviewRepo.getKpis();
}

export async function getUsageTrend(months: number) {
  return overviewRepo.getUsageTrend(months);
}

export async function getMostUsedCoaches() {
  return overviewRepo.getMostUsedCoaches();
}

export async function getScoreDistribution() {
  return overviewRepo.getScoreDistribution();
}

export async function getPlanDistribution() {
  return overviewRepo.getPlanDistribution();
}

export async function getMostActiveUsers(limit: number) {
  return overviewRepo.getMostActiveUsers(limit);
}

export async function getTenantKpis(tenantId: string) {
  return overviewRepo.getTenantKpis(tenantId);
}

export async function getTenantUsageTrend(tenantId: string, months: number) {
  return overviewRepo.getTenantUsageTrend(tenantId, months);
}

export async function getTenantMostUsedCoaches(tenantId: string) {
  return overviewRepo.getTenantMostUsedCoaches(tenantId);
}

export async function getTenantScoreDistribution(tenantId: string) {
  return overviewRepo.getTenantScoreDistribution(tenantId);
}

export async function getTenantMostActiveUsers(tenantId: string, limit: number) {
  return overviewRepo.getTenantMostActiveUsers(tenantId, limit);
}

export async function getTenantMonthlyMinutesBreakdown(tenantId: string, months: number) {
  return overviewRepo.getTenantMonthlyMinutesBreakdown(tenantId, months);
}
