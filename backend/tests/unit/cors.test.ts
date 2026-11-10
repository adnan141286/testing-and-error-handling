import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { createCorsMiddleware } from '../../src/middleware/cors';

describe('CORS Middleware', (): void => {
  const allowedOrigin = 'http://localhost:3001';
  let app: Express;

  beforeEach((): void => {
    app = express();
    app.use(createCorsMiddleware(allowedOrigin));
    app.get('/test', (_req: Request, res: Response): void => {
      res.status(200).json({ ok: true });
    });
  });

  it('sets correct CORS headers on standard GET request', async (): Promise<void> => {
    const res = await request(app).get('/test').set('Origin', allowedOrigin);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.body).toEqual({ ok: true });
  });

  it('handles preflight OPTIONS request with 204 and allowed headers', async (): Promise<void> => {
    const res = await request(app)
      .options('/test')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-methods']).toContain('GET');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
  });
});
