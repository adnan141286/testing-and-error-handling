import http from 'http';
import request from 'supertest';
import { createApp, startServer } from '../../src/index';
import { env } from '../../src/config/env';

describe('Server End-to-End Lifecycle', (): void => {
  let server: http.Server | undefined;

  afterEach((done): void => {
    if (server?.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  it('should start HTTP server and respond to requests', async (): Promise<void> => {
    const testConfig = { ...env, PORT: 0 };
    server = startServer(testConfig);
    expect(server).toBeDefined();

    const app = createApp(testConfig);
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });
});
