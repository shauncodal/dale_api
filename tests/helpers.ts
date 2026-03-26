import request from 'supertest';
import app from '../src/app';

const LITE_ADMIN_EMAIL = process.env.LITE_ADMIN_EMAIL ?? 'liteadmin@example.com';
const LITE_ADMIN_PASSWORD = process.env.LITE_ADMIN_PASSWORD ?? 'LiteAdminChangeMe1!';

export async function getAuthToken(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: LITE_ADMIN_EMAIL, password: LITE_ADMIN_PASSWORD });
  if (res.status !== 200 || !res.body?.token) throw new Error('Login failed in test helper');
  return res.body.token;
}

function bearer(token: string) {
  return (r: ReturnType<typeof request.app>) => r.set('Authorization', `Bearer ${token}`);
}

export function auth(token: string) {
  const b = bearer(token);
  return {
    get: (url: string) => b(request(app).get(url)),
    post: (url: string) => b(request(app).post(url)),
    patch: (url: string) => b(request(app).patch(url)),
    delete: (url: string) => b(request(app).delete(url)),
  };
}

export { app };
