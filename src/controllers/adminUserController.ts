import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import * as adminUserService from '../services/adminUserService';
import { createAdminUserBodySchema, patchAdminUserBodySchema } from '../lib/schemas';

export async function listRoles(_req: Request, res: Response): Promise<void> {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true },
  });
  res.json(roles);
}

export async function listAdminUsers(_req: Request, res: Response): Promise<void> {
  const data = await adminUserService.listAdminUsers();
  res.json(data);
}

export async function createAdminUser(req: Request, res: Response): Promise<void> {
  const parsed = createAdminUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const result = await adminUserService.createAdminUser({
    email: parsed.data.email,
    roleId: parsed.data.roleId,
    tenantId: parsed.data.tenantId ?? undefined,
  });
  const err = 'error' in result ? result.error : null;
  if (err) {
    res.status(err === 'Email already in use' ? 409 : 400).json({ error: err });
    return;
  }
  res.status(201).json({
    ...result.adminUser,
    inviteEmailSent: result.inviteEmailSent,
    inviteError: result.inviteError,
  });
}

export async function patchAdminUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const parsed = patchAdminUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const result = await adminUserService.patchAdminUser(id, parsed.data);
  if ('error' in result && result.error) {
    res.status(404).json({ error: result.error });
    return;
  }
  res.json(result.adminUser);
}

export async function resendInvite(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const result = await adminUserService.resendAdminInvite(id);
  const adminEmail = (req as Request & { auth?: { email?: string } }).auth?.email;
  console.log('[invite] Resend admin-invite request:', { adminUserId: id, adminEmail, sent: result.sent, error: result.error });
  res.json({ sent: result.sent, error: result.error });
}
