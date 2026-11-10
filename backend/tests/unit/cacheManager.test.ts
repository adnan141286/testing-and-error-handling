import RedisMock from 'ioredis-mock';
import { CacheManager } from '../../src/services/cache';
import { RedisCache } from '../../src/services/cache/redisCache';
import { MemoryCache } from '../../src/services/cache/memoryCache';
import { ProviderError } from '../../src/errors';

describe('CacheManager Multi-Tier & Resilience', (): void => {
  beforeEach((): void => {
    jest.useFakeTimers();
  });

  afterEach((): void => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should resolve per-endpoint configured TTLs correctly', (): void => {
    const manager = new CacheManager({
      endpointTtls: {
        'token:price': 15,
        'token:metrics': 60,
        'token:security': 3600,
      },
      defaultTtlSeconds: 300,
    });

    expect(manager.getTtl('token:price:0xabc')).toBe(15);
    expect(manager.getTtl('token:metrics:0xabc')).toBe(60);
    expect(manager.getTtl('token:security:0xabc')).toBe(3600);
    expect(manager.getTtl('other:random:key')).toBe(300);
  });

  it('should automatically fall back to memory cache when Redis is down', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const redis = new RedisCache({ client: mockClient });
    const memory = new MemoryCache();
    const manager = new CacheManager({ redis, memory });

    expect(manager.isRedisHealthy()).toBe(true);

    // Initial write when Redis is up
    await manager.set('wallet:active', { status: 'healthy' });
    expect(await manager.get('wallet:active')).toEqual({ status: 'healthy' });

    // Simulate Redis failure
    jest.spyOn(mockClient, 'get').mockRejectedValue(new Error('Redis node failure'));
    await redis.get('trigger-unhealthy');
    expect(manager.isRedisHealthy()).toBe(false);

    // Read should fall back to memory without throwing
    const fallbackVal = await manager.get<{ status: string }>('wallet:active');
    expect(fallbackVal).toEqual({ status: 'healthy' });

    // Write should succeed to memory tier
    await manager.set('wallet:fallback', { status: 'offline-mode' });
    const memoryVal = await manager.get<{ status: string }>('wallet:fallback');
    expect(memoryVal).toEqual({ status: 'offline-mode' });
  });

  it('should de-duplicate concurrent identical calls into one shared promise', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const redis = new RedisCache({ client: mockClient });
    const manager = new CacheManager({ redis });
    let providerCalls = 0;

    const slowFetcher = async (): Promise<{ price: string }> => {
      providerCalls++;
      await new Promise<void>((resolve): void => {
        setTimeout(resolve, 50);
      });
      return { price: '3450.50' };
    };

    // Dispatch 5 simultaneous concurrent identical requests
    const call1 = manager.getOrSet('token:price:eth', slowFetcher);
    const call2 = manager.getOrSet('token:price:eth', slowFetcher);
    const call3 = manager.getOrSet('token:price:eth', slowFetcher);
    const call4 = manager.getOrSet('token:price:eth', slowFetcher);
    const call5 = manager.getOrSet('token:price:eth', slowFetcher);

    expect(manager.getInFlightCount()).toBe(1);

    await jest.advanceTimersByTimeAsync(60);
    const [res1, res2, res3, res4, res5] = await Promise.all([call1, call2, call3, call4, call5]);

    expect(providerCalls).toBe(1);
    expect(res1).toEqual({ price: '3450.50' });
    expect(res2).toEqual({ price: '3450.50' });
    expect(res3).toEqual({ price: '3450.50' });
    expect(res4).toEqual({ price: '3450.50' });
    expect(res5).toEqual({ price: '3450.50' });
    expect(manager.getInFlightCount()).toBe(0);
  });

  it('should return stale-while-revalidate data when provider is down', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const redis = new RedisCache({ client: mockClient });
    const manager = new CacheManager({ redis });

    // 1. Initial success caches data with 10s TTL
    await manager.getOrSet(
      'token:price:btc',
      async (): Promise<{ price: string }> => ({ price: '65000' }),
      { ttlSeconds: 10 },
    );

    // 2. Advance time past 10s TTL -> data is now stale
    await jest.advanceTimersByTimeAsync(11000);
    expect(await manager.get('token:price:btc')).toBeNull();

    // 3. Provider fails on refresh -> stale data should be returned
    const failingFetcher = async (): Promise<{ price: string }> => {
      throw new ProviderError('birdeye', 'Upstream 502 Bad Gateway', 502);
    };

    const staleResult = await manager.getOrSet('token:price:btc', failingFetcher);
    expect(staleResult).toEqual({ price: '65000' });
  });

  it('should throw provider error if no stale data exists', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const redis = new RedisCache({ client: mockClient });
    const manager = new CacheManager({ redis });

    const failingFetcher = async (): Promise<never> => {
      throw new ProviderError('dexscreener', 'Rate limit 429', 429);
    };

    await expect(manager.getOrSet('unknown:pair', failingFetcher)).rejects.toBeInstanceOf(
      ProviderError,
    );
  });

  it('should support del and clear across tiers', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const redis = new RedisCache({ client: mockClient });
    const manager = new CacheManager({ redis });

    await manager.set('item1', 'data1');
    expect(await manager.del('item1')).toBe(true);
    expect(await manager.get('item1')).toBeNull();

    await manager.set('item2', 'data2');
    await manager.clear();
    expect(await manager.get('item2')).toBeNull();
  });
});
