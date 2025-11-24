import request from 'supertest';
import app from '../../src/index';

describe('Core contract tests (smoke)', () => {
  it('health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
