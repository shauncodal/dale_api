import bcrypt from 'bcrypt';
import { config } from '../lib/config';
import { generateTemporaryPassword } from '../lib/password';
import * as emailService from './emailService';
import * as adminUserRepo from '../repositories/adminUserRepository';

export async function listAdminUsers() {
  return adminUserRepo.listAdminUsers();
}

export async function getAdminUserById(id: string) {
  return adminUserRepo.getAdminUserById(id);
}

export async function createAdminUser(data: {
  email: string;
  roleId: string;
  tenantId?: string | null;
}) {
  const existing = await adminUserRepo.getAdminUserByEmail(data.email);
  if (existing) {
    return { error: 'Email already in use' as const, adminUser: null };
  }
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const adminUser = await adminUserRepo.createAdminUser({
    email: data.email,
    passwordHash,
    roleId: data.roleId,
    tenantId: data.tenantId ?? undefined,
    mustChangePassword: true,
  });
  const adminLoginUrl = `${config.adminAppUrl.replace(/\/$/, '')}`;
  const emailResult = await emailService.sendAdminInviteEmail(
    adminUser.email,
    adminUser.email.split('@')[0] ?? 'Admin',
    tempPassword,
    adminLoginUrl
  );
  console.log('[admin-invite] Created:', {
    adminUserId: adminUser.id,
    email: adminUser.email,
    sent: emailResult.sent,
    error: emailResult.error,
  });
  return {
    adminUser: {
      id: adminUser.id,
      email: adminUser.email,
      roleId: adminUser.roleId,
      roleName: adminUser.role?.name,
      tenantId: adminUser.tenantId,
      tenantName: adminUser.tenant?.name,
      mustChangePassword: adminUser.mustChangePassword,
      createdAt: adminUser.createdAt.toISOString(),
    },
    inviteEmailSent: emailResult.sent,
    inviteError: emailResult.error,
  };
}

export async function patchAdminUser(
  id: string,
  data: { roleId?: string; tenantId?: string | null }
) {
  const existing = await adminUserRepo.getAdminUserById(id);
  if (!existing) {
    return { error: 'Admin user not found' as const, adminUser: null };
  }
  const adminUser = await adminUserRepo.updateAdminUser(id, data);
  return {
    adminUser: {
      id: adminUser.id,
      email: adminUser.email,
      roleId: adminUser.roleId,
      roleName: adminUser.role?.name,
      tenantId: adminUser.tenantId,
      tenantName: adminUser.tenant?.name,
      mustChangePassword: adminUser.mustChangePassword,
      createdAt: adminUser.createdAt.toISOString(),
    },
  };
}

export async function resendAdminInvite(id: string): Promise<{
  sent: boolean;
  error?: string;
}> {
  const adminUser = await adminUserRepo.getAdminUserById(id);
  if (!adminUser) {
    return { sent: false, error: 'Admin user not found' };
  }
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await adminUserRepo.updateAdminUserPassword(id, passwordHash);
  const adminLoginUrl = `${config.adminAppUrl.replace(/\/$/, '')}`;
  const emailResult = await emailService.sendAdminInviteEmail(
    adminUser.email,
    adminUser.email.split('@')[0] ?? 'Admin',
    tempPassword,
    adminLoginUrl
  );
  console.log('[admin-invite] Resend:', {
    adminUserId: id,
    email: adminUser.email,
    sent: emailResult.sent,
    error: emailResult.error,
  });
  return { sent: emailResult.sent, error: emailResult.error };
}
