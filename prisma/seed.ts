import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: 'overview:read', description: 'Global KPIs, usage, etc.' },
  { code: 'overview:read_own_tenant', description: 'Tenant stats + balance' },
  { code: 'tenants:list', description: 'List all tenants' },
  { code: 'tenants:read', description: 'Get tenant by ID' },
  { code: 'tenants:create', description: 'Create tenant' },
  { code: 'tenants:patch', description: 'Edit tenant setup' },
  { code: 'tenants:groups:*', description: 'Groups CRUD' },
  { code: 'tenants:users:*', description: 'Users CRUD' },
  { code: 'avatars:list', description: 'List avatars' },
  { code: 'avatars:read', description: 'Get avatar by ID' },
  { code: 'avatars:create', description: 'Create avatar' },
  { code: 'avatars:patch', description: 'Edit avatar' },
  { code: 'avatars:delete', description: 'Delete avatar' },
  { code: 'settings:read', description: 'Read cost management' },
  { code: 'settings:patch', description: 'Edit cost management' },
  { code: 'admin_users:list', description: 'List admin users' },
  { code: 'admin_users:create', description: 'Create admin user' },
  { code: 'admin_users:patch', description: 'Edit admin user roles' },
] as const;

async function main() {
  // 1. Create permissions
  const permissionIds: Record<string, string> = {};
  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      create: { code: p.code, description: p.description },
      update: { description: p.description },
    });
    permissionIds[p.code] = perm.id;
  }

  // 2. Create roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    create: {
      name: 'super_admin',
      description: 'Full platform access',
      isSystem: true,
    },
    update: { description: 'Full platform access' },
  });

  const tenantRole = await prisma.role.upsert({
    where: { name: 'tenant' },
    create: {
      name: 'tenant',
      description: 'Tenant admin - own stats, groups, users, reports only',
      isSystem: true,
    },
    update: { description: 'Tenant admin - own stats, groups, users, reports only' },
  });

  // 3. Assign permissions to super_admin (all)
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: Object.values(permissionIds).map((permissionId) => ({
      roleId: superAdminRole.id,
      permissionId,
    })),
  });

  // 4. Assign permissions to tenant (limited)
  const tenantPermissionCodes = [
    'overview:read_own_tenant',
    'tenants:read',
    'tenants:groups:*',
    'tenants:users:*',
    'avatars:list',
    'avatars:read',
  ];
  await prisma.rolePermission.deleteMany({ where: { roleId: tenantRole.id } });
  await prisma.rolePermission.createMany({
    data: tenantPermissionCodes.map((code) => ({
      roleId: tenantRole.id,
      permissionId: permissionIds[code]!,
    })),
  });

  // 5. Clear tenantId on admin users before deleting tenants (FK constraint)
  await prisma.adminUser.updateMany({ data: { tenantId: null } });

  // 6. Clear tenant data so re-running seed gives empty tenants
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.liveAvatarConfig.deleteMany({});
  await prisma.coachingAvatar.deleteMany({});

  // 7. Backfill existing AdminUser with super_admin role
  await prisma.adminUser.updateMany({
    where: { roleId: null },
    data: { roleId: superAdminRole.id },
  });

  // 8. Upsert default admin user
  const adminPassword = process.env.LITE_ADMIN_PASSWORD;
  const adminEmail = process.env.LITE_ADMIN_EMAIL ?? 'liteadmin@example.com';

  if (adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        passwordHash,
        roleId: superAdminRole.id,
      },
      update: { passwordHash, roleId: superAdminRole.id },
    });
    console.log('Admin user upserted:', adminEmail);
  }

  // 9. Ensure PlatformSettings has a default row
  const existing = await prisma.platformSettings.findFirst();
  if (!existing) {
    await prisma.platformSettings.create({
      data: {
        costPer30MinAvatarDollars: 0,
        infrastructureCostDollars: 0,
      },
    });
    console.log('PlatformSettings default row created.');
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
