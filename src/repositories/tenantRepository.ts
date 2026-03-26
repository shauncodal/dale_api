import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  endOfMonth,
  startOfMonth,
  tenantMonthlyAllocationMinutes,
  unusedMinutesForMonth,
} from '../lib/tenantMonthlyQuota';

function decimalToNumber(v: Prisma.Decimal | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === 'object' && 'toNumber' in v ? (v as { toNumber(): number }).toNumber() : Number(v);
}

export async function listTenants(search: string, plan: string | undefined) {
  const where: { OR?: Array<{ name?: { contains: string }; domain?: { contains: string } }>; plan?: string } = {};
  if (search.trim()) {
    const q = search.trim();
    where.OR = [{ name: { contains: q } }, { domain: { contains: q } }];
  }
  if (plan) where.plan = plan;
  const tenants = await prisma.tenant.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: {
      users: {
        include: {
          sessions: { where: { deletedAt: null } },
        },
      },
      groups: { include: { groupAvatars: { select: { avatarId: true } } } },
      invoices: { select: { amountDollars: true, minutesTotal: true } },
    },
    orderBy: { name: 'asc' },
  });
  const ref = new Date();
  const mStart = startOfMonth(ref);
  const mEnd = endOfMonth(ref);
  return tenants.map((t) => {
    const totalSessions = t.users.reduce((s, u) => s + u.sessions.length, 0);
    const scores = t.users.flatMap((u) => u.sessions.map((s) => s.score).filter((x): x is number => x != null));
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const quotaUsed = t.users.reduce(
      (s, u) =>
        s +
        u.sessions.reduce((m, sess) => {
          if (sess.createdAt >= mStart && sess.createdAt <= mEnd) return m + sess.durationMinutes;
          return m;
        }, 0),
      0
    );
    const quotaTotal = tenantMonthlyAllocationMinutes({
      plan: t.plan,
      minutesPurchased: t.minutesPurchased,
      minutesQuotaPerUserPerMonth: t.minutesQuotaPerUserPerMonth,
      users: t.users,
    });
    const unusedMinutes = unusedMinutesForMonth(quotaTotal, quotaUsed);
    const coachMinutes: Record<string, number> = {};
    t.users.forEach((u) =>
      u.sessions.forEach((s) => {
        if (s.createdAt >= mStart && s.createdAt <= mEnd) {
          coachMinutes[s.coachId] = (coachMinutes[s.coachId] ?? 0) + s.durationMinutes;
        }
      })
    );
    const topCoaches = Object.entries(coachMinutes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([coachName, minutes]) => ({ coachName, minutes }));
    const amountPaid = t.invoices.reduce((s, inv) => s + (decimalToNumber(inv.amountDollars) ?? 0), 0);
    const minutesAssignedFromInvoices = t.invoices.reduce((s, inv) => s + inv.minutesTotal, 0);
    return {
      id: t.id,
      name: t.name,
      domain: t.domain,
      contactEmail: t.contactEmail,
      plan: t.plan,
      status: t.status,
      minutesQuotaPerUserPerMonth: t.minutesQuotaPerUserPerMonth,
      pricePerUserPerMonthDollars: decimalToNumber(t.pricePerUserPerMonthDollars),
      pricePer30MinDollars: decimalToNumber(t.pricePer30MinDollars),
      minutesPurchased: t.minutesPurchased,
      minutesAssignedFromInvoices,
      amountPaid: Math.round(amountPaid * 100) / 100,
      groupCount: t.groups.length,
      createdAt: t.createdAt.toISOString().slice(0, 7),
      userCount: t.users.length,
      activeUserCount: t.users.filter((u) => u.status === 'active').length,
      sessions: totalSessions,
      avgScore,
      quotaUsed,
      quotaTotal,
      unusedMinutes,
      topCoaches,
    };
  });
}

