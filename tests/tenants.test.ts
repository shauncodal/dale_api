import { describe, it, expect, beforeAll } from 'vitest';
import { getAuthToken, auth } from './helpers';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('Tenants endpoints', () => {
  let token: string;
  let tenantId: string;

  beforeAll(async () => {
    token = await getAuthToken();
    const listRes = await auth(token).get('/api/tenants');
    if (listRes.body?.length > 0) tenantId = listRes.body[0].id;
  });

  it('GET /api/tenants returns 200 and array', async () => {
    const res = await auth(token).get('/api/tenants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/tenants?search= returns 200', async () => {
    const res = await auth(token).get('/api/tenants?search=');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/tenants?plan=Starter returns 200', async () => {
    const res = await auth(token).get('/api/tenants?plan=Starter');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/tenants/:id returns 200 with tenant detail when found', async () => {
    if (!tenantId) return;
    const res = await auth(token).get(`/api/tenants/${tenantId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', tenantId);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('domain');
  });

  it('GET /api/tenants/:id returns 404 for unknown id', async () => {
    const res = await auth(token).get('/api/tenants/nonexistent-id-12345');
    expect(res.status).toBe(404);
  });

  it('GET /api/tenants/:id/users returns 200 and array', async () => {
    if (!tenantId) return;
    const res = await auth(token).get(`/api/tenants/${tenantId}/users`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/tenants returns 201 with created tenant when body valid', async () => {
    const res = await auth(token)
      .post('/api/tenants')
      .send({
        name: 'Test Tenant',
        domain: 'test-tenant.example.com',
        contactEmail: 'contact@test-tenant.example.com',
        plan: 'Starter',
        status: 'Active',
        minutesPerUserPerMonth: 60,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Tenant');
    expect(res.body.domain).toBe('test-tenant.example.com');
  });

  it('POST /api/tenants returns 400 when body invalid', async () => {
    const res = await auth(token).post('/api/tenants').send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('POST /api/tenants accepts pricePerUserPerMonthDollars and returns tenant without auto-created groups', async () => {
    const res = await auth(token)
      .post('/api/tenants')
      .send({
        name: 'Tenant With Price',
        domain: 'price.example.com',
        contactEmail: 'p@price.example.com',
        plan: 'Growth',
        status: 'Trial',
        minutesPerUserPerMonth: 30,
        pricePerUserPerMonthDollars: 19.99,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.pricePerUserPerMonthDollars).toBe(19.99);
    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body.groups.length).toBe(0);
  });

  it('PATCH /api/tenants/:id returns 200 with updated tenant', async () => {
    const createRes = await auth(token)
      .post('/api/tenants')
      .send({
        name: 'Patch Target',
        domain: 'patch.example.com',
        contactEmail: 'x@patch.example.com',
        plan: 'Starter',
        status: 'Active',
        minutesPerUserPerMonth: 60,
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;
    const res = await auth(token)
      .patch(`/api/tenants/${id}`)
      .send({ name: 'Patch Target Updated', pricePerUserPerMonthDollars: 29 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Patch Target Updated');
    expect(res.body.pricePerUserPerMonthDollars).toBe(29);
  });

  it('PATCH /api/tenants/:id returns 404 for unknown id', async () => {
    const res = await auth(token)
      .patch('/api/tenants/nonexistent-tenant-id-999')
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('POST /api/tenants/:id/invoices increments monthly pool by users × minutesPerMonthPerUser, not minutesTotal', async () => {
    const domain = `invoice-pool-${Date.now()}.example.com`;
    const createRes = await auth(token)
      .post('/api/tenants')
      .send({
        name: 'Invoice Pool Test',
        domain,
        contactEmail: 'inv@example.com',
        plan: 'Custom',
        status: 'Active',
        minutesPerUserPerMonth: 30,
        minutesPurchased: 0,
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id as string;
    expect(createRes.body.minutesPurchased).toBe(0);

    const invoiceRes = await auth(token)
      .post(`/api/tenants/${id}/invoices`)
      .send({
        users: 2,
        months: 3,
        minutesPerMonthPerUser: 50,
        pricePerMonthPerUser: 10,
      });
    expect(invoiceRes.status).toBe(201);
    expect(invoiceRes.body.minutesTotal).toBe(300);

    const getRes = await auth(token).get(`/api/tenants/${id}`);
    expect(getRes.status).toBe(200);
    const monthlyPoolIncrement = 2 * 50;
    expect(getRes.body.minutesPurchased).toBe(monthlyPoolIncrement);
    expect(getRes.body.minutesPurchased).not.toBe(300);
  });
});
