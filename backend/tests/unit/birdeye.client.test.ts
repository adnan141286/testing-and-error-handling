import nock from 'nock';
import RedisMock from 'ioredis-mock';
import { BirdeyeClient } from '../../src/services/providers';
import { ResilientHttpClient } from '../../src/services/resilience';
import { CacheManager } from '../../src/services/cache';
import { RedisCache } from '../../src/services/cache/redisCache';
import { MemoryCache } from '../../src/services/cache/memoryCache';
import { mockBirdeyePriceResponse, mockBirdeyeOverviewResponse } from '../fixtures/birdeye.fixture';

describe('BirdeyeClient', (): void => {
  const baseUrl = 'https://public-api.birdeye.so';
  const apiKey = 'birdeye-test-api-key';
  let cacheManager: CacheManager;
  let httpClient: ResilientHttpClient;
  let client: BirdeyeClient;

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
    httpClient = new ResilientHttpClient({ providerName: 'birdeye' });
    client = new BirdeyeClient({ baseUrl, apiKey, httpClient, cacheManager });
  });

  afterEach((): void => {
    nock.cleanAll();
  });

  it('fetches token price with headers and caches the result', async (): Promise<void> => {
    const address = 'So11111111111111111111111111111111111111112';
    const endpoint = `/defi/price?address=${address}`;

    const scope = nock(baseUrl, {
      reqheaders: {
        'x-api-key': apiKey,
        'x-chain': 'solana',
      },
    })
      .get(endpoint)
      .reply(200, mockBirdeyePriceResponse);

    const res1 = await client.getTokenPrice(address);
    expect(res1.success).toBe(true);
    expect(res1.data.value).toBe(3450.75);
    expect(scope.isDone()).toBe(true);

    // Cached call
    const res2 = await client.getTokenPrice(address);
    expect(res2).toEqual(mockBirdeyePriceResponse);
  });

  it('fetches token overview with custom chain', async (): Promise<void> => {
    const address = '0x2170ed0880ac9a755fd29b2688956bd959f933f8';
    const chain = 'bsc';
    const endpoint = `/defi/token_overview?address=${address}`;

    const scope = nock(baseUrl, {
      reqheaders: {
        'x-api-key': apiKey,
        'x-chain': chain,
      },
    })
      .get(endpoint)
      .reply(200, mockBirdeyeOverviewResponse);

    const res = await client.getTokenOverview(address, chain);
    expect(res.success).toBe(true);
    expect(res.data.symbol).toBe('SOL');
    expect(res.data.liquidity).toBe(125000000);
    expect(scope.isDone()).toBe(true);
  });

  it('fetches token overview using default chain parameter', async (): Promise<void> => {
    const address = 'So11111111111111111111111111111111111111112';
    const endpoint = `/defi/token_overview?address=${address}`;

    const scope = nock(baseUrl, {
      reqheaders: {
        'x-api-key': apiKey,
        'x-chain': 'solana',
      },
    })
      .get(endpoint)
      .reply(200, mockBirdeyeOverviewResponse);

    const res = await client.getTokenOverview(address);
    expect(res.success).toBe(true);
    expect(scope.isDone()).toBe(true);
  });

  it('fetches wallet transactions with headers', async (): Promise<void> => {
    const address = 'So11111111111111111111111111111111111111112';
    const endpoint = `/defi/txs/token?address=${address}&limit=20`;

    const scope = nock(baseUrl, {
      reqheaders: {
        'x-api-key': apiKey,
        'x-chain': 'solana',
      },
    })
      .get(endpoint)
      .reply(200, {
        success: true,
        data: {
          items: [{ txHash: '5abc...', blockTime: 12345678 }],
        },
      });

    const items = await client.getWalletTransactions(address);
    expect(items).toHaveLength(1);
    expect(scope.isDone()).toBe(true);
  });

  it('initializes with default options without crashing', (): void => {
    const defaultClient = new BirdeyeClient();
    expect(defaultClient).toBeInstanceOf(BirdeyeClient);
  });
});
