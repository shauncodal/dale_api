import { prisma } from '../lib/prisma';

export async function listGroups(tenantId: string) {
  const groups = await prisma.group.findMany({
    where: { tenantId },
    include: {
      users: { include: { sessions: { where: { deletedAt: null } } } },
      groupAvatars: { select: { avatarId: true } },
    },
    orderBy: { title: 'asc' },
  });
  return groups.map((g) => {
    const allSessions = g.users.flatMap((u) => u.sessions);
    const sessionsCount = allSessions.length;
    const minutesUsed = allSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const scoresWithValues = allSessions.map((s) => s.score).filter((x): x is number => x != null);
    const avgScore =
      scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((a, b) => a + b, 0) / scoresWithValues.length)
        : 0;
    return {
      id: g.id,
      tenantId: g.tenantId,
      title: g.title,
      description: g.description,
      createdAt: g.createdAt.toISOString().slice(0, 7),
      userCount: g.users.length,
      assignedAvatarIds: g.groupAvatars.map((a) => a.avatarId),
      sessions: sessionsCount,
      minutesUsed,
      avgScore,
    };
  });
}

export async function getGroupById(id: string) {
  const g = await prisma.group.findUnique({
    where: { id },
    include: {
      tenant: true,
      users: { include: { sessions: { where: { deletedAt: null } } } },
      groupAvatars: { select: { avatarId: true } },
    },
  });
  if (!g) return null;
  const { groupAvatars, ...rest } = g;
  return { ...rest, assignedAvatarIds: groupAvatars.map((a) => a.avatarId) };
}

export async function createGroup(
  tenantId: string,
  data: { title: string; description?: string | null; avatarIds?: string[] }
) {
  const avatarIds = data.avatarIds ?? [];
  const group = await prisma.group.create({
    data: {
      tenantId,
      title: data.title,
      description: data.description ?? null,
    },
  });
  if (avatarIds.length > 0) {
    await prisma.groupAvatar.createMany({
      data: avatarIds.map((avatarId) => ({ groupId: group.id, avatarId })),
      skipDuplicates: true,
    });
  }
  const withAvatars = await prisma.group.findUnique({
    where: { id: group.id },
    include: { groupAvatars: { select: { avatarId: true } } },
  });
  return {
    ...group,
    assignedAvatarIds: withAvatars?.groupAvatars.map((a) => a.avatarId) ?? [],
  };
}

export async function updateGroup(
  id: string,
  data: Partial<{ title: string; description: string | null; avatarIds: string[] }>
) {
  const { avatarIds, ...rest } = data;
  await prisma.group.update({
    where: { id },
    data: { ...rest, updatedAt: new Date() },
  });
  if (avatarIds !== undefined) {
    await prisma.groupAvatar.deleteMany({ where: { groupId: id } });
    if (avatarIds.length > 0) {
      await prisma.groupAvatar.createMany({
        data: avatarIds.map((avatarId) => ({ groupId: id, avatarId })),
        skipDuplicates: true,
      });
    }
  }
  return getGroupById(id);
}

export async function getGroupUsers(groupId: string, statusFilter?: 'active' | 'archived' | 'all') {
  const where: { groupId: string; status?: string } = { groupId };
  if (statusFilter === 'active') where.status = 'active';
  else if (statusFilter === 'archived') where.status = 'archived';
  const [users, group] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { sessions: { where: { deletedAt: null } } },
    }),
    prisma.group.findUnique({
      where: { id: groupId },
      include: { tenant: { select: { plan: true, minutesPurchased: true } } },
    }),
  ]);
  const tenant = group?.tenant;
  const isCustomPool = tenant?.plan === 'Custom' && (tenant?.minutesPurchased ?? 0) > 0;
  const poolTotal = tenant?.minutesPurchased ?? 0;
  const coachIds = new Set(users.flatMap((u) => u.sessions.map((s) => s.coachId)));
  const avatars = await prisma.coachingAvatar.findMany({
    where: { id: { in: [...coachIds] } },
    select: { id: true, name: true },
  });
  const coachName = (id: string) => avatars.find((a) => a.id === id)?.name?.split(' ')[0] ?? id;
  return users.map((u) => {
    const totalMinutes = u.sessions.reduce((m, s) => m + s.durationMinutes, 0);
    const byCoach: Record<string, number> = {};
    u.sessions.forEach((s) => {
      byCoach[s.coachId] = (byCoach[s.coachId] ?? 0) + s.durationMinutes;
    });
    const coachingUsed = Object.entries(byCoach).map(([coachNameId, minutes]) => ({
      coachName: coachName(coachNameId),
      minutes,
    }));
    const scores = u.sessions.map((s) => s.score).filter((x): x is number => x != null);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      id: u.id,
      tenantId: u.tenantId,
      groupId: u.groupId,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      sessions: u.sessions.length,
      coachingUsed,
      minutesUsed: totalMinutes,
      minutesTotal: isCustomPool ? poolTotal : (u.minutesQuotaTotal ?? 60),
      avgScore,
      termsConsentAt: u.termsConsentAt?.toISOString() ?? null,
      termsConsentVersion: u.termsConsentVersion ?? null,
    };
  });
}

export async function createGroupUser(
  groupId: string,
  data: {
    name: string;
    email: string;
    role: string;
    status: string;
    minutesQuotaTotal?: number | null;
    passwordHash?: string | null;
    mustChangePassword?: boolean;
  }
) {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { tenantId: true } });
  if (!group) return { error: 'Group not found' as const, user: null };
  const existing = await prisma.user.findUnique({
    where: { groupId_email: { groupId, email: data.email } },
  });
  if (existing) return { conflict: true as const, user: null };
  const user = await prisma.user.create({
    data: {
      tenantId: group.tenantId,
      groupId,
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
      minutesQuotaTotal: data.minutesQuotaTotal ?? 60,
      passwordHash: data.passwordHash ?? null,
      mustChangePassword: data.mustChangePassword ?? false,
    },
  });
  return { conflict: false as const, user };
}

export async function deleteGroup(id: string) {
  const group = await prisma.group.findUnique({
    where: { id },
    include: { users: true },
  });
  if (!group) return { error: 'Group not found' as const };
  if (group.users.length > 0) {
    return { error: 'Cannot delete group with users. Reassign or remove users first.' as const };
  }
  await prisma.group.delete({ where: { id } });
  return { ok: true as const };
}
