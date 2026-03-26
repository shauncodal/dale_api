import { Request, Response } from 'express';
import * as financeRepo from '../repositories/financeRepository';

export async function getFinanceSummary(_req: Request, res: Response): Promise<void> {
  const data = await financeRepo.getFinanceSummary();
  res.json(data);
}
