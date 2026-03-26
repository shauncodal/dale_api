import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { getAuthToken, auth } from './helpers';
import app from '../src/app';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('CSV import users', () => {
  let token: string;
  let tenantId: string;
  let groupId: string;

  beforeAll(async () => {
    token = await getAuthToken();
    const createRes = await auth(token)
      .post('/api/tenants')
      .send({
        name: 'Import Test Tenant',
        domain: 'import-test.example.com',
        contactEmail: 'i@import-test.example.com',
        plan: 'Growth',
        status: 'Active',
        minutesPerUserPerMonth: 60,
      });
    if (createRes.status === 201) {
      tenantId = createRes.body.id;
      const groupsRes = await auth(token).get(`/api/tenants/${tenantId}/groups`);
      if (groupsRes.status === 200 && groupsRes.body?.length > 0) {
        groupId = groupsRes.body[0].id;
      }
    }
  });

  it('POST /api/tenants/:id/groups/:groupId/users/import returns 200 with created/failed when CSV valid', async () => {
    if (!tenantId || !groupId) return;
    const csv = 'name,email,role\nAlice,alice@import-test.example.com,AE\nBob,bob@import-test.example.com,SER';
    const res = await request(app)
      .post(`/api/tenants/${tenantId}/groups/${groupId}/users/import`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), 'users.csv');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('created');
    expect(res.body).toHaveProperty('failed');
    expect(res.body).toHaveProperty('errors');
    expect(res.body.created).toBe(2);
    expect(res.body.failed).toBe(0);
  });

  it('POST /api/tenants/:id/groups/:groupId/users/import returns failed for duplicate email in CSV', async () => {
    if (!tenantId || !groupId) return;
    const csv = 'name,email,role\nAlice,alice@import-test.example.com,AE';
    const res = await request(app)
      .post(`/api/tenants/${tenantId}/groups/${groupId}/users/import`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), 'users.csv');
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(0);
    expect(res.body.failed).toBe(1);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0].message).toContain('Duplicate');
  });

  it('POST /api/tenants/:id/groups/:groupId/users/import returns 400 when no file', async () => {
    if (!tenantId || !groupId) return;
    const res = await request(app)
      .post(`/api/tenants/${tenantId}/groups/${groupId}/users/import`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
