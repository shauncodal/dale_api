import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../lib/config';
import { loginBodySchema, tenantLoginBodySchema, liteLoginBodySchema, changePasswordBodySchema } from '../lib/schemas';

async function getAdminPermissions(admin: { roleId: string | null }): Promise<string[]> {
  if (!admin.roleId) {
    const allPerms = await prisma.permission.findMany({ select: { code: true } });
    return allPerms.map((p) => p.code);
  }
  const role = await prisma.role.findUnique({
    where: { id: admin.roleId },
    include: {
      permissions: { include: { permission: { select: { code: true } } } },
    },
  });
  if (!role) return [];
  return role.permissions.map((rp) => rp.permission.code);
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const admin = await prisma.adminUser.findUnique({
    where: { email },
    include: { role: { select: { name: true } } },
  });
  if (!admin) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const permissions = await getAdminPermissions(admin);
  const roleName = admin.role?.name ?? 'super_admin';
  const payload = {
    sub: admin.id,
    email: admin.email,
    role: roleName,
    permissions,
    tenantId: admin.tenantId ?? undefined,
    mustChangePassword: admin.mustChangePassword,
    aud: 'admin',
  };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
  res.status(200).json({
    token,
    mustChangePassword: admin.mustChangePassword,
    user: {
      email: admin.email,
      role: roleName,
      permissions,
      tenantId: admin.tenantId ?? undefined,
    },
  });
}

export async function tenantLogin(req: Request, res: Response): Promise<void> {
  const parsed = tenantLoginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const { email, password, tenantDomain, tenantId } = parsed.data;
  let tenant: { id: string } | null = null;
  if (tenantId) {
    tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  } else if (tenantDomain) {
    tenant = await prisma.tenant.findFirst({ where: { domain: tenantDomain }, select: { id: true } });
  }
  if (!tenant) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const token = jwt.sign(
    { sub: user.id, tenantId: user.tenantId, groupId: user.groupId, email: user.email, mustChangePassword: user.mustChangePassword, aud: 'tenant' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  res.status(200).json({ token, mustChangePassword: user.mustChangePassword, tenantId: user.tenantId, groupId: user.groupId });
}

export async function liteLogin(req: Request, res: Response): Promise<void> {
  const parsed = liteLoginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const users = await prisma.user.findMany({
    where: { email },
    include: { tenant: true },
  });
  if (users.length === 0) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (users.length > 1) {
    res.status(400).json({ error: 'Multiple accounts found; contact your administrator' });
    return;
  }
  const user = users[0];
  if (!user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const token = jwt.sign(
    { sub: user.id, tenantId: user.tenantId, groupId: user.groupId, email: user.email, mustChangePassword: user.mustChangePassword, aud: 'tenant' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  res.status(200).json({ token, mustChangePassword: user.mustChangePassword, tenantId: user.tenantId, groupId: user.groupId });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const parsed = changePasswordBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const auth = (req as Request & { tenantUser: { id: string } }).tenantUser;
  const user = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (parsed.data.consentVersion !== config.consentDocumentVersion) {
    res.status(400).json({ error: 'Consent version mismatch. Refresh the page and try again.' });
    return;
  }
  const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!match) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }
  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  const now = new Date();
  await prisma.user.update({
    where: { id: auth.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      termsConsentAt: now,
      termsConsentVersion: config.consentDocumentVersion,
    },
  });
  res.status(200).json({ message: 'Password updated' });
}

export async function changePasswordAdmin(req: Request, res: Response): Promise<void> {
  const parsed = changePasswordBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const auth = (req as Request & { auth: { sub: string; aud?: string } }).auth;
  if (auth.aud !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const admin = await prisma.adminUser.findUnique({ where: { id: auth.sub } });
  if (!admin || !admin.passwordHash) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (parsed.data.consentVersion !== config.consentDocumentVersion) {
    res.status(400).json({ error: 'Consent version mismatch. Refresh the page and try again.' });
    return;
  }
  const match = await bcrypt.compare(parsed.data.currentPassword, admin.passwordHash);
  if (!match) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }
  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  const now = new Date();
  await prisma.adminUser.update({
    where: { id: auth.sub },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordChangedAt: now,
      termsConsentAt: now,
      termsConsentVersion: config.consentDocumentVersion,
    },
  });
  res.status(200).json({ message: 'Password updated' });
}
