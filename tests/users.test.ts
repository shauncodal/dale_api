import { describe, it, expect, beforeAll } from 'vitest';
import { getAuthToken, auth } from './helpers';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('Users endpoints', () => {
  let token: string;
  let tenantId: string;
  let groupId: string;

  beforeAll(async () => {
    token = await getAuthToken();
    const createRes = await auth(token)
      .post('/api/tenants')
      .send({
        name: 'User Test Tenant',
        domain: 'user-test.example.com',
        contactEmail: 'u@user-test.example.com',
        plan: 'Starter',
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

  it('POST /api/tenants/:id/groups/:groupId/users returns 201 with created user', async () => {
    if (!tenantId || !groupId) return;
    const res = await auth(token)
      .post(`/api/tenants/${tenantId}/groups/${groupId}/users`)
      .send({
        name: 'Jane Doe',
        email: 'jane@user-test.example.com',
        role: 'AE',
        status: 'active',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Jane Doe');
    expect(res.body.email).toBe('jane@user-test.example.com');
    expect(res.body.tenantId).toBe(tenantId);
    expect(res.body.groupId).toBe(groupId);
  });

  it('POST /api/tenants/:id/groups/:groupId/users returns 400 when email already exists in group', async () => {
    if (!tenantId || !groupId) return;
    const res = await auth(token)
      .post(`/api/tenants/${tenantId}/groups/${groupId}/users`)
      .send({
        name: 'Jane Again',
        email: 'jane@user-test.example.com',
        role: 'SER',
        status: 'active',
      });
    expect(res.status).toBe(400);
  });

  it('GET /api/tenants/:id/users returns 200 and array', async () => {
    if (!tenantId) return;
    const res = await auth(token).get(`/api/tenants/${tenantId}/users`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PATCH /api/users/:id returns 200 and can set status to archived', async () => {
    if (!tenantId) return;
    const listRes = await auth(token).get(`/api/tenants/${tenantId}/users`);
    expect(listRes.status).toBe(200);
    const user = listRes.body?.find((u: { email: string }) => u.email === 'jane@user-test.example.com');
    if (!user) return;
    const res = await auth(token)
      .patch(`/api/users/${user.id}`)
      .send({ status: 'archived' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('archived');
  });

  it('PATCH /api/users/:id returns 404 for unknown id', async () => {
    const res = await auth(token)
      .patch('/api/users/nonexistent-user-id-999')
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});
