import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

function decimalToNumber(v: Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'object' && 'toNumber' in v ? (v as { toNumber(): number }).toNumber() : Number(v);
}

export async function getSettings(): Promise<{
  costPer30MinAvatarDollars: number;
  infrastructureCostDollars: number;
  costPerMinuteDollars: number | null;
}> {
  let row = await prisma.platformSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!row) {
    row = await prisma.platformSettings.create({
      data: {
        costPer30MinAvatarDollars: 0,
        infrastructureCostDollars: 0,
      },
    });
  }
  return {
    costPer30MinAvatarDollars: decimalToNumber(row.costPer30MinAvatarDollars),
    infrastructureCostDollars: decimalToNumber(row.infrastructureCostDollars),
    costPerMinuteDollars: row.costPerMinuteDollars != null ? decimalToNumber(row.costPerMinuteDollars) : null,
  };
}

export async function updateSettings(data: {
  costPer30MinAvatarDollars?: number;
  infrastructureCostDollars?: number;
  costPerMinuteDollars?: number | null;
}): Promise<{ costPer30MinAvatarDollars: number; infrastructureCostDollars: number; costPerMinuteDollars: number | null }> {
  let row = await prisma.platformSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!row) {
    row = await prisma.platformSettings.create({
      data: {
        costPer30MinAvatarDollars: data.costPer30MinAvatarDollars ?? 0,
        infrastructureCostDollars: data.infrastructureCostDollars ?? 0,
        costPerMinuteDollars: data.costPerMinuteDollars ?? undefined,
      },
    });
  } else {
    row = await prisma.platformSettings.update({
      where: { id: row.id },
      data: {
        ...(data.costPer30MinAvatarDollars !== undefined && { costPer30MinAvatarDollars: data.costPer30MinAvatarDollars }),
        ...(data.infrastructureCostDollars !== undefined && { infrastructureCostDollars: data.infrastructureCostDollars }),
        ...(data.costPerMinuteDollars !== undefined && { costPerMinuteDollars: data.costPerMinuteDollars }),
      },
    });
  }
  return {
    costPer30MinAvatarDollars: decimalToNumber(row.costPer30MinAvatarDollars),
    infrastructureCostDollars: decimalToNumber(row.infrastructureCostDollars),
    costPerMinuteDollars: row.costPerMinuteDollars != null ? decimalToNumber(row.costPerMinuteDollars) : null,
  };
}
