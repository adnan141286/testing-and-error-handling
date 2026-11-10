import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { z } from 'zod';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { createErrorHandler } from '../../src/middleware/errorHandler';
import { createRateLimiter } from '../../src/middleware/rateLimiter';
import { validate, validateBody, validateQuery } from '../../src/middleware/validate';
import { AppError } from '../../src/errors/AppError';
import { HTTP_STATUS, ERROR_CODES } from '../../src/config/constants';

describe('Middleware Integration Tests', (): void => {
  describe('Request ID and 404 Handling', (): void => {
    const app = createApp(env);

    it('generates a new X-Request-Id when none is provided', async (): Promise<void> => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
    });

    it('preserves client-provided X-Request-Id header', async (): Promise<void> => {
      const customId = 'client-custom-req-id-12345';
      const res = await request(app).get('/health').set('X-Request-Id', customId);
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customId);
    });

    it('returns standard 404 NOT_FOUND_ERROR shape for undefined routes', async (): Promise<void> => {
      const res = await request(app).get('/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: expect.objectContaining({
          code: ERROR_CODES.NOT_FOUND_ERROR,
          message: expect.stringContaining('Route'),
          requestId: expect.any(String),
        }),
      });
    });
  });

  describe('Error Handler Response Shape and Environment Logic', (): void => {
    it('returns error JSON shape and hides stack trace in production', async (): Promise<void> => {
      const prodApp: Express = express();
      prodApp.get('/error-test', () => {
        throw new Error('Secret internal failure');
      });
      prodApp.use(createErrorHandler(true));

      const res = await request(prodApp).get('/error-test');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal Server Error',
        },
      });
      expect(res.body.error.stack).toBeUndefined();
    });

    it('includes details and stack trace in non-production mode', async (): Promise<void> => {
      const devApp: Express = express();
      devApp.get('/app-error', () => {
        throw new AppError('Custom domain failure', HTTP_STATUS.BAD_REQUEST, 'CUSTOM_ERR', true, {
          field: 'token',
        });
      });
      devApp.get('/generic-error', () => {
        throw new Error('Standard developer runtime exception');
      });
      devApp.use(createErrorHandler(false));

      const res = await request(devApp).get('/app-error');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CUSTOM_ERR');
      expect(res.body.error.message).toBe('Custom domain failure');
      expect(res.body.error.details).toEqual({ field: 'token' });
      expect(res.body.error.stack).toBeDefined();

      const genericRes = await request(devApp).get('/generic-error');
      expect(genericRes.status).toBe(500);
      expect(genericRes.body.error.message).toBe('Standard developer runtime exception');
      expect(genericRes.body.error.stack).toBeDefined();
    });
  });

  describe('Rate Limiter Middleware', (): void => {
    it('enforces limit and returns 429 when max requests is exceeded', async (): Promise<void> => {
      const limitedApp: Express = express();
      limitedApp.use(createRateLimiter({ windowMs: 5000, maxRequests: 2 }));
      limitedApp.get('/limited', (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      });
      limitedApp.use(createErrorHandler(false));

      const res1 = await request(limitedApp).get('/limited');
      expect(res1.status).toBe(200);
      expect(res1.headers['x-ratelimit-remaining']).toBe('1');

      const res2 = await request(limitedApp).get('/limited');
      expect(res2.status).toBe(200);
      expect(res2.headers['x-ratelimit-remaining']).toBe('0');

      const res3 = await request(limitedApp).get('/limited');
      expect(res3.status).toBe(429);
      expect(res3.headers['retry-after']).toBeDefined();
      expect(res3.body.error.code).toBe(ERROR_CODES.RATE_LIMIT_ERROR);
    });
  });

  describe('Validation Middleware', (): void => {
    const testApp: Express = express();
    testApp.use(express.json());

    const bodySchema = z.object({
      symbol: z.string().min(2),
      amount: z.number().positive(),
    });

    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
    });

    testApp.post('/validate-body', validateBody(bodySchema), (req: Request, res: Response) => {
      res.status(200).json({ success: true, data: req.body });
    });

    testApp.get('/validate-query', validateQuery(querySchema), (req: Request, res: Response) => {
      res.status(200).json({ success: true, query: req.query });
    });

    testApp.post(
      '/validate-combined/:id',
      validate({
        params: z.object({ id: z.string().regex(/^\d+$/) }),
        query: z.object({ filter: z.string().optional() }),
        body: z.object({ active: z.boolean() }),
      }),
      (req: Request, res: Response) => {
        res.status(200).json({ params: req.params, query: req.query, body: req.body });
      },
    );

    testApp.use(createErrorHandler(false));

    it('rejects invalid request body with 400 VALIDATION_ERROR and details', async (): Promise<void> => {
      const res = await request(testApp).post('/validate-body').send({ symbol: 'X', amount: -5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('accepts valid body and transforms payload data', async (): Promise<void> => {
      const res = await request(testApp)
        .post('/validate-body')
        .send({ symbol: 'WETH', amount: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ symbol: 'WETH', amount: 10 });
    });

    it('coerces and validates query parameters successfully', async (): Promise<void> => {
      const res = await request(testApp).get('/validate-query?page=3');
      expect(res.status).toBe(200);
      expect(res.body.query).toEqual({ page: 3 });
    });

    it('validates params, query, and body combined schema', async (): Promise<void> => {
      const resOk = await request(testApp)
        .post('/validate-combined/123?filter=active')
        .send({ active: true });
      expect(resOk.status).toBe(200);
      expect(resOk.body.body).toEqual({ active: true });

      const resBad = await request(testApp)
        .post('/validate-combined/abc')
        .send({ active: 'not-a-boolean' });
      expect(resBad.status).toBe(400);
    });

    it('creates app with disabled rate limiting option', async (): Promise<void> => {
      const unmeteredApp = createApp(env, { enableRateLimiting: false });
      const res = await request(unmeteredApp).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    });
  });
});