export async function getTenantById(id: string) {
  const t = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        include: { sessions: { where: { deletedAt: null } }, group: { select: { id: true, title: true } } },
      },
      groups: { include: { groupAvatars: { select: { avatarId: true } }, users: true } },
      invoices: { select: { amountDollars: true, minutesTotal: true } },
    },
  });
  if (!t) return null;
  const ref = new Date();
  const mStart = startOfMonth(ref);
  const mEnd = endOfMonth(ref);
  const totalSessions = t.users.reduce((s, u) => s + u.sessions.length, 0);
  const scores = t.users.flatMap((u) => u.sessions.map((s) => s.score).filter((x): x is number => x != null));
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const quotaUsed = t.users.reduce(
    (s, u) =>
      s +
      u.sessions.reduce((m, sess) => {
        if (sess.createdAt >= mStart && sess.createdAt <= mEnd) return m + sess.durationMinutes;
        return m;
      }, 0),
    0
  );
  const quotaTotal = tenantMonthlyAllocationMinutes({
    plan: t.plan,
    minutesPurchased: t.minutesPurchased,
    minutesQuotaPerUserPerMonth: t.minutesQuotaPerUserPerMonth,
    users: t.users,
  });
  const unusedMinutes = unusedMinutesForMonth(quotaTotal, quotaUsed);
  const coachMinutes: Record<string, number> = {};
  t.users.forEach((u) =>
    u.sessions.forEach((s) => {
      if (s.createdAt >= mStart && s.createdAt <= mEnd) {
        coachMinutes[s.coachId] = (coachMinutes[s.coachId] ?? 0) + s.durationMinutes;
      }
    })
  );
  const avatars = await prisma.coachingAvatar.findMany({ where: { id: { in: Object.keys(coachMinutes) } }, select: { id: true, name: true } });
  const topCoaches = Object.entries(coachMinutes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([avatarId, minutes]) => ({ coachName: avatars.find((a) => a.id === avatarId)?.name?.split(' ')[0] ?? avatarId, minutes }));
  const amountPaid = t.invoices.reduce((s, inv) => s + (decimalToNumber(inv.amountDollars) ?? 0), 0);
  const minutesAssignedFromInvoices = t.invoices.reduce((s, inv) => s + inv.minutesTotal, 0);
  const { groups, ...rest } = t;
  return {
    ...rest,
    pricePerUserPerMonthDollars: decimalToNumber(t.pricePerUserPerMonthDollars),
    pricePer30MinDollars: decimalToNumber(t.pricePer30MinDollars),
    minutesPurchased: t.minutesPurchased,
    minutesAssignedFromInvoices,
    amountPaid: Math.round(amountPaid * 100) / 100,
    groups: groups.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      userCount: g.users.length,
      assignedAvatarIds: g.groupAvatars.map((a) => a.avatarId),
    })),
    createdAt: t.createdAt.toISOString().slice(0, 7),
    userCount: t.users.length,
    activeUserCount: t.users.filter((u) => u.status === 'active').length,
    sessions: totalSessions,
    avgScore,
    quotaUsed,
    quotaTotal,
    unusedMinutes,
    topCoaches,
  };
}

export async function createTenant(data: {
  name: string;
  domain: string;
  contactEmail: string;
  plan: string;
  status: string;
  minutesPerUserPerMonth: number;
  pricePerUserPerMonthDollars?: number | null;
  pricePer30MinDollars?: number | null;
  minutesPurchased?: number;
}) {
  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      domain: data.domain,
      contactEmail: data.contactEmail,
      plan: data.plan,
      status: data.status,
      minutesQuotaPerUserPerMonth: data.minutesPerUserPerMonth,
      pricePerUserPerMonthDollars: data.pricePerUserPerMonthDollars ?? undefined,
      pricePer30MinDollars: data.pricePer30MinDollars ?? undefined,
      minutesPurchased: data.minutesPurchased ?? 0,
    },
  });
  return getTenantById(tenant.id);
}

export async function updateTenant(
  id: string,
  data: Partial<{
    name: string;
    domain: string;
    contactEmail: string;
    plan: string;
    status: string;
    minutesPerUserPerMonth: number;
    pricePerUserPerMonthDollars: number | null;
    pricePer30MinDollars: number | null;
    minutesPurchased: number;
    addMinutes: number;
  }>
) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.domain !== undefined) updateData.domain = data.domain;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
  if (data.plan !== undefined) updateData.plan = data.plan;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.minutesPerUserPerMonth !== undefined) updateData.minutesQuotaPerUserPerMonth = data.minutesPerUserPerMonth;
  if (data.pricePerUserPerMonthDollars !== undefined) updateData.pricePerUserPerMonthDollars = data.pricePerUserPerMonthDollars;
  if (data.pricePer30MinDollars !== undefined) updateData.pricePer30MinDollars = data.pricePer30MinDollars;
  if (data.minutesPurchased !== undefined) updateData.minutesPurchased = data.minutesPurchased;
  if (data.addMinutes !== undefined && data.addMinutes > 0) {
    const current = await prisma.tenant.findUnique({ where: { id }, select: { minutesPurchased: true } });
    if (current) {
      updateData.minutesPurchased = current.minutesPurchased + data.addMinutes;
    }
  }
  await prisma.tenant.update({
    where: { id },
    data: updateData,
  });
  return getTenantById(id);
}

