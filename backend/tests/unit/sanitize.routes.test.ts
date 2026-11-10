import request from 'supertest';
import express, { Express } from 'express';
import nock from 'nock';
import { createSanitizeRouter } from '../../src/routes/sanitize.routes';
import { QuarantineManager } from '../../src/sanitizers/quarantine';
import { mockDexScreenerPairResponse } from '../fixtures/dexScreener.fixture';

describe('Sanitize Routes', (): void => {
  let app: Express;
  let quarantineManager: QuarantineManager;

  beforeEach((): void => {
    quarantineManager = new QuarantineManager();
    app = express();
    app.use(express.json());
    app.use('/api/sanitize', createSanitizeRouter({ quarantineManager }));
    nock.cleanAll();
  });

  afterAll((): void => {
    nock.restore();
  });

  it('POST /api/sanitize returns 400 when records is not an array', async (): Promise<void> => {
    const res = await request(app).post('/api/sanitize').send({ records: 'bad' });
    expect(res.status).toBe(400);
  });

  it('POST /api/sanitize accepts an empty batch', async (): Promise<void> => {
    const res = await request(app).post('/api/sanitize').send({ records: [] });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.accepted).toBe(0);
  });

  it('POST /api/sanitize quarantines invalid records and accepts valid ones', async (): Promise<void> => {
    const records = [
      { chainId: 'bad' }, // missing fields - invalid
      null, // null - invalid
    ];
    const res = await request(app).post('/api/sanitize').send({ records, schemaType: 'tokenPair' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.quarantined).toBe(2);
    expect(res.body.accepted).toBe(0);
  });

  it('POST /api/sanitize/live returns sanitized DEX Screener live data', async (): Promise<void> => {
    nock('https://api.dexscreener.com')
      .get('/latest/dex/search')
      .query({ q: 'SOL' })
      .reply(200, mockDexScreenerPairResponse);

    const res = await request(app).post('/api/sanitize/live?symbol=SOL');
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe('SOL');
    expect(typeof res.body.total).toBe('number');
  });
});
