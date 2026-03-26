import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import * as tenantRepo from '../repositories/tenantRepository';
import { generateTemporaryPassword } from '../lib/password';
import { config } from '../lib/config';
import * as emailService from './emailService';
import * as mailerliteService from './mailerliteService';
import * as adminUserService from './adminUserService';

export function listTenants(search: string, plan: string | undefined) {
  return tenantRepo.listTenants(search, plan);
}

export function getTenantById(id: string) {
  return tenantRepo.getTenantById(id);
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
}): Promise<
  | { tenant: Awaited<ReturnType<typeof tenantRepo.createTenant>>; inviteEmailSent?: boolean; inviteError?: string }
  | { tenant: null; inviteEmailSent?: boolean; inviteError?: string }
> {
  const tenant = await tenantRepo.createTenant(data);
  if (!tenant) return { tenant: null };

  const tenantRole = await prisma.role.findUnique({ where: { name: 'tenant' } });
  if (!tenantRole) {
    console.warn('[tenant] Tenant role not found; skipping admin user creation');
    return { tenant };
  }

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: data.contactEmail.toLowerCase() },
  });
  if (existingAdmin) {
    console.log('[tenant] Contact email already has admin account:', data.contactEmail);
    return { tenant };
  }

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.adminUser.create({
    data: {
      email: data.contactEmail.toLowerCase(),
      passwordHash,
      roleId: tenantRole.id,
      tenantId: tenant.id,
      mustChangePassword: true,
    },
  });
  const adminLoginUrl = `${config.adminAppUrl.replace(/\/$/, '')}`;
  const contactName = data.contactEmail.split('@')[0] ?? data.name;
  const emailResult = await emailService.sendAdminInviteEmail(
    data.contactEmail,
    contactName,
    tempPassword,
    adminLoginUrl
  );
  console.log('[tenant] Admin invite sent:', {
    tenantId: tenant.id,
    contactEmail: data.contactEmail,
    sent: emailResult.sent,
    error: emailResult.error,
  });
  return {
    tenant,
    inviteEmailSent: emailResult.sent,
    inviteError: emailResult.error,
  };
}

export function updateTenant(
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
  return tenantRepo.updateTenant(id, data);
}

export function getTenantUsers(tenantId: string, statusFilter?: 'active' | 'archived' | 'all') {
  return tenantRepo.getTenantUsers(tenantId, statusFilter);
}

export function updateUser(id: string, data: Partial<{ name: string; email: string; role: string; status: string; minutesQuotaTotal: number | null }>) {
  return tenantRepo.updateUser(id, data);
}

/** Resend invite email to tenant contact (admin user). Returns sent status. */
export async function resendTenantInvite(tenantId: string): Promise<{ sent: boolean; error?: string }> {
  const tenant = await tenantRepo.getTenantById(tenantId);
  if (!tenant) return { sent: false, error: 'Tenant not found' };
  const contactEmail = tenant.contactEmail.toLowerCase();
  let admin = await prisma.adminUser.findFirst({
    where: { tenantId, email: contactEmail },
  });
  if (!admin) {
    admin = await prisma.adminUser.findUnique({
      where: { email: contactEmail },
    });
    if (admin) {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { tenantId },
      });
      console.log('[tenant] Linked existing admin to tenant:', { adminId: admin.id, tenantId });
    } else {
      const tenantRole = await prisma.role.findUnique({ where: { name: 'tenant' } });
      if (!tenantRole) return { sent: false, error: 'Tenant role not found' };
      const tempPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      admin = await prisma.adminUser.create({
        data: {
          email: contactEmail,
          passwordHash,
          roleId: tenantRole.id,
          tenantId,
          mustChangePassword: true,
        },
      });
      console.log('[tenant] Created tenant contact admin:', { adminId: admin.id, tenantId });
      const adminLoginUrl = `${config.adminAppUrl.replace(/\/$/, '')}`;
      const contactName = contactEmail.split('@')[0] ?? tenant.name;
      const emailResult = await emailService.sendAdminInviteEmail(
        contactEmail,
        contactName,
        tempPassword,
        adminLoginUrl
      );
      return { sent: emailResult.sent, error: emailResult.error };
    }
  }
  return adminUserService.resendAdminInvite(admin.id);
}

export async function resendInvite(userId: string): Promise<{ sent: boolean; error?: string }> {
  const user = await tenantRepo.getUserById(userId);
  if (!user) return { sent: false, error: 'User not found' };
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await tenantRepo.setUserInvitePassword(userId, passwordHash);
  const loginUrl = `${config.appUrl.replace(/\/$/, '')}/login`;
  const emailResult = await emailService.sendInviteEmail(user.email, user.name, tempPassword, loginUrl);
  console.log('[invite] Resend:', { userId, email: user.email, sent: emailResult.sent, error: emailResult.error });
  await mailerliteService.syncSubscriber(user.email, user.name);
  return { sent: emailResult.sent, error: emailResult.error };
}

export function getUserById(id: string) {
  return tenantRepo.getUserById(id);
}

export function getUserSessions(userId: string) {
  return tenantRepo.getUserSessions(userId);
}
