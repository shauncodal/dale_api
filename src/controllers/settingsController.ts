import { Request, Response } from 'express';
import * as platformSettingsRepo from '../repositories/platformSettingsRepository';
import { patchPlatformSettingsBodySchema } from '../lib/schemas';

export async function getCostManagement(_req: Request, res: Response): Promise<void> {
  const data = await platformSettingsRepo.getSettings();
  res.json(data);
}

export async function patchCostManagement(req: Request, res: Response): Promise<void> {
  const parsed = patchPlatformSettingsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const data = await platformSettingsRepo.updateSettings(parsed.data);
  res.json(data);
}