export async function getTenantUsers(tenantId: string, statusFilter?: 'active' | 'archived' | 'all') {
  const where: { tenantId: string; status?: string } = { tenantId };
  if (statusFilter === 'active') where.status = 'active';
  else if (statusFilter === 'archived') where.status = 'archived';
  const ref = new Date();
  const mStart = startOfMonth(ref);
  const mEnd = endOfMonth(ref);
  const [users, tenant] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { sessions: { where: { deletedAt: null } }, group: { select: { id: true, title: true } } },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true, minutesPurchased: true, minutesQuotaPerUserPerMonth: true },
    }),
  ]);
  const defaultPerUser = tenant?.minutesQuotaPerUserPerMonth ?? 60;
  const coachIds = new Set(users.flatMap((u) => u.sessions.map((s) => s.coachId)));
  const avatars = await prisma.coachingAvatar.findMany({ where: { id: { in: [...coachIds] } }, select: { id: true, name: true } });
  const coachName = (id: string) => avatars.find((a) => a.id === id)?.name?.split(' ')[0] ?? id;
  return users.map((u) => {
    const sessionsInMonth = u.sessions.filter((s) => s.createdAt >= mStart && s.createdAt <= mEnd);
    const minutesUsedThisMonth = sessionsInMonth.reduce((m, s) => m + s.durationMinutes, 0);
    const byCoach: Record<string, number> = {};
    sessionsInMonth.forEach((s) => { byCoach[s.coachId] = (byCoach[s.coachId] ?? 0) + s.durationMinutes; });
    const coachingUsed = Object.entries(byCoach).map(([coachNameId, minutes]) => ({ coachName: coachName(coachNameId), minutes }));
    const scores = u.sessions.map((s) => s.score).filter((x): x is number => x != null);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const minutesTotal = u.minutesQuotaTotal ?? defaultPerUser;
    return {
      id: u.id,
      tenantId: u.tenantId,
      groupId: u.groupId,
      groupTitle: u.group?.title,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      sessions: u.sessions.length,
      coachingUsed,
      minutesUsed: minutesUsedThisMonth,
      minutesTotal,
      avgScore,
      termsConsentAt: u.termsConsentAt?.toISOString() ?? null,
      termsConsentVersion: u.termsConsentVersion ?? null,
    };
  });
}

export async function updateUser(id: string, data: Partial<{ name: string; email: string; role: string; status: string; minutesQuotaTotal: number | null }>) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function setUserInvitePassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { tenant: true, group: true },
  });
}

export async function getUserSessions(userId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, deletedAt: null },
    include: { recording: true },
    orderBy: { createdAt: 'desc' },
  });
  const avatars = await prisma.coachingAvatar.findMany({
    where: { id: { in: [...new Set(sessions.map((s) => s.coachId))] } },
    select: { id: true, name: true },
  });
  const coachName = (id: string) => avatars.find((a) => a.id === id)?.name ?? id;
  const { getRecordingPlaybackUrl } = await import('../services/s3Service');
  const result = [];
  for (const s of sessions) {
    let recordingUrl: string | null = null;
    if (s.recording) {
      recordingUrl = await getRecordingPlaybackUrl(s.recording.s3Bucket, s.recording.s3Key);
    }
    result.push({
      id: s.id,
      sessionName: s.sessionName,
      coachName: coachName(s.coachId),
      coachId: s.coachId,
      durationMin: s.durationMinutes,
      durationSeconds: s.durationSeconds ?? s.durationMinutes * 60,
      score: s.score ?? 0,
      notes: s.notes ?? '',
      date: s.createdAt.toISOString().slice(0, 10),
      createdAt: s.createdAt.toISOString(),
      recordingUrl,
      avatarResponseScore: s.recording?.avatarResponseScore ?? null,
      userEngagementScore: s.recording?.userEngagementScore ?? null,
    });
  }
  return result;
}
