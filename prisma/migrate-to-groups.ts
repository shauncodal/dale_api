/**
 * Data migration: Create default group per tenant, migrate TenantAvatar to GroupAvatar,
 * assign all users to their tenant's default group.
 *
 * Run after applying the add_groups_and_group_avatars migration:
 *   npx ts-node prisma/migrate-to-groups.ts
 *   # or: npx tsx prisma/migrate-to-groups.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ include: { tenantAvatars: true, users: true } });

  for (const tenant of tenants) {
    // Create default group for this tenant
    const group = await prisma.group.create({
      data: {
        tenantId: tenant.id,
        title: 'Default',
        description: 'Default group (migrated from tenant)',
      },
    });

    // Migrate TenantAvatar to GroupAvatar
    for (const ta of tenant.tenantAvatars) {
      await prisma.groupAvatar.upsert({
        where: { groupId_avatarId: { groupId: group.id, avatarId: ta.avatarId } },
        create: { groupId: group.id, avatarId: ta.avatarId },
        update: {},
      });
    }

    // Assign all users to the default group
    for (const user of tenant.users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { groupId: group.id },
      });
    }

    console.log(`Migrated tenant ${tenant.name}: group "${group.title}", ${tenant.tenantAvatars.length} avatars, ${tenant.users.length} users`);
  }

  console.log('Data migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
