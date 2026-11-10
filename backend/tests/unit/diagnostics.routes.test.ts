import request from 'supertest';
import express, { Express } from 'express';
import { createDiagnosticsRouter } from '../../src/routes/diagnostics.routes';
import { diagnosticsTracker } from '../../src/utils/diagnosticsTracker';

describe('Diagnostics Route', (): void => {
  let app: Express;

  beforeEach((): void => {
    app = express();
    app.use('/api/diagnostics', createDiagnosticsRouter());
    diagnosticsTracker.reset();
  });

  it('returns valid diagnostics structure without exposing secrets', async (): Promise<void> => {
    diagnosticsTracker.recordCacheHit();
    diagnosticsTracker.recordCacheMiss();

    const res = await request(app).get('/api/diagnostics');
    expect(res.status).toBe(200);
    expect(res.body.providers).toBeDefined();
    expect(res.body.providers.dexScreener.name).toBe('DEX Screener');
    expect(res.body.providers.goPlus.name).toBe('GoPlus Security');
    expect(res.body.providers.birdeye.status).toBe('not configured');
    expect(res.body.cache.hits).toBe(1);
    expect(res.body.cache.misses).toBe(1);
    expect(res.body.quarantine).toBeDefined();

    const bodyString = JSON.stringify(res.body);
    expect(bodyString).not.toContain('placeholder_birdeye_api_key');
    expect(bodyString).not.toContain('your_birdeye_api_key_here');
    expect(bodyString).not.toContain('whales_paper_trading_secret_key');
  });
});
