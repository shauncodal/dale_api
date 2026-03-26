import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export default async function teardown() {
  if (!process.env.DATABASE_URL) return;

  const prisma = new PrismaClient();

  try {
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.liveAvatarConfig.deleteMany({});
    await prisma.coachingAvatar.deleteMany({});
    console.log('Test data cleared: tenants, users, avatars');
  } finally {
    await prisma.$disconnect();
  }
}
