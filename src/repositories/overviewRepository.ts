import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  endOfMonth,
  startOfMonth,
  tenantMonthlyAllocationMinutes,
  unusedMinutesForMonth,
} from '../lib/tenantMonthlyQuota';
import * as platformSettingsRepo from './platformSettingsRepository';

function decimalToNumber(v: Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'object' && 'toNumber' in v ? (v as { toNumber(): number }).toNumber() : Number(v);
}

export async function getKpis() {
  const [activeTenants, totalUsers, sessionsAgg, scoreAgg, invoicesAgg, invoicesMinutesAgg, platformSettings] = await Promise.all([
    prisma.tenant.count({ where: { status: 'Active' } }),
    prisma.user.count(),
    prisma.session.aggregate({
      _sum: { durationMinutes: true },
      _count: { id: true },
      where: { deletedAt: null },
    }),
    prisma.session.aggregate({
      _avg: { score: true },
      where: { deletedAt: null, score: { not: null } },
    }),
    prisma.tenantInvoice.aggregate({ _sum: { amountDollars: true } }),
    prisma.tenantInvoice.aggregate({ _sum: { minutesTotal: true } }),
    platformSettingsRepo.getSettings(),
  ]);
  const minutesCoached = sessionsAgg._sum.durationMinutes ?? 0;
  const avgScore = Math.round(scoreAgg._avg.score ?? 0);
  const totalRevenue = Math.round((decimalToNumber(invoicesAgg._sum.amountDollars)) * 100) / 100;
  const invoicedMinutesTotal = invoicesMinutesAgg._sum.minutesTotal ?? 0;
  const avatarCost = (invoicedMinutesTotal / 30) * platformSettings.costPer30MinAvatarDollars;
  const totalCost = Math.round((avatarCost + platformSettings.infrastructureCostDollars) * 100) / 100;
  const totalProfit = Math.round((totalRevenue - totalCost) * 100) / 100;

  return {
    activeTenants,
    totalUsers,
    minutesCoached,
    sessionsCount: sessionsAgg._count.id,
    avgScore,
    totalRevenue,
    totalCost,
    totalProfit,
    costPerMinuteDollars: platformSettings.costPerMinuteDollars,
  };
}

export async function getUsageTrend(months: number) {
  const rows = await prisma.$queryRaw<{ month: string; minutes: unknown; sessions: unknown }[]>`
    SELECT
      DATE_FORMAT(\`createdAt\`, '%b') AS month,
      COALESCE(SUM(\`durationMinutes\`), 0) AS minutes,
      COUNT(*) AS sessions
    FROM \`Session\`
    WHERE \`deletedAt\` IS NULL
      AND \`createdAt\` >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH)
    GROUP BY DATE_FORMAT(\`createdAt\`, '%Y-%m'), DATE_FORMAT(\`createdAt\`, '%b')
    ORDER BY DATE_FORMAT(\`createdAt\`, '%Y-%m')
  `;
  return rows.map((r) => ({
    month: String(r.month),
    minutes: Number(r.minutes),
    sessions: Number(r.sessions),
  }));
}

export async function getMostUsedCoaches() {
  const rows = await prisma.$queryRaw<{ coachId: string; minutes: number }[]>`
    SELECT \`coachId\`, COALESCE(SUM(\`durationMinutes\`), 0) AS minutes
    FROM \`Session\`
    WHERE \`deletedAt\` IS NULL
    GROUP BY \`coachId\`
    ORDER BY minutes DESC
    LIMIT 10
  `;
  const coachNames: Record<string, string> = {};
  if (rows.length > 0) {
    const avatars = await prisma.coachingAvatar.findMany({
      where: { id: { in: rows.map((r) => r.coachId) } },
      select: { id: true, name: true },
    });
    avatars.forEach((a) => { coachNames[a.id] = a.name.split(' ')[0]; });
  }
  const colors = ['#a855f7', '#a3e635', '#2dd4bf', '#8b5cf6', '#3b82f6', '#f97316'];
  return rows.map((r, i) => ({
    coachName: coachNames[r.coachId] ?? r.coachId,
    minutes: Number(r.minutes),
    color: colors[i % colors.length],
  }));
}

