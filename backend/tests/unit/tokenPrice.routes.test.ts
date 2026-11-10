import request from 'supertest';
import express, { Express } from 'express';
import nock from 'nock';
import { createTokenPriceRouter } from '../../src/routes/tokenPrice.routes';
import { CacheManager } from '../../src/services/cache/cacheManager';
import { MemoryCache } from '../../src/services/cache/memoryCache';
import { mockDexScreenerPairResponse } from '../fixtures/dexScreener.fixture';
import { mockBirdeyePriceResponse } from '../fixtures/birdeye.fixture';
import { env } from '../../src/config/env';

describe('Token Price Route', (): void => {
  let app: Express;
  let cacheManager: CacheManager;

  beforeEach(async (): Promise<void> => {
    cacheManager = new CacheManager({
      memory: new MemoryCache(60),
    });
    await cacheManager.clear();
    app = express();
    app.use('/api/token', createTokenPriceRouter({ cacheManager }));
    nock.cleanAll();
  });

  afterAll((): void => {
    nock.restore();
  });

  it('rejects missing symbol with 400 validation error', async (): Promise<void> => {
    const res = await request(app).get('/api/token/price');
    expect(res.status).toBe(400);
  });

  it('fetches fresh token price from DEX Screener, then serves cached result', async (): Promise<void> => {
    nock('https://api.dexscreener.com')
      .get('/latest/dex/search')
      .query({ q: 'SOL' })
      .reply(200, mockDexScreenerPairResponse);

    const freshRes = await request(app).get('/api/token/price?symbol=SOL');
    expect(freshRes.status).toBe(200);
    expect(freshRes.body.symbol).toBe('SOL');
    expect(freshRes.body.price).toBe(1);
    expect(freshRes.body.source).toBe('DEX Screener');
    expect(freshRes.body.cached).toBe(false);

    const cachedRes = await request(app).get('/api/token/price?symbol=SOL');
    expect(cachedRes.status).toBe(200);
    expect(cachedRes.body.cached).toBe(true);
    expect(cachedRes.body.price).toBe(1);
  });

  it('handles 404 when no pairs are found for symbol and upstreams fail', async (): Promise<void> => {
    nock('https://api.dexscreener.com')
      .get('/latest/dex/search')
      .query({ q: 'UNKNOWN' })
      .reply(200, { schemaVersion: '1.0.0', pairs: [] });

    const res = await request(app).get('/api/token/price?symbol=UNKNOWN');
    expect(res.status).toBe(404);
  });

  it('falls back to Birdeye price when configured and DEX Screener has no pairs', async (): Promise<void> => {
    const customConfig = {
      ...env,
      BIRDEYE_API_KEY: 'real_production_birdeye_key_sample',
    };
    const freshCache = new CacheManager({ memory: new MemoryCache(60) });
    const birdeyeApp = express();
    birdeyeApp.use(
      '/api/token',
      createTokenPriceRouter({ cacheManager: freshCache, config: customConfig }),
    );

    nock('https://api.dexscreener.com')
      .get('/latest/dex/search')
      .query({ q: 'SOL' })
      .reply(200, { schemaVersion: '1.0.0', pairs: [] });

    nock('https://public-api.birdeye.so')
      .get('/defi/price')
      .query({ address: 'So11111111111111111111111111111111111111112' })
      .reply(200, mockBirdeyePriceResponse);

    const res = await request(birdeyeApp).get('/api/token/price?symbol=SOL');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('Birdeye');
    expect(res.body.price).toBe(3450.75);
  });

  it('falls back to CoinGecko price when DEX Screener has no pairs and Birdeye is unconfigured', async (): Promise<void> => {
    nock('https://api.dexscreener.com')
      .get('/latest/dex/search')
      .query({ q: 'WBTC' })
      .reply(200, { schemaVersion: '1.0.0', pairs: [] });

    nock('https://api.coingecko.com')
      .get('/api/v3/simple/price')
      .query({ ids: 'bitcoin', vs_currencies: 'usd' })
      .reply(200, { bitcoin: { usd: 74140 } });

    const res = await request(app).get('/api/token/price?symbol=BTC');
    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe('BTC');
    expect(res.body.price).toBe(74140);
    expect(res.body.source).toBe('CoinGecko');
  });

  it('serves stale cached price when all upstreams fail', async (): Promise<void> => {
    await cacheManager.set(
      'token:price:eth',
      { price: 2600, liquidity: 5000000, source: 'DEX Screener' },
      -1,
    );

    nock('https://api.dexscreener.com').get('/latest/dex/search').query({ q: 'WETH' }).reply(500);

    nock('https://api.coingecko.com')
      .get('/api/v3/simple/price')
      .query({ ids: 'ethereum', vs_currencies: 'usd' })
      .reply(500);

    const res = await request(app).get('/api/token/price?symbol=ETH');
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(2600);
    expect(res.body.stale).toBe(true);
    expect(res.body.source).toBe('DEX Screener (Stale)');
  });
});
