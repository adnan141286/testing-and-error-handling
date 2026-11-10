import request from 'supertest';
import express, { Express } from 'express';
import { createLabRouter } from '../../src/routes/lab.routes';
import { createErrorHandler } from '../../src/middleware/errorHandler';

describe('Lab Routes', (): void => {
  let appEnabled: Express;
  let appDisabled: Express;

  beforeEach((): void => {
    const prodErrorHandler = createErrorHandler(true); // production: no stack traces
    appEnabled = express();
    appEnabled.use(express.json());
    appEnabled.use('/api/lab', createLabRouter({ labMode: true }));
    appEnabled.use(prodErrorHandler);

    appDisabled = express();
    appDisabled.use(express.json());
    appDisabled.use('/api/lab', createLabRouter({ labMode: false }));
    appDisabled.use(prodErrorHandler);
  });

  describe('POST /api/lab/scenario', (): void => {
    it('returns rate_limit scenario result', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/scenario').send({ type: 'rate_limit' });
      expect(res.status).toBe(200);
      expect(res.body.scenario).toBe('rate_limit');
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.attempts)).toBe(true);
      expect(res.body.totalAttempts).toBe(3);
    });

    it('returns outage scenario result', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/scenario').send({ type: 'outage' });
      expect(res.status).toBe(200);
      expect(res.body.scenario).toBe('outage');
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.trace)).toBe(true);
    });

    it('returns 400 for invalid scenario type', async (): Promise<void> => {
      const res = await request(appEnabled)
        .post('/api/lab/scenario')
        .send({ type: 'invalid_type' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/lab/reset', (): void => {
    it('returns success response', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/reset');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/lab/error', (): void => {
    it('returns 400 for validation error type', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/error').send({ type: 'validation' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 429 for rate_limit error type', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/error').send({ type: 'rate_limit' });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMIT_ERROR');
    });

    it('returns 502 for provider error type', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/error').send({ type: 'provider' });
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('PROVIDER_ERROR');
    });

    it('returns 503 for circuit_open error type', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/error').send({ type: 'circuit_open' });
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('CIRCUIT_OPEN_ERROR');
    });

    it('returns 404 for not_found error type', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/error').send({ type: 'not_found' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND_ERROR');
    });

    it('error response never contains a stack trace', async (): Promise<void> => {
      const res = await request(appEnabled).post('/api/lab/error').send({ type: 'validation' });
      expect(res.body.error.stack).toBeUndefined();
    });
  });

  describe('LAB_MODE=false', (): void => {
    it('returns 404 for all lab routes when disabled', async (): Promise<void> => {
      const res = await request(appDisabled).post('/api/lab/scenario').send({ type: 'rate_limit' });
      expect(res.status).toBe(404);
    });
  });
});
