import { describe, it, expect, beforeAll } from 'vitest';
import { getAuthToken, auth } from './helpers';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('Avatars endpoints', () => {
  let token: string;
  let avatarId: string;

  beforeAll(async () => {
    token = await getAuthToken();
    const listRes = await auth(token).get('/api/avatars');
    if (listRes.body?.length > 0) avatarId = listRes.body[0].id;
  });

  it('GET /api/avatars returns 200 and array', async () => {
    const res = await auth(token).get('/api/avatars');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/avatars/:id returns 200 with avatar when found', async () => {
    if (!avatarId) return;
    const res = await auth(token).get(`/api/avatars/${avatarId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', avatarId);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('title');
  });

  it('GET /api/avatars/:id returns 404 for unknown id', async () => {
    const res = await auth(token).get('/api/avatars/nonexistent-avatar-id-12345');
    expect(res.status).toBe(404);
  });

  it('POST /api/avatars returns 201 with created avatar when body valid', async () => {
    const res = await auth(token)
      .post('/api/avatars')
      .send({
        name: 'Test Coach',
        title: 'Test Title',
        speciality: 'Testing',
        rating: 4.5,
        sessions: 0,
        tags: [],
        creditRate: 1,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Coach');
    avatarId = res.body.id;
  });

  it('POST /api/avatars returns 400 when body invalid', async () => {
    const res = await auth(token).post('/api/avatars').send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/avatars/:id returns 200 with updated avatar', async () => {
    if (!avatarId) return;
    const res = await auth(token)
      .patch(`/api/avatars/${avatarId}`)
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  it('PATCH /api/avatars/:id returns 404 for unknown id', async () => {
    const res = await auth(token)
      .patch('/api/avatars/nonexistent-avatar-id-12345')
      .send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  it('PATCH /api/avatars/:id/live-config returns 200 with updated config', async () => {
    if (!avatarId) return;
    const res = await auth(token)
      .patch(`/api/avatars/${avatarId}/live-config`)
      .send({ avatarId: 'live-avatar-uuid-123', contextId: 'ctx-1', voiceId: 'voice-1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('liveAvatarConfig');
    expect(res.body.liveAvatarConfig.avatarId).toBe('live-avatar-uuid-123');
  });

  it('PATCH /api/avatars/:id/live-config returns 404 for unknown id', async () => {
    const res = await auth(token)
      .patch('/api/avatars/nonexistent-avatar-id-12345/live-config')
      .send({ avatarId: 'x' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/avatars/:id returns 204 when found', async () => {
    if (!avatarId) return;
    const res = await auth(token).delete(`/api/avatars/${avatarId}`);
    expect(res.status).toBe(204);
    avatarId = '';
  });

  it('DELETE /api/avatars/:id returns 404 for unknown id', async () => {
    const res = await auth(token).delete('/api/avatars/nonexistent-avatar-id-12345');
    expect(res.status).toBe(404);
  });
});
