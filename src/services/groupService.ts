import bcrypt from 'bcrypt';
import * as groupRepo from '../repositories/groupRepository';
import { csvUserRowSchema } from '../lib/schemas';
import { generateTemporaryPassword } from '../lib/password';
import { config } from '../lib/config';
import * as emailService from './emailService';
import * as mailerliteService from './mailerliteService';

export function listGroups(tenantId: string) {
  return groupRepo.listGroups(tenantId);
}

export function getGroupById(id: string) {
  return groupRepo.getGroupById(id);
}

export function createGroup(
  tenantId: string,
  data: { title: string; description?: string | null; avatarIds?: string[] }
) {
  return groupRepo.createGroup(tenantId, data);
}

export function updateGroup(
  id: string,
  data: Partial<{ title: string; description: string | null; avatarIds: string[] }>
) {
  return groupRepo.updateGroup(id, data);
}

export async function deleteGroup(id: string) {
  return groupRepo.deleteGroup(id);
}

export function getGroupUsers(groupId: string, statusFilter?: 'active' | 'archived' | 'all') {
  return groupRepo.getGroupUsers(groupId, statusFilter);
}

export async function createGroupUser(
  groupId: string,
  data: { name: string; email: string; role: string; status: string; minutesQuotaTotal?: number | null }
): Promise<
  | { conflict: true; user: null }
  | { conflict: false; user: NonNullable<Awaited<ReturnType<typeof groupRepo.createGroupUser>>['user']>; inviteEmailSent?: boolean }
> {
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const out = await groupRepo.createGroupUser(groupId, {
    ...data,
    passwordHash,
    mustChangePassword: true,
  });
  if (out.error === 'Group not found') throw new Error('Group not found');
  if (out.conflict) return out;
  const loginUrl = `${config.appUrl.replace(/\/$/, '')}/login`;
  const emailResult = await emailService.sendInviteEmail(out.user!.email, out.user!.name, tempPassword, loginUrl);
  console.log('[invite] User created:', { userId: out.user!.id, email: out.user!.email, inviteEmailSent: emailResult.sent, error: emailResult.error });
  await mailerliteService.syncSubscriber(out.user!.email, out.user!.name);
  return { conflict: false, user: out.user!, inviteEmailSent: emailResult.sent };
}

const MAX_IMPORT_ROWS = 500;

export async function importGroupUsers(
  groupId: string,
  rows: Array<{ name: string; email: string; role?: string }>,
  options?: { sendInvite?: boolean }
): Promise<{ created: number; failed: number; errors: Array<{ row: number; email?: string; message: string }> }> {
  const sendInvite = options?.sendInvite !== false;
  const result = { created: 0, failed: 0, errors: [] as Array<{ row: number; email?: string; message: string }> };
  const limited = rows.slice(0, MAX_IMPORT_ROWS);
  const loginUrl = `${config.appUrl.replace(/\/$/, '')}/login`;
  for (let i = 0; i < limited.length; i++) {
    const parsed = csvUserRowSchema.safeParse(limited[i]);
    if (!parsed.success) {
      result.failed++;
      result.errors.push({ row: i + 1, email: limited[i]?.email, message: parsed.error.errors.map((e) => e.message).join(', ') });
      continue;
    }
    const row = parsed.data;
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const out = await groupRepo.createGroupUser(groupId, {
      name: row.name,
      email: row.email,
      role: row.role ?? 'User',
      status: 'active',
      passwordHash,
      mustChangePassword: true,
    });
    if (out.error === 'Group not found') throw new Error('Group not found');
    if (out.conflict) {
      result.failed++;
      result.errors.push({ row: i + 1, email: row.email, message: 'Duplicate email in group' });
    } else {
      result.created++;
      if (sendInvite && out.user) {
        const emailResult = await emailService.sendInviteEmail(out.user.email, out.user.name, tempPassword, loginUrl);
        console.log('[invite] Import user:', { email: out.user.email, inviteEmailSent: emailResult.sent, error: emailResult.error });
        await mailerliteService.syncSubscriber(out.user.email, out.user.name);
      }
    }
  }
  return result;
}
