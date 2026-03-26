import { Request, Response } from 'express';
import * as avatarService from '../services/avatarService';
import { createAvatarBodySchema, patchAvatarBodySchema, patchLiveConfigBodySchema } from '../lib/schemas';

export async function listAvatars(_req: Request, res: Response): Promise<void> {
  const data = await avatarService.listAvatars();
  res.json(data);
}

export async function getAvatar(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const data = await avatarService.getAvatarById(id);
  if (!data) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  res.json(data);
}

export async function createAvatar(req: Request, res: Response): Promise<void> {
  const parsed = createAvatarBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const { liveAvatarConfig, ...rest } = parsed.data;
  const avatar = await avatarService.createAvatar({
    ...rest,
    img: rest.img,
    liveAvatarConfig,
  });
  res.status(201).json(avatar);
}

export async function patchAvatar(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const parsed = patchAvatarBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const existing = await avatarService.getAvatarById(id);
  if (!existing) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  const data = await avatarService.updateAvatar(id, parsed.data);
  res.json(data);
}

export async function patchLiveConfig(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const parsed = patchLiveConfigBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const existing = await avatarService.getAvatarById(id);
  if (!existing) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  const data = await avatarService.upsertLiveConfig(id, parsed.data);
  res.json(data);
}

export async function deleteAvatar(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const existing = await avatarService.getAvatarById(id);
  if (!existing) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  await avatarService.deleteAvatar(id);
  res.status(204).send();
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    return;
  }
  const url = `/uploads/avatars/${file.filename}`;
  res.status(200).json({ url });
}
