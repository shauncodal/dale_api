import { Request, Response } from 'express';
import { createLiteSessionBodySchema } from '../lib/schemas';
import * as liteService from '../services/liteService';

export async function getMe(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { tenantUser: { id: string } }).tenantUser;
  const me = await liteService.getMe(id);
  if (!me) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(200).json(me);
}

export async function getSessions(req: Request, res: Response): Promise<void> {
  const { id } = (req as Request & { tenantUser: { id: string } }).tenantUser;
  const sessions = await liteService.getMySessions(id);
  res.status(200).json(sessions);
}

export async function createSession(req: Request, res: Response): Promise<void> {
  const parsed = createLiteSessionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const { id } = (req as Request & { tenantUser: { id: string } }).tenantUser;
  const result = await liteService.createSession(id, parsed.data);
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.status(201).json(result);
}

export async function getAvatars(req: Request, res: Response): Promise<void> {
  const { groupId } = (req as Request & { tenantUser: { groupId: string } }).tenantUser;
  const avatars = await liteService.getAvatarsForGroup(groupId);
  res.status(200).json(avatars);
}