export async function getScoreDistribution() {
  const rows = await prisma.$queryRaw<{ range: string; count: bigint }[]>`
    SELECT
      CASE
        WHEN \`score\` >= 90 THEN '90-100'
        WHEN \`score\` >= 80 THEN '80-89'
        WHEN \`score\` >= 70 THEN '70-79'
        WHEN \`score\` >= 60 THEN '60-69'
        ELSE '<60'
      END AS \`range\`,
      COUNT(*) AS \`count\`
    FROM \`Session\`
    WHERE \`deletedAt\` IS NULL AND \`score\` IS NOT NULL
    GROUP BY 1
    ORDER BY \`range\` DESC
  `;
  const order = ['90-100', '80-89', '70-79', '60-69', '<60'];
  const map = new Map(rows.map((r) => [r.range, Number(r.count)]));
  return order.map((range) => ({ range, count: map.get(range) ?? 0 }));
}

export async function getPlanDistribution() {
  const rows = await prisma.$queryRaw<{ plan: string; tenants: bigint }[]>`
    SELECT \`plan\`, COUNT(*) AS tenants
    FROM \`Tenant\`
    GROUP BY \`plan\`
  `;
  const colors: Record<string, string> = { Enterprise: '#eab308', Growth: '#a3e635', Starter: '#3b82f6' };
  return rows.map((r) => ({
    plan: r.plan,
    tenants: Number(r.tenants),
    color: colors[r.plan] ?? '#6b7280',
  }));
}

export async function getTenantKpis(tenantId: string) {
  const ref = new Date();
  const [tenant, users, sessionsAggMonth, scoreAgg, invoicesAgg] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        minutesPurchased: true,
        pricePer30MinDollars: true,
        minutesQuotaPerUserPerMonth: true,
      },
    }),
    prisma.user.findMany({ where: { tenantId }, select: { id: true, status: true, minutesQuotaTotal: true } }),
    prisma.session.aggregate({
      _sum: { durationMinutes: true },
      _count: { id: true },
      where: {
        deletedAt: null,
        user: { tenantId },
        createdAt: { gte: startOfMonth(ref), lte: endOfMonth(ref) },
      },
    }),
    prisma.session.aggregate({
      _avg: { score: true },
      where: { deletedAt: null, score: { not: null }, user: { tenantId } },
    }),
    prisma.tenantInvoice.aggregate({
      _sum: { amountDollars: true },
      where: { tenantId },
    }),
  ]);
  if (!tenant) return null;
  const userCount = users.length;
  const minutesCoached = sessionsAggMonth._sum.durationMinutes ?? 0;
  const sessionsCount = sessionsAggMonth._count.id;
  const avgScore = Math.round(scoreAgg._avg.score ?? 0);
  const quotaTotal = tenantMonthlyAllocationMinutes({
    plan: tenant.plan,
    minutesPurchased: tenant.minutesPurchased,
    minutesQuotaPerUserPerMonth: tenant.minutesQuotaPerUserPerMonth,
    users,
  });
  const amountPaid = decimalToNumber(invoicesAgg._sum.amountDollars);
  return {
    userCount,
    minutesCoached,
    sessionsCount,
    avgScore,
    quotaUsed: minutesCoached,
    quotaTotal,
    amountPaid: Math.round(amountPaid * 100) / 100,
  };
}

/** Per-calendar-month breakdown; allocation uses current tenant/user settings for all rows (no historical snapshots). Months before tenant signup are omitted. */
export async function getTenantMonthlyMinutesBreakdown(tenantId: string, months: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { users: { select: { id: true, status: true, minutesQuotaTotal: true } } },
  });
  if (!tenant) return null;
  const allocation = tenantMonthlyAllocationMinutes({
    plan: tenant.plan,
    minutesPurchased: tenant.minutesPurchased,
    minutesQuotaPerUserPerMonth: tenant.minutesQuotaPerUserPerMonth,
    users: tenant.users,
  });
  const now = new Date();
  const signupMonthStart = startOfMonth(tenant.createdAt);
  const rows: Array<{
    yearMonth: string;
    label: string;
    allocation: number;
    used: number;
    unused: number;
  }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (d < signupMonthStart) continue;
    const sm = startOfMonth(d);
    const em = endOfMonth(d);
    const agg = await prisma.session.aggregate({
      where: {
        deletedAt: null,
        user: { tenantId },
        createdAt: { gte: sm, lte: em },
      },
      _sum: { durationMinutes: true },
    });
    const used = agg._sum.durationMinutes ?? 0;
    const unused = unusedMinutesForMonth(allocation, used);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    rows.push({ yearMonth, label, allocation, used, unused });
  }
  return rows;
}

