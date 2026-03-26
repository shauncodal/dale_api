import { describe, it, expect, beforeAll } from 'vitest';
import { getAuthToken, auth } from './helpers';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('Groups endpoints', () => {
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    token = await getAuthToken();
    const createRes = await auth(token)
      .post('/api/tenants')
      .send({
        name: 'Groups Test Tenant',
        domain: 'groups-test.example.com',
        contactEmail: 'g@groups-test.example.com',
        plan: 'Starter',
        status: 'Active',
        minutesPerUserPerMonth: 60,
      });
    if (createRes.status === 201) {
      tenantId = createRes.body.id;
    }
  });

  it('GET /api/tenants/:id/groups returns 200 and array with engagement fields', async () => {
    if (!tenantId) return;
    const res = await auth(token).get(`/api/tenants/${tenantId}/groups`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const group = res.body[0];
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('title');
      expect(group).toHaveProperty('userCount');
      expect(group).toHaveProperty('sessions');
      expect(group).toHaveProperty('minutesUsed');
      expect(group).toHaveProperty('avgScore');
    }
  });

  it('POST /api/tenants/:id/groups creates group', async () => {
    if (!tenantId) return;
    const res = await auth(token)
      .post(`/api/tenants/${tenantId}/groups`)
      .send({ title: 'Sales Team', description: 'Sales group' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Sales Team');
    expect(res.body.description).toBe('Sales group');
  });

  it('PATCH /api/tenants/:id/groups/:groupId updates group', async () => {
    if (!tenantId) return;
    const listRes = await auth(token).get(`/api/tenants/${tenantId}/groups`);
    if (listRes.status !== 200 || listRes.body.length === 0) return;
    const groupId = listRes.body[0].id;
    const res = await auth(token)
      .patch(`/api/tenants/${tenantId}/groups/${groupId}`)
      .send({ title: 'Sales Team Updated', description: 'Updated description' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Sales Team Updated');
    expect(res.body.description).toBe('Updated description');
  });

  it('DELETE /api/tenants/:id/groups/:groupId returns 400 when group has users', async () => {
    if (!tenantId) return;
    const listRes = await auth(token).get(`/api/tenants/${tenantId}/groups`);
    if (listRes.status !== 200 || listRes.body.length === 0) return;
    const groupWithUsers = listRes.body.find((g: { userCount: number }) => g.userCount > 0);
    if (!groupWithUsers) return;
    const res = await auth(token).delete(
      `/api/tenants/${tenantId}/groups/${groupWithUsers.id}`
    );
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('DELETE /api/tenants/:id/groups/:groupId deletes empty group', async () => {
    if (!tenantId) return;
    const createRes = await auth(token)
      .post(`/api/tenants/${tenantId}/groups`)
      .send({ title: 'Empty Group To Delete', description: null });
    if (createRes.status !== 201) return;
    const groupId = createRes.body.id;
    const res = await auth(token).delete(
      `/api/tenants/${tenantId}/groups/${groupId}`
    );
    expect(res.status).toBe(204);
  });

  it('GET /api/tenants/:id/groups/:groupId/users returns 200 and array', async () => {
    if (!tenantId) return;
    const listRes = await auth(token).get(`/api/tenants/${tenantId}/groups`);
    if (listRes.status !== 200 || listRes.body.length === 0) return;
    const groupId = listRes.body[0].id;
    const res = await auth(token).get(
      `/api/tenants/${tenantId}/groups/${groupId}/users`
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/tenants/:id/groups/:groupId returns 404 for unknown group', async () => {
    if (!tenantId) return;
    const res = await auth(token).get(
      `/api/tenants/${tenantId}/groups/nonexistent-group-id-999`
    );
    expect(res.status).toBe(404);
  });
});
