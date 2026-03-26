import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

function decimalToNumber(v: Prisma.Decimal | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'object' && 'toNumber' in v ? (v as { toNumber(): number }).toNumber() : Number(v);
}

export async function listInvoicesByTenant(tenantId: string) {
  const invoices = await prisma.tenantInvoice.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  return invoices.map((inv) => ({
    id: inv.id,
    tenantId: inv.tenantId,
    users: inv.users,
    months: inv.months,
    minutesPerMonthPerUser: inv.minutesPerMonthPerUser,
    pricePerMonthPerUser: decimalToNumber(inv.pricePerMonthPerUser),
    minutesTotal: inv.minutesTotal,
    amountDollars: decimalToNumber(inv.amountDollars),
    createdAt: inv.createdAt.toISOString(),
  }));
}

export async function createInvoice(
  tenantId: string,
  data: { users: number; months: number; minutesPerMonthPerUser: number; pricePerMonthPerUser: number }
) {
  const minutesTotal = data.users * data.months * data.minutesPerMonthPerUser;
  const amountDollars = data.users * data.months * data.pricePerMonthPerUser;
  /** Per-calendar-month pool for Custom tenants (minutesTotal / months when months >= 1). */
  const monthlyPoolIncrement = data.users * data.minutesPerMonthPerUser;

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { minutesPurchased: { increment: monthlyPoolIncrement } },
    });
    await tx.tenantInvoice.create({
      data: {
        tenantId,
        users: data.users,
        months: data.months,
        minutesPerMonthPerUser: data.minutesPerMonthPerUser,
        pricePerMonthPerUser: data.pricePerMonthPerUser,
        minutesTotal,
        amountDollars,
      },
    });
  });

  const invoices = await listInvoicesByTenant(tenantId);
  return invoices[0]!;
}