export async function getTenantUsageTrend(tenantId: string, months: number) {
  const rows = await prisma.$queryRaw<{ month: string; minutes: unknown; sessions: unknown }[]>`
    SELECT
      DATE_FORMAT(s.\`createdAt\`, '%b') AS month,
      COALESCE(SUM(s.\`durationMinutes\`), 0) AS minutes,
      COUNT(*) AS sessions
    FROM \`Session\` s
    INNER JOIN \`User\` u ON u.id = s.userId AND u.tenantId = ${tenantId}
    WHERE s.\`deletedAt\` IS NULL
      AND s.\`createdAt\` >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH)
    GROUP BY DATE_FORMAT(s.\`createdAt\`, '%Y-%m'), DATE_FORMAT(s.\`createdAt\`, '%b')
    ORDER BY DATE_FORMAT(s.\`createdAt\`, '%Y-%m')
  `;
  return rows.map((r) => ({
    month: String(r.month),
    minutes: Number(r.minutes),
    sessions: Number(r.sessions),
  }));
}

export async function getTenantMostUsedCoaches(tenantId: string) {
  const rows = await prisma.$queryRaw<{ coachId: string; minutes: number }[]>`
    SELECT s.\`coachId\`, COALESCE(SUM(s.\`durationMinutes\`), 0) AS minutes
    FROM \`Session\` s
    INNER JOIN \`User\` u ON u.id = s.userId AND u.tenantId = ${tenantId}
    WHERE s.\`deletedAt\` IS NULL
    GROUP BY s.\`coachId\`
    ORDER BY minutes DESC
    LIMIT 10
  `;
  const coachNames: Record<string, string> = {};
  if (rows.length > 0) {
    const avatars = await prisma.coachingAvatar.findMany({
      where: { id: { in: rows.map((r) => r.coachId) } },
      select: { id: true, name: true },
    });
    avatars.forEach((a) => { coachNames[a.id] = a.name.split(' ')[0]; });
  }
  const colors = ['#a855f7', '#a3e635', '#2dd4bf', '#8b5cf6', '#3b82f6', '#f97316'];
  return rows.map((r, i) => ({
    coachName: coachNames[r.coachId] ?? r.coachId,
    minutes: Number(r.minutes),
    color: colors[i % colors.length],
  }));
}

export async function getTenantScoreDistribution(tenantId: string) {
  const rows = await prisma.$queryRaw<{ range: string; count: bigint }[]>`
    SELECT
      CASE
        WHEN s.\`score\` >= 90 THEN '90-100'
        WHEN s.\`score\` >= 80 THEN '80-89'
        WHEN s.\`score\` >= 70 THEN '70-79'
        WHEN s.\`score\` >= 60 THEN '60-69'
        ELSE '<60'
      END AS \`range\`,
      COUNT(*) AS \`count\`
    FROM \`Session\` s
    INNER JOIN \`User\` u ON u.id = s.userId AND u.tenantId = ${tenantId}
    WHERE s.\`deletedAt\` IS NULL AND s.\`score\` IS NOT NULL
    GROUP BY 1
    ORDER BY \`range\` DESC
  `;
  const order = ['90-100', '80-89', '70-79', '60-69', '<60'];
  const map = new Map(rows.map((r) => [r.range, Number(r.count)]));
  return order.map((range) => ({ range, count: map.get(range) ?? 0 }));
}

