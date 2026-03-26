import { prisma } from '../lib/prisma';

export async function listAdminUsers() {
  const users = await prisma.adminUser.findMany({
    include: {
      role: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    roleId: u.roleId,
    roleName: u.role?.name,
    tenantId: u.tenantId,
    tenantName: u.tenant?.name,
    mustChangePassword: u.mustChangePassword,
    termsConsentAt: u.termsConsentAt?.toISOString() ?? null,
    termsConsentVersion: u.termsConsentVersion ?? null,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getAdminUserById(id: string) {
  return prisma.adminUser.findUnique({
    where: { id },
    include: {
      role: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
  });
}

export async function getAdminUserByEmail(email: string) {
  return prisma.adminUser.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function createAdminUser(data: {
  email: string;
  passwordHash: string;
  roleId: string;
  tenantId?: string | null;
  mustChangePassword?: boolean;
}) {
  return prisma.adminUser.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      roleId: data.roleId,
      tenantId: data.tenantId ?? undefined,
      mustChangePassword: data.mustChangePassword ?? false,
    },
    include: {
      role: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
  });
}

export async function updateAdminUser(
  id: string,
  data: { roleId?: string; tenantId?: string | null }
) {
  return prisma.adminUser.update({
    where: { id },
    data: {
      ...(data.roleId !== undefined && { roleId: data.roleId }),
      ...(data.tenantId !== undefined && { tenantId: data.tenantId }),
    },
    include: {
      role: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
  });
}

export async function updateAdminUserPassword(id: string, passwordHash: string) {
  return prisma.adminUser.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });
}
