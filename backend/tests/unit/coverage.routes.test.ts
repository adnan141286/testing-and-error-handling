import request from 'supertest';
import express, { Express } from 'express';
import fs from 'fs';
import { createCoverageRouter } from '../../src/routes/coverage.routes';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Coverage Route', (): void => {
  let app: Express;

  beforeEach((): void => {
    app = express();
    app.use('/api/coverage', createCoverageRouter());
    jest.clearAllMocks();
  });

  it('returns available=false when no coverage file exists', async (): Promise<void> => {
    mockedFs.existsSync.mockReturnValue(false);

    const res = await request(app).get('/api/coverage');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.message).toContain('npm run test:coverage');
    expect(res.body.threshold).toBe(85);
  });

  it('returns available=true with metrics when coverage file exists', async (): Promise<void> => {
    mockedFs.existsSync.mockReturnValue(true);
    const mockData = {
      total: {
        lines: { total: 500, covered: 450, skipped: 0, pct: 90 },
        statements: { total: 600, covered: 540, skipped: 0, pct: 90 },
        functions: { total: 100, covered: 90, skipped: 0, pct: 90 },
        branches: { total: 200, covered: 175, skipped: 0, pct: 87.5 },
      },
    };
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));

    const res = await request(app).get('/api/coverage');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.threshold).toBe(85);
    expect(res.body.metrics.lines.pct).toBe(90);
    expect(res.body.metrics.branches.pct).toBe(87.5);
  });

  it('returns available=false when coverage file is invalid JSON', async (): Promise<void> => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('{ not valid json {{');

    const res = await request(app).get('/api/coverage');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.message).toContain('Error reading');
  });
});
