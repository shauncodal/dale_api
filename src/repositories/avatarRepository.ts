import { prisma } from '../lib/prisma';

export async function listAvatars() {
  const avatars = await prisma.coachingAvatar.findMany({
    include: { liveConfig: true },
    orderBy: { name: 'asc' },
  });
  return avatars.map((a) => ({
    ...a,
    tags: (a.tags as string[]) ?? [],
    liveAvatarConfig: a.liveConfig
      ? { avatarId: a.liveConfig.avatarId, contextId: a.liveConfig.contextId ?? undefined, voiceId: a.liveConfig.voiceId ?? undefined }
      : undefined,
  }));
}

export async function getAvatarById(id: string) {
  const a = await prisma.coachingAvatar.findUnique({
    where: { id },
    include: { liveConfig: true },
  });
  if (!a) return null;
  return {
    ...a,
    tags: (a.tags as string[]) ?? [],
    liveAvatarConfig: a.liveConfig
      ? { avatarId: a.liveConfig.avatarId, contextId: a.liveConfig.contextId ?? undefined, voiceId: a.liveConfig.voiceId ?? undefined }
      : undefined,
  };
}

export async function createAvatar(data: {
  name: string;
  title: string;
  speciality?: string;
  description?: string;
  style?: string;
  rating: number;
  sessions: number;
  img?: string;
  tags: string[];
  creditRate: number;
  liveAvatarConfig?: { avatarId: string; contextId?: string; voiceId?: string };
}) {
  const { liveAvatarConfig, ...rest } = data;
  const avatar = await prisma.coachingAvatar.create({
    data: {
      ...rest,
      img: rest.img ?? null,
      liveConfig: liveAvatarConfig
        ? {
            create: {
              avatarId: liveAvatarConfig.avatarId,
              contextId: liveAvatarConfig.contextId ?? null,
              voiceId: liveAvatarConfig.voiceId ?? null,
            },
          }
        : undefined,
    },
    include: { liveConfig: true },
  });
  return {
    ...avatar,
    tags: (avatar.tags as string[]) ?? [],
    liveAvatarConfig: avatar.liveConfig
      ? { avatarId: avatar.liveConfig.avatarId, contextId: avatar.liveConfig.contextId ?? undefined, voiceId: avatar.liveConfig.voiceId ?? undefined }
      : undefined,
  };
}

export async function updateAvatar(
  id: string,
  data: Partial<{
    name: string;
    title: string;
    speciality: string;
    description: string;
    style: string;
    rating: number;
    sessions: number;
    img: string | null;
    tags: string[];
    creditRate: number;
  }>
) {
  const avatar = await prisma.coachingAvatar.update({
    where: { id },
    data: {
      ...data,
      ...(data.tags !== undefined && { tags: data.tags }),
    },
    include: { liveConfig: true },
  });
  return {
    ...avatar,
    tags: (avatar.tags as string[]) ?? [],
    liveAvatarConfig: avatar.liveConfig
      ? { avatarId: avatar.liveConfig.avatarId, contextId: avatar.liveConfig.contextId ?? undefined, voiceId: avatar.liveConfig.voiceId ?? undefined }
      : undefined,
  };
}

export async function deleteAvatar(id: string): Promise<void> {
  await prisma.coachingAvatar.delete({ where: { id } });
}

export async function upsertLiveConfig(
  coachId: string,
  data: { avatarId: string; contextId?: string | null; voiceId?: string | null }
) {
  await prisma.liveAvatarConfig.upsert({
    where: { coachId },
    create: { coachId, avatarId: data.avatarId, contextId: data.contextId ?? null, voiceId: data.voiceId ?? null },
    update: { avatarId: data.avatarId, contextId: data.contextId ?? null, voiceId: data.voiceId ?? null },
  });
  return getAvatarById(coachId);
}
