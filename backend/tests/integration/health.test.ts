import request from 'supertest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';

describe('Health Integration Check', (): void => {
  const app = createApp(env);

  it('should return 200 OK from /health endpoint', async (): Promise<void> => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('environment', env.NODE_ENV);
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('should return 200 OK from /api/health endpoint', async (): Promise<void> => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('environment', env.NODE_ENV);
    expect(response.body).toHaveProperty('uptime');
  });
});
