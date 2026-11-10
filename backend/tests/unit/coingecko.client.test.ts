import nock from 'nock';
import { CoinGeckoClient } from '../../src/services/providers/coingecko.client';
import { CacheManager } from '../../src/services/cache/cacheManager';
import { MemoryCache } from '../../src/services/cache/memoryCache';

describe('CoinGeckoClient Provider', (): void => {
  let client: CoinGeckoClient;
  let cacheManager: CacheManager;
  const baseUrl = 'https://api.coingecko.com/api/v3';

  beforeEach(async (): Promise<void> => {
    nock.cleanAll();
    cacheManager = new CacheManager({ memory: new MemoryCache(60) });
    await cacheManager.clear();
    client = new CoinGeckoClient({ baseUrl, cacheManager });
  });

  afterAll((): void => {
    nock.restore();
  });

  it('successfully fetches and parses token price in USD', async (): Promise<void> => {
    nock(baseUrl)
      .get('/simple/price')
      .query({ ids: 'bitcoin', vs_currencies: 'usd' })
      .reply(200, { bitcoin: { usd: 74140.5 } });

    const price = await client.getPrice('bitcoin');
    expect(price).toBe(74140.5);
  });

  it('serves cached price on subsequent requests without hitting API', async (): Promise<void> => {
    nock(baseUrl)
      .get('/simple/price')
      .query({ ids: 'ethereum', vs_currencies: 'usd' })
      .once()
      .reply(200, { ethereum: { usd: 2642.8 } });

    const first = await client.getPrice('ethereum');
    expect(first).toBe(2642.8);

    // Second call should come from cache
    const second = await client.getPrice('ethereum');
    expect(second).toBe(2642.8);
  });

  it('returns null when response schema is invalid or malformed', async (): Promise<void> => {
    nock(baseUrl)
      .get('/simple/price')
      .query({ ids: 'unknown', vs_currencies: 'usd' })
      .reply(200, { unknown: { invalid: 'not-a-number' } });

    const result = await client.getPrice('unknown');
    expect(result).toBeNull();
  });

  it('returns null when requested token is not in response', async (): Promise<void> => {
    nock(baseUrl)
      .get('/simple/price')
      .query({ ids: 'missing', vs_currencies: 'usd' })
      .reply(200, {});

    const result = await client.getPrice('missing');
    expect(result).toBeNull();
  });
});
