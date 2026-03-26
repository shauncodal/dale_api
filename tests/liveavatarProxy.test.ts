import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAuthToken, auth } from './helpers';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('LiveAvatar proxy endpoints', () => {
  let token: string;
  const originalFetch = globalThis.fetch;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : (url as URL).toString();
        if (u.includes('/sessions/token')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                code: 100,
                data: { session_id: 's1', session_token: 'tok1' },
                message: 'ok',
              }),
          } as Response);
        }
        if (u.includes('/sessions/start')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () =>
              Promise.resolve({
                code: 100,
                data: {
                  session_id: 's1',
                  livekit_url: 'https://livekit.example.com',
                  livekit_client_token: 'lkt1',
                },
                message: 'ok',
              }),
            } as Response);
        }
        return originalFetch(url as unknown as RequestInfo, init as RequestInit);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POST /api/liveavatar/sessions/token returns 200 with session_token when avatar_id provided', async () => {
    const res = await auth(token)
      .post('/api/liveavatar/sessions/token')
      .send({ avatar_id: 'a1' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.session_token).toBe('tok1');
  });

  it('POST /api/liveavatar/sessions/token returns 400 when avatar_id missing', async () => {
    const res = await auth(token)
      .post('/api/liveavatar/sessions/token')
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/liveavatar/sessions/start returns 201 with livekit_url and livekit_client_token', async () => {
    const res = await auth(token)
      .post('/api/liveavatar/sessions/start')
      .send({ session_token: 'tok1' });
    expect(res.status).toBe(201);
    expect(res.body?.data?.livekit_url).toBe('https://livekit.example.com');
    expect(res.body?.data?.livekit_client_token).toBe('lkt1');
  });

  it('POST /api/liveavatar/sessions/start returns 400 when session_token missing', async () => {
    const res = await auth(token)
      .post('/api/liveavatar/sessions/start')
      .send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/liveavatar/preview-url returns 200 with meetUrl', async () => {
    const res = await auth(token).get(
      '/api/liveavatar/preview-url?avatarId=a1&contextId=c1'
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('meetUrl');
    expect(res.body.meetUrl).toContain('meet.livekit.io');
    expect(res.body.meetUrl).toContain('liveKitUrl=');
    expect(res.body.meetUrl).toContain('token=');
  });

  it('GET /api/liveavatar/preview-url returns 400 when avatarId missing', async () => {
    const res = await auth(token).get('/api/liveavatar/preview-url');
    expect(res.status).toBe(400);
  });
});
