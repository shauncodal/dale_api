import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('GET /api/version', () => {
  it('returns 200 and expected keys', async () => {
    const res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      apiVersion: expect.any(String),
      consentDocumentVersion: expect.any(String),
    });
    expect(res.body).toHaveProperty('gitSha');
    expect(res.body).toHaveProperty('gitBranch');
    expect(res.body).toHaveProperty('commitMessage');
    expect(res.body).toHaveProperty('buildDescription');
  });
});
