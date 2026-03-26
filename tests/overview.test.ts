import { describe, it, expect, beforeAll } from 'vitest';
import { getAuthToken, auth } from './helpers';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('Overview endpoints', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  it('GET /api/overview/kpis returns 200 and numbers', async () => {
    const res = await auth(token).get('/api/overview/kpis');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      activeTenants: expect.any(Number),
      totalUsers: expect.any(Number),
      minutesCoached: expect.any(Number),
      avgScore: expect.any(Number),
    });
  });

  it('GET /api/overview/usage-trend returns 200 and array', async () => {
    const res = await auth(token).get('/api/overview/usage-trend');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toMatchObject({
        month: expect.any(String),
        minutes: expect.any(Number),
        sessions: expect.any(Number),
      });
    }
  });

  it('GET /api/overview/usage-trend?months=6 returns 200', async () => {
    const res = await auth(token).get('/api/overview/usage-trend?months=6');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/overview/most-used-coaches returns 200 and array', async () => {
    const res = await auth(token).get('/api/overview/most-used-coaches');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toMatchObject({
        coachName: expect.any(String),
        minutes: expect.any(Number),
      });
    }
  });

  it('GET /api/overview/score-distribution returns 200 and array', async () => {
    const res = await auth(token).get('/api/overview/score-distribution');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toMatchObject({
        range: expect.any(String),
        count: expect.any(Number),
      });
    }
  });

  it('GET /api/overview/plan-distribution returns 200 and array', async () => {
    const res = await auth(token).get('/api/overview/plan-distribution');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toMatchObject({
        plan: expect.any(String),
        tenants: expect.any(Number),
      });
    }
  });

  it('GET /api/overview/most-active-users returns 200 and array', async () => {
    const res = await auth(token).get('/api/overview/most-active-users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/overview/most-active-users?limit=5 returns 200', async () => {
    const res = await auth(token).get('/api/overview/most-active-users?limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
