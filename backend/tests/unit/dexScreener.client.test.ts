import nock from 'nock';
import RedisMock from 'ioredis-mock';
import { DexScreenerClient } from '../../src/services/providers';
import { ResilientHttpClient } from '../../src/services/resilience';
import { CacheManager } from '../../src/services/cache';
import { RedisCache } from '../../src/services/cache/redisCache';
import { MemoryCache } from '../../src/services/cache/memoryCache';
import { mockDexScreenerPairResponse } from '../fixtures/dexScreener.fixture';

describe('DexScreenerClient', (): void => {
  const baseUrl = 'https://api.dexscreener.com';
  let cacheManager: CacheManager;
  let httpClient: ResilientHttpClient;
  let clientWithKey: DexScreenerClient;
  let clientWithoutKey: DexScreenerClient;

  beforeAll((): void => {
    nock.disableNetConnect();
  });

  afterAll((): void => {
    nock.enableNetConnect();
  });

  beforeEach((): void => {
    const redisMock = new RedisMock();
    const redis = new RedisCache({ client: redisMock });
    const memory = new MemoryCache();
    cacheManager = new CacheManager({ redis, memory });
    httpClient = new ResilientHttpClient({ providerName: 'dexscreener' });
    clientWithKey = new DexScreenerClient({
      baseUrl,
      httpClient,
      cacheManager,
      apiKey: 'test-api-key',
    });
    clientWithoutKey = new DexScreenerClient({
      baseUrl,
      httpClient,
      cacheManager,
      apiKey: '',
    });
  });

  afterEach(async (): Promise<void> => {
    nock.cleanAll();
    await cacheManager.clear();
  });

  it('fetches pairs by chain and pair address, caching subsequent requests', async (): Promise<void> => {
    const chainId = 'ethereum';
    const pairAddress = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
    const endpoint = `/latest/dex/pairs/${chainId}/${pairAddress}`;

    const scope = nock(baseUrl, {
      reqheaders: {
        authorization: 'Bearer test-api-key',
      },
    })
      .get(endpoint)
      .reply(200, mockDexScreenerPairResponse);

    // First request dispatches network call with auth header
    const result1 = await clientWithKey.getPairsByAddress(chainId, pairAddress);
    expect(result1).toEqual(mockDexScreenerPairResponse);
    expect(scope.isDone()).toBe(true);

    // Second request is resolved from cache without hitting nock
    const result2 = await clientWithKey.getPairsByAddress(chainId, pairAddress);
    expect(result2).toEqual(mockDexScreenerPairResponse);
  });

  it('fetches pairs by address without API key header', async (): Promise<void> => {
    const chainId = 'bsc';
    const pairAddress = '0x1111111111111111111111111111111111111111';
    const endpoint = `/latest/dex/pairs/${chainId}/${pairAddress}`;

    const scope = nock(baseUrl).get(endpoint).reply(200, mockDexScreenerPairResponse);

    const result = await clientWithoutKey.getPairsByAddress(chainId, pairAddress);
    expect(result.schemaVersion).toBe('1.0.0');
    expect(scope.isDone()).toBe(true);
  });

  it('fetches token pairs without api key header', async (): Promise<void> => {
    const tokenAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const endpoint = `/latest/dex/tokens/${tokenAddress}`;

    nock(baseUrl).get(endpoint).reply(200, mockDexScreenerPairResponse);

    const result = await clientWithoutKey.getTokenPairs(tokenAddress);
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs?.[0]?.baseToken.symbol).toBe('USDC');
    expect(result.pairs?.[0]?.quoteToken.symbol).toBe('WETH');
  });

  it('fetches token pairs with api key header', async (): Promise<void> => {
    const tokenAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const endpoint = `/latest/dex/tokens/${tokenAddress}`;

    const scope = nock(baseUrl, {
      reqheaders: {
        authorization: 'Bearer test-api-key',
      },
    })
      .get(endpoint)
      .reply(200, mockDexScreenerPairResponse);

    const result = await clientWithKey.getTokenPairs(tokenAddress);
    expect(result.pairs?.[0]?.baseToken.symbol).toBe('USDC');
    expect(scope.isDone()).toBe(true);
  });

  it('searches for pairs matching a query string', async (): Promise<void> => {
    const query = 'PEPE/WETH';
    const endpoint = `/latest/dex/search?q=${encodeURIComponent(query)}`;

    nock(baseUrl).get(endpoint).reply(200, mockDexScreenerPairResponse);

    const result = await clientWithoutKey.searchPairs(query);
    expect(result.pairs?.[0]?.chainId).toBe('ethereum');
  });

  it('searches for pairs with API key authentication', async (): Promise<void> => {
    const query = 'PEPE';
    const endpoint = `/latest/dex/search?q=${encodeURIComponent(query)}`;

    const scope = nock(baseUrl, {
      reqheaders: {
        authorization: 'Bearer test-api-key',
      },
    })
      .get(endpoint)
      .reply(200, mockDexScreenerPairResponse);

    const result = await clientWithKey.searchPairs(query);
    expect(result.pairs?.[0]?.chainId).toBe('ethereum');
    expect(scope.isDone()).toBe(true);
  });

  it('initializes with default options without crashing', (): void => {
    const defaultClient = new DexScreenerClient();
    expect(defaultClient).toBeInstanceOf(DexScreenerClient);
  });
});
