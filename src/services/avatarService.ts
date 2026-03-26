import * as avatarRepo from '../repositories/avatarRepository';

export function listAvatars() {
  return avatarRepo.listAvatars();
}

export function getAvatarById(id: string) {
  return avatarRepo.getAvatarById(id);
}

export function createAvatar(data: Parameters<typeof avatarRepo.createAvatar>[0]) {
  return avatarRepo.createAvatar(data);
}

export function updateAvatar(id: string, data: Parameters<typeof avatarRepo.updateAvatar>[1]) {
  return avatarRepo.updateAvatar(id, data);
}

export function deleteAvatar(id: string): Promise<void> {
  return avatarRepo.deleteAvatar(id);
}

export function upsertLiveConfig(coachId: string, data: { avatarId: string; contextId?: string | null; voiceId?: string | null }) {
  return avatarRepo.upsertLiveConfig(coachId, data);
}
