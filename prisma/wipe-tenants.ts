/**
 * Remove all tenants and related data (invoices, users, groups, sessions, recordings).
 * Keeps: CoachingAvatar, LiveAvatarConfig, platform AdminUsers, Roles, Permissions, PlatformSettings.
 *
 * Run: npx ts-node prisma/wipe-tenants.ts
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Unlink platform admins from tenants so they're not cascade-deleted
  const unlinked = await prisma.adminUser.updateMany({
    where: { tenantId: { not: null } },
    data: { tenantId: null },
  });
  console.log('[wipe-tenants] Unlinked', unlinked.count, 'tenant admin(s) from tenants (kept as platform admins)');

  // Delete in dependency order to satisfy FK constraints
  // (DB cascade may handle this, but explicit order is safer across engines)

  const recCount = await prisma.recording.count();
  await prisma.recording.deleteMany({});
  console.log('[wipe-tenants] Deleted', recCount, 'recording(s)');

  const sessCount = await prisma.session.count();
  await prisma.session.deleteMany({});
  console.log('[wipe-tenants] Deleted', sessCount, 'session(s)');

  const userCount = await prisma.user.count();
  await prisma.user.deleteMany({});
  console.log('[wipe-tenants] Deleted', userCount, 'user(s)');

  const gaCount = await prisma.groupAvatar.count();
  await prisma.groupAvatar.deleteMany({});
  console.log('[wipe-tenants] Deleted', gaCount, 'groupAvatar link(s)');

  const groupCount = await prisma.group.count();
  await prisma.group.deleteMany({});
  console.log('[wipe-tenants] Deleted', groupCount, 'group(s)');

  const invCount = await prisma.tenantInvoice.count();
  await prisma.tenantInvoice.deleteMany({});
  console.log('[wipe-tenants] Deleted', invCount, 'tenant invoice(s)');

  const tenantCount = await prisma.tenant.deleteMany({});
  console.log('[wipe-tenants] Deleted', tenantCount.count, 'tenant(s)');

  const avatarCount = await prisma.coachingAvatar.count();
  console.log('[wipe-tenants] Kept', avatarCount, 'CoachingAvatar(s)');

  console.log('[wipe-tenants] Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
