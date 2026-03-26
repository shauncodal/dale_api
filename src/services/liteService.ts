import { prisma } from '../lib/prisma';
import { endOfMonth, startOfMonth } from '../lib/tenantMonthlyQuota';

export interface LiteMeResult {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  minutesQuotaTotal: number;
  usedMinutesThisMonth: number;
}

export async function getMe(userId: string): Promise<LiteMeResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });
  if (!user) return null;

  const isCustomPool = user.tenant.plan === 'Custom' && (user.tenant.minutesPurchased ?? 0) > 0;

  let usedMinutesThisMonth: number;
  let minutesQuotaTotal: number;

  if (isCustomPool) {
    const now = new Date();
    const tenantAgg = await prisma.session.aggregate({
      where: {
        user: { tenantId: user.tenantId },
        deletedAt: null,
        createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      _sum: { durationMinutes: true },
    });
    usedMinutesThisMonth = tenantAgg._sum.durationMinutes ?? 0;
    minutesQuotaTotal = user.tenant.minutesPurchased!;
  } else {
    const now = new Date();
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      select: { durationMinutes: true },
    });
    usedMinutesThisMonth = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    minutesQuotaTotal = user.minutesQuotaTotal ?? user.tenant.minutesQuotaPerUserPerMonth ?? 60;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    minutesQuotaTotal,
    usedMinutesThisMonth,
  };
}

export interface LiteSessionItem {
  id: string;
  name: string;
  avatar: string;
  avatarId: string;
  avatarImg: string;
  duration: string;
  durationSecs: number;
  credits: number;
  date: string;
  score: number;
  notes: string;
}

export async function getMySessions(userId: string): Promise<LiteSessionItem[]> {
  const sessions = await prisma.session.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  const coachIds = [...new Set(sessions.map((s) => s.coachId))];
  const avatars = await prisma.coachingAvatar.findMany({
    where: { id: { in: coachIds } },
    select: { id: true, name: true, img: true },
  });
  const avatarMap = new Map(avatars.map((a) => [a.id, a]));

  return sessions.map((s) => {
    const avatar = avatarMap.get(s.coachId);
    const durationSecs = s.durationSeconds ?? s.durationMinutes * 60;
    const m = Math.floor(durationSecs / 60);
    const sec = durationSecs % 60;
    const duration = `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return {
      id: s.id,
      name: s.sessionName,
      avatar: avatar?.name ?? s.coachId,
      avatarId: s.coachId,
      avatarImg: avatar?.img ?? '',
      duration,
      durationSecs,
      credits: s.durationMinutes,
      date: s.createdAt.toISOString().slice(0, 10),
      score: s.score ?? 0,
      notes: s.notes ?? '',
    };
  });
}

export interface CreateLiteSessionInput {
  coachId: string;
  sessionName: string;
  durationSeconds: number;
  score?: number;
  notes?: string;
}

export async function createSession(
  userId: string,
  data: CreateLiteSessionInput
): Promise<LiteSessionItem | { error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });
  if (!user) return { error: 'User not found' };

  const durationMinutes = Math.ceil(data.durationSeconds / 60);
  const isCustomPool = user.tenant.plan === 'Custom' && (user.tenant.minutesPurchased ?? 0) > 0;

  if (isCustomPool) {
    const now = new Date();
    const tenantSessions = await prisma.session.aggregate({
      where: {
        user: { tenantId: user.tenantId },
        deletedAt: null,
        createdAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      _sum: { durationMinutes: true },
    });
    const tenantUsed = tenantSessions._sum.durationMinutes ?? 0;
    if (tenantUsed + durationMinutes > user.tenant.minutesPurchased!) {
      return { error: 'Quota exceeded' };
    }
  } else {
    const me = await getMe(userId);
    if (!me) return { error: 'User not found' };
    if (me.usedMinutesThisMonth + durationMinutes > me.minutesQuotaTotal) {
      return { error: 'Quota exceeded' };
    }
  }

  const session = await prisma.session.create({
    data: {
      userId,
      coachId: data.coachId,
      sessionName: data.sessionName,
      durationMinutes,
      durationSeconds: data.durationSeconds,
      score: data.score ?? null,
      notes: data.notes ?? null,
    },
  });

  await prisma.coachingAvatar.update({
    where: { id: session.coachId },
    data: { sessions: { increment: 1 } },
  }).catch(() => {}); // ignore if avatar not found (e.g. coachId references deleted avatar)

  const avatar = await prisma.coachingAvatar.findUnique({
    where: { id: session.coachId },
    select: { name: true, img: true },
  });
  const durationSecs = session.durationSeconds ?? session.durationMinutes * 60;
  const m = Math.floor(durationSecs / 60);
  const sec = durationSecs % 60;
  const duration = `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

  return {
    id: session.id,
    name: session.sessionName,
    avatar: avatar?.name ?? session.coachId,
    avatarId: session.coachId,
    avatarImg: avatar?.img ?? '',
    duration,
    durationSecs,
    credits: session.durationMinutes,
    date: session.createdAt.toISOString().slice(0, 10),
    score: session.score ?? 0,
    notes: session.notes ?? '',
  };
}

export interface LiteAvatarItem {
  id: string;
  name: string;
  title: string;
  speciality: string | null;
  description: string | null;
  style: string | null;
  rating: number;
  sessions: number;
  img: string | null;
  tags: string[];
  creditRate: number;
}

export async function getAvatarsForGroup(groupId: string): Promise<LiteAvatarItem[]> {
  const groupAvatars = await prisma.groupAvatar.findMany({
    where: { groupId },
    include: { avatar: true },
    orderBy: { avatar: { name: 'asc' } },
  });
  return groupAvatars.map((ga) => {
    const a = ga.avatar;
    return {
      id: a.id,
      name: a.name,
      title: a.title,
      speciality: a.speciality,
      description: a.description,
      style: a.style,
      rating: a.rating,
      sessions: a.sessions,
      img: a.img,
      tags: (a.tags as string[]) ?? [],
      creditRate: a.creditRate,
    };
  });
}
