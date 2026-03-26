import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { getAuthToken } from './helpers';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('POST /api/auth/login', () => {
  it('returns 400 when body is invalid', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 when password is wrong', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'liteadmin@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it.skipIf(!hasDb)('returns 200 and token when credentials are correct', async () => {
    const email = process.env.LITE_ADMIN_EMAIL ?? 'liteadmin@example.com';
    const password = process.env.LITE_ADMIN_PASSWORD;
    if (!password) {
      console.warn('LITE_ADMIN_PASSWORD not set; skipping login success test');
      return;
    }
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });
});

describe('Protected route without auth', () => {
  it('GET /api/overview/kpis returns 401 without token', async () => {
    const res = await request(app).get('/api/overview/kpis');
    expect(res.status).toBe(401);
  });
});

describe.skipIf(!hasDb)('Protected route with auth', () => {
  it('GET /api/overview/kpis returns 200 with valid token', async () => {
    const token = await getAuthToken();
    const res = await request(app)
      .get('/api/overview/kpis')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
