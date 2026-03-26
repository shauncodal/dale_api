import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import app from '../src/app';

const hasDb = !!process.env.DATABASE_URL;
const prisma = new PrismaClient();

const TEST_EMAIL = 'lite-test-user@example.com';
const TEST_PASSWORD = 'LiteTestPass1!';
const MINUTES_QUOTA = 30;

async function createTenantUserAvatarAndToken(): Promise<{
  token: string;
  userId: string;
  tenantId: string;
  groupId: string;
  avatarId: string;
}> {
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Lite Test Tenant',
      domain: 'lite-test.example.com',
      contactEmail: 'admin@lite-test.example.com',
      plan: 'Starter',
      status: 'Active',
      minutesQuotaPerUserPerMonth: MINUTES_QUOTA,
    },
  });
  const group = await prisma.group.create({
    data: {
      tenantId: tenant.id,
      title: 'Test Group',
      description: 'For lite tests',
    },
  });
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      groupId: group.id,
      name: 'Lite Test User',
      email: TEST_EMAIL,
      role: 'User',
      status: 'active',
      passwordHash,
      mustChangePassword: false,
      minutesQuotaTotal: MINUTES_QUOTA,
    },
  });
  const avatar = await prisma.coachingAvatar.create({
    data: {
      name: 'Test Coach',
      title: 'Test Coach',
      rating: 4.5,
      sessions: 0,
      tags: ['test'],
      creditRate: 1,
    },
  });
  await prisma.groupAvatar.create({
    data: { groupId: group.id, avatarId: avatar.id },
  });
  await prisma.liveAvatarConfig.create({
    data: {
      coachId: avatar.id,
      avatarId: 'test-live-avatar-id',
    },
  });

  const res = await request(app)
    .post('/api/auth/lite-login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Lite login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.token,
    userId: user.id,
    tenantId: tenant.id,
    groupId: group.id,
    avatarId: avatar.id,
  };
}

async function cleanupLiteTestData(): Promise<void> {
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({}); // cascades to Group, GroupAvatar
  await prisma.liveAvatarConfig.deleteMany({});
  await prisma.coachingAvatar.deleteMany({});
}

describe.skipIf(!hasDb)('Lite API', () => {
  let token: string;
  let avatarId: string;

  beforeAll(async () => {
    await cleanupLiteTestData();
    const fixture = await createTenantUserAvatarAndToken();
    token = fixture.token;
    avatarId = fixture.avatarId;
  });

  afterAll(async () => {
    await cleanupLiteTestData();
    await prisma.$disconnect();
  });

  describe('GET /api/lite/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/lite/me');
      expect(res.status).toBe(401);
    });

    it('returns minutesQuotaTotal and usedMinutesThisMonth', async () => {
      const res = await request(app)
        .get('/api/lite/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('minutesQuotaTotal', MINUTES_QUOTA);
      expect(res.body).toHaveProperty('usedMinutesThisMonth');
      expect(typeof res.body.usedMinutesThisMonth).toBe('number');
      expect(res.body.usedMinutesThisMonth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /api/lite/sessions', () => {
    it('returns 400 when durationSeconds is missing', async () => {
      const res = await request(app)
        .post('/api/lite/sessions')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send({
          coachId: avatarId,
          sessionName: 'Test Session',
        });
      expect(res.status).toBe(400);
    });

    it('creates session with durationSeconds and returns 201', async () => {
      const res = await request(app)
        .post('/api/lite/sessions')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send({
          coachId: avatarId,
          sessionName: 'Test Session 1',
          durationSeconds: 125, // 2 min 5 sec -> 3 min when ceiled
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('durationSecs', 125);
      expect(res.body).toHaveProperty('credits', 3); // ceil(125/60)
    });

    it('returns 400 when quota exceeded', async () => {
      // User has 30 min quota. One 3-min session was created. Create enough to exceed.
      // 30 - 3 = 27 min left. Create 28 min (e.g. 28 * 60 + 1 = 1681 seconds)
      const res = await request(app)
        .post('/api/lite/sessions')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send({
          coachId: avatarId,
          sessionName: 'Oversize Session',
          durationSeconds: 28 * 60 + 1, // 28+ min
        });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Quota exceeded');
    });

    it('increments CoachingAvatar.sessions', async () => {
      const avatarBefore = await prisma.coachingAvatar.findUnique({
        where: { id: avatarId },
        select: { sessions: true },
      });
      const sessionsBefore = avatarBefore?.sessions ?? 0;

      await request(app)
        .post('/api/lite/sessions')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send({
          coachId: avatarId,
          sessionName: 'Session for avatar increment',
          durationSeconds: 90,
        });

      const avatarAfter = await prisma.coachingAvatar.findUnique({
        where: { id: avatarId },
        select: { sessions: true },
      });
      expect(avatarAfter?.sessions).toBe(sessionsBefore + 1);
    });
  });
});
