import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { endOfMonth, startOfMonth, tenantMonthlyAllocationMinutes, unusedMinutesForMonth } from '../lib/tenantMonthlyQuota';
import * as platformSettingsRepo from './platformSettingsRepository';

function decimalToNumber(v: Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'object' && 'toNumber' in v ? (v as { toNumber(): number }).toNumber() : Number(v);
}

export async function getFinanceSummary() {
  const [invoicesAgg, invoicesMinutesAgg, sessionsAgg, platformSettings, tenantsWithUsage] = await Promise.all([
    prisma.tenantInvoice.aggregate({
      _sum: { amountDollars: true },
    }),
    prisma.tenantInvoice.aggregate({
      _sum: { minutesTotal: true },
    }),
    prisma.session.aggregate({
      _sum: { durationMinutes: true },
      where: { deletedAt: null },
    }),
    platformSettingsRepo.getSettings(),
    prisma.tenant.findMany({
      include: {
        users: { include: { sessions: { where: { deletedAt: null } } } },
        invoices: true,
      },
    }),
  ]);

  const totalInvoiced = decimalToNumber(invoicesAgg._sum.amountDollars);
  const minutesCoached = sessionsAgg._sum.durationMinutes ?? 0;
  const invoicedMinutesTotal = invoicesMinutesAgg._sum.minutesTotal ?? 0;
  const avatarCost = (invoicedMinutesTotal / 30) * platformSettings.costPer30MinAvatarDollars;
  const totalCost = avatarCost + platformSettings.infrastructureCostDollars;
  const totalProfit = totalInvoiced - totalCost;

  const ref = new Date();
  const mStart = startOfMonth(ref);
  const mEnd = endOfMonth(ref);
  const tenantBreakdown = tenantsWithUsage.map((t) => {
    const usedMinutes = t.users.reduce(
      (sum, u) =>
        sum +
        u.sessions.reduce((m, sess) => {
          if (sess.createdAt >= mStart && sess.createdAt <= mEnd) return m + sess.durationMinutes;
          return m;
        }, 0),
      0
    );
    const invoicedTotal = t.invoices.reduce(
      (sum, inv) => sum + decimalToNumber(inv.amountDollars),
      0
    );
    const minutesPurchased = t.minutesPurchased;
    const monthlyAllocationMinutes = tenantMonthlyAllocationMinutes({
      plan: t.plan,
      minutesPurchased: t.minutesPurchased,
      minutesQuotaPerUserPerMonth: t.minutesQuotaPerUserPerMonth,
      users: t.users,
    });
    const unusedMinutes = unusedMinutesForMonth(monthlyAllocationMinutes, usedMinutes);
    return {
      id: t.id,
      name: t.name,
      plan: t.plan,
      invoicedTotal: Math.round(invoicedTotal * 100) / 100,
      usedMinutes,
      minutesPurchased,
      monthlyAllocationMinutes,
      unusedMinutes,
    };
  });

  return {
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    costPerMinuteDollars: platformSettings.costPerMinuteDollars,
    minutesCoached,
    tenantBreakdown,
  };
}
