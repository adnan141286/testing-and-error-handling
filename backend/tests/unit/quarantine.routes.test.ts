import request from 'supertest';
import express, { Express } from 'express';
import { createQuarantineRouter } from '../../src/routes/quarantine.routes';
import { QuarantineManager } from '../../src/sanitizers/quarantine';

describe('Quarantine Routes', (): void => {
  let app: Express;
  let quarantineManager: QuarantineManager;

  beforeEach((): void => {
    quarantineManager = new QuarantineManager();
    app = express();
    app.use('/api/quarantine', createQuarantineRouter({ quarantineManager }));
  });

  it('GET /api/quarantine returns empty list and stats initially', async (): Promise<void> => {
    const res = await request(app).get('/api/quarantine');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.records).toHaveLength(0);
    expect(res.body.stats.totalQuarantined).toBe(0);
  });

  it('GET /api/quarantine returns quarantined records', async (): Promise<void> => {
    quarantineManager.quarantine({ bad: 'data' }, 'Missing field: chainId', 'test');
    const res = await request(app).get('/api/quarantine');
    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
    expect(res.body.stats.totalQuarantined).toBe(1);
  });

  it('DELETE /api/quarantine clears all records', async (): Promise<void> => {
    quarantineManager.quarantine({ x: 1 }, 'Invalid', 'test');
    const del = await request(app).delete('/api/quarantine');
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    const res = await request(app).get('/api/quarantine');
    expect(res.body.records).toHaveLength(0);
  });
});