export async function getTenantMostActiveUsers(tenantId: string, limit: number) {
  const ref = new Date();
  const mStart = startOfMonth(ref);
  const mEnd = endOfMonth(ref);
  const tenantMeta = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { minutesQuotaPerUserPerMonth: true },
  });
  const defaultCap = tenantMeta?.minutesQuotaPerUserPerMonth ?? 60;
  const sessions = await prisma.session.findMany({
    where: {
      deletedAt: null,
      user: { tenantId },
      createdAt: { gte: mStart, lte: mEnd },
    },
    include: { user: { include: { tenant: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const byUser = new Map<string, { user: { id: string; name: string; email: string; tenant: { name: string }; minutesQuotaTotal?: number | null }; sessions: typeof sessions; totalMinutes: number; totalScore: number; count: number }>();
  for (const s of sessions) {
    const u = s.user;
    const key = u.id;
    if (!byUser.has(key)) {
      byUser.set(key, {
        user: u as unknown as { id: string; name: string; email: string; tenant: { name: string }; minutesQuotaTotal?: number | null },
        sessions: [],
        totalMinutes: 0,
        totalScore: 0,
        count: 0,
      });
    }
    const rec = byUser.get(key)!;
    rec.sessions.push(s);
    rec.totalMinutes += s.durationMinutes;
    if (s.score != null) { rec.totalScore += s.score; rec.count++; }
  }
  const sorted = [...byUser.values()]
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, limit);
  const coachIds = new Set<string>();
  sorted.forEach((r) => r.sessions.forEach((s) => coachIds.add(s.coachId)));
  const avatars = await prisma.coachingAvatar.findMany({ where: { id: { in: [...coachIds] } }, select: { id: true, name: true } });
  const coachName = (id: string) => avatars.find((a) => a.id === id)?.name?.split(' ')[0] ?? id;
  const coachColors: Record<string, string> = { priya: '#a855f7', maya: '#a3e635', james: '#2dd4bf', diana: '#8b5cf6', robert: '#3b82f6', alex: '#f97316' };
  return sorted.map((r) => {
    const byCoach = new Map<string, number>();
    r.sessions.forEach((s) => byCoach.set(s.coachId, (byCoach.get(s.coachId) ?? 0) + s.durationMinutes));
    const coachingUsed = [...byCoach.entries()]
      .map(([id, minutes]) => ({
        coachName: coachName(id),
        minutes,
        color: coachColors[id] ?? '#6b7280',
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
    const avgScore = r.count > 0 ? Math.round(r.totalScore / r.count) : 0;
    const minutesTotal = r.user.minutesQuotaTotal ?? defaultCap;
    return {
      name: r.user.name,
      email: r.user.email,
      tenant: r.user.tenant.name,
      sessions: r.sessions.length,
      coachingUsed,
      minutesUsed: r.totalMinutes,
      minutesTotal,
      avgScore,
    };
  });
}

export async function getMostActiveUsers(limit: number) {
  const sessions = await prisma.session.findMany({
    where: { deletedAt: null },
    include: { user: { include: { tenant: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const byUser = new Map<string, { user: { id: string; name: string; email: string; tenant: { name: string } }; sessions: typeof sessions; totalMinutes: number; totalScore: number; count: number }>();
  for (const s of sessions) {
    const u = s.user;
    const key = u.id;
    if (!byUser.has(key)) {
      byUser.set(key, { user: u as unknown as { id: string; name: string; email: string; tenant: { name: string } }, sessions: [], totalMinutes: 0, totalScore: 0, count: 0 });
    }
    const rec = byUser.get(key)!;
    rec.sessions.push(s);
    rec.totalMinutes += s.durationMinutes;
    if (s.score != null) { rec.totalScore += s.score; rec.count++; }
  }
  const sorted = [...byUser.values()]
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, limit);
  const coachIds = new Set<string>();
  sorted.forEach((r) => r.sessions.forEach((s) => coachIds.add(s.coachId)));
  const avatars = await prisma.coachingAvatar.findMany({ where: { id: { in: [...coachIds] } }, select: { id: true, name: true } });
  const coachName = (id: string) => avatars.find((a) => a.id === id)?.name?.split(' ')[0] ?? id;
  const coachColors: Record<string, string> = { priya: '#a855f7', maya: '#a3e635', james: '#2dd4bf', diana: '#8b5cf6', robert: '#3b82f6', alex: '#f97316' };
  return sorted.map((r) => {
    const byCoach = new Map<string, number>();
    r.sessions.forEach((s) => byCoach.set(s.coachId, (byCoach.get(s.coachId) ?? 0) + s.durationMinutes));
    const coachingUsed = [...byCoach.entries()].map(([id, minutes]) => ({
      coachName: coachName(id),
      minutes,
      color: coachColors[id] ?? '#6b7280',
    })).sort((a, b) => b.minutes - a.minutes).slice(0, 5);
    const avgScore = r.count > 0 ? Math.round(r.totalScore / r.count) : 0;
    const quotaTotal = (r.user as { minutesQuotaTotal?: number }).minutesQuotaTotal ?? 60;
    return {
      name: r.user.name,
      email: r.user.email,
      tenant: r.user.tenant.name,
      sessions: r.sessions.length,
      coachingUsed,
      minutesUsed: r.totalMinutes,
      minutesTotal: quotaTotal,
      avgScore,
    };
  });
}
