import request from 'supertest';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { PriceSamplerService } from '../../src/services/sampler/priceSampler.service';
import { resetPriceSampler } from '../../src/services/sampler';

describe('Token History Route (GET /api/token/history)', () => {
  beforeEach(() => {
    resetPriceSampler();
  });

  afterAll(() => {
    resetPriceSampler();
  });

  it('rejects missing symbol query param with 400', async () => {
    const app = createApp(env, { enableRateLimiting: false });
    const res = await request(app).get('/api/token/history');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns price history samples for symbol', async () => {
    const sampler = new PriceSamplerService();
    sampler.addSample({
      symbol: 'SOL',
      price: 150.25,
      liquidity: 5000000,
      source: 'DEX Screener',
      timestamp: Date.now(),
    });

    const { getPriceSampler } = await import('../../src/services/sampler');
    getPriceSampler(sampler);

    const app = createApp(env, { enableRateLimiting: false });
    const res = await request(app).get('/api/token/history?symbol=SOL');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.symbol).toBe('SOL');
    expect(res.body.count).toBe(1);
    expect(res.body.samples[0].price).toBe(150.25);
  });
});
