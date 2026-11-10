import request from 'supertest';
import express, { Express } from 'express';
import { createSelfTestRouter } from '../../src/routes/selftest.routes';

describe('Self-Test Route', (): void => {
  let app: Express;

  beforeEach((): void => {
    app = express();
    app.use(express.json());
    app.use('/api/selftest', createSelfTestRouter());
  });

  it('POST /api/selftest returns 200 with correct shape', async (): Promise<void> => {
    const res = await request(app).post('/api/selftest');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.totalDurationMs).toBe('number');
    expect(typeof res.body.passed).toBe('number');
    expect(typeof res.body.failed).toBe('number');
    expect(Array.isArray(res.body.tests)).toBe(true);
  });

  it('POST /api/selftest: all 8 built-in checks pass', async (): Promise<void> => {
    const res = await request(app).post('/api/selftest');
    expect(res.body.tests).toHaveLength(8);
    for (const test of res.body.tests) {
      expect(test.passed).toBe(true);
    }
    expect(res.body.failed).toBe(0);
    expect(res.body.passed).toBe(8);
  });

  it('POST /api/selftest: each test has name, passed, durationMs', async (): Promise<void> => {
    const res = await request(app).post('/api/selftest');
    for (const test of res.body.tests) {
      expect(typeof test.name).toBe('string');
      expect(typeof test.passed).toBe('boolean');
      expect(typeof test.durationMs).toBe('number');
    }
  });

  it('POST /api/selftest: has a timestamp field', async (): Promise<void> => {
    const res = await request(app).post('/api/selftest');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
