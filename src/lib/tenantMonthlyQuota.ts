import { prisma } from './prisma';

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isCustomMonthlyPool(plan: string, minutesPurchased: number): boolean {
  return plan === 'Custom' && minutesPurchased > 0;
}

/** Sum of per-user monthly caps for active users (matches lite getMe per-user logic in aggregate). */
export function sumActiveUserMonthlyQuotas(
  users: ReadonlyArray<{ status: string; minutesQuotaTotal: number | null }>,
  minutesQuotaPerUserPerMonth: number
): number {
  return users
    .filter((u) => u.status === 'active')
    .reduce((sum, u) => sum + (u.minutesQuotaTotal ?? minutesQuotaPerUserPerMonth), 0);
}

export function tenantMonthlyAllocationMinutes(params: {
  plan: string;
  /** Custom-plan monthly pool cap (sum of per-invoice users×minutesPerMonthPerUser), not cumulative contract minutesTotal. */
  minutesPurchased: number;
  minutesQuotaPerUserPerMonth: number;
  users: ReadonlyArray<{ status: string; minutesQuotaTotal: number | null }>;
}): number {
  if (isCustomMonthlyPool(params.plan, params.minutesPurchased)) {
    return params.minutesPurchased;
  }
  return sumActiveUserMonthlyQuotas(params.users, params.minutesQuotaPerUserPerMonth);
}

export async function getTenantUsedMinutesInMonth(tenantId: string, refDate = new Date()): Promise<number> {
  const agg = await prisma.session.aggregate({
    where: {
      deletedAt: null,
      user: { tenantId },
      createdAt: { gte: startOfMonth(refDate), lte: endOfMonth(refDate) },
    },
    _sum: { durationMinutes: true },
  });
  return agg._sum.durationMinutes ?? 0;
}

export function unusedMinutesForMonth(allocation: number, usedThisMonth: number): number {
  return Math.max(0, allocation - usedThisMonth);
}
