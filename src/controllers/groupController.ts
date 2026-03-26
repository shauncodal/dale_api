import { Request, Response } from 'express';
import * as groupService from '../services/groupService';
import {
  createGroupBodySchema,
  createUserBodySchema,
  patchGroupBodySchema,
  patchUserBodySchema,
  tenantUsersQuerySchema,
} from '../lib/schemas';
import * as tenantRepo from '../repositories/tenantRepository';

export async function listGroups(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.id;
  const tenant = await tenantRepo.getTenantById(tenantId);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  const data = await groupService.listGroups(tenantId);
  res.json(data);
}

export async function getGroup(req: Request, res: Response): Promise<void> {
  const groupId = req.params.groupId;
  const tenantId = req.params.id;
  const group = await groupService.getGroupById(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.tenantId !== tenantId) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json(group);
}

export async function createGroup(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.id;
  const parsed = createGroupBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const tenant = await tenantRepo.getTenantById(tenantId);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  const group = await groupService.createGroup(tenantId, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    avatarIds: parsed.data.avatarIds,
  });
  res.status(201).json(group);
}

export async function patchGroup(req: Request, res: Response): Promise<void> {
  const groupId = req.params.groupId;
  const tenantId = req.params.id;
  const group = await groupService.getGroupById(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.tenantId !== tenantId) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const parsed = patchGroupBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const updated = await groupService.updateGroup(groupId, parsed.data);
  res.json(updated);
}

export async function deleteGroup(req: Request, res: Response): Promise<void> {
  const groupId = req.params.groupId;
  const tenantId = req.params.id;
  const group = await groupService.getGroupById(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.tenantId !== tenantId) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const result = await groupService.deleteGroup(groupId);
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.status(204).send();
}

export async function getGroupUsers(req: Request, res: Response): Promise<void> {
  const groupId = req.params.groupId;
  const tenantId = req.params.id;
  const group = await groupService.getGroupById(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.tenantId !== tenantId) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const parsed = tenantUsersQuerySchema.safeParse(req.query);
  const statusFilter = parsed.success ? parsed.data.status : 'all';
  const data = await groupService.getGroupUsers(groupId, statusFilter);
  res.json(data);
}

export async function createGroupUser(req: Request, res: Response): Promise<void> {
  const groupId = req.params.groupId;
  const parsed = createUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  try {
    const out = await groupService.createGroupUser(groupId, {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      status: parsed.data.status,
      minutesQuotaTotal: parsed.data.minutesQuotaTotal ?? null,
    });
    if (out.conflict) {
      res.status(400).json({ error: 'User with this email already exists in the group' });
      return;
    }
    const { passwordHash: _, ...userSafe } = out.user as typeof out.user & { passwordHash?: string };
    const body: Record<string, unknown> = { ...userSafe };
    if (out.inviteEmailSent !== undefined) body.inviteEmailSent = out.inviteEmailSent;
    if (out.inviteEmailSent === false) body.warning = 'User created; invite email could not be sent';
    res.status(201).json(body);
  } catch {
    res.status(404).json({ error: 'Group not found' });
  }
}

export async function importGroupUsers(req: Request, res: Response): Promise<void> {
  const groupId = req.params.groupId;
  const group = await groupService.getGroupById(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const file = req.file as Express.Multer.File | undefined;
  if (!file || !file.buffer) {
    res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    return;
  }
  const text = file.buffer.toString('utf8').trim();
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    res.status(400).json({ error: 'CSV must have a header row and at least one data row.' });
    return;
  }
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const nameIdx = header.indexOf('name');
  const emailIdx = header.indexOf('email');
  const roleIdx = header.indexOf('role');
  if (nameIdx === -1 || emailIdx === -1) {
    res.status(400).json({ error: 'CSV must include "name" and "email" columns.' });
    return;
  }
  const rows: Array<{ name: string; email: string; role?: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const name = cells[nameIdx] ?? '';
    const email = cells[emailIdx] ?? '';
    const role = roleIdx >= 0 ? cells[roleIdx] : undefined;
    rows.push({ name, email, role });
  }
  const sendInvite = req.query.sendInvite !== 'false';
  const result = await groupService.importGroupUsers(groupId, rows, { sendInvite });
  res.json(result);
}
