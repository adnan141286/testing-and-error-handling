import RedisMock from 'ioredis-mock';
import { RedisCache } from '../../src/services/cache/redisCache';

describe('RedisCache with Mocked Redis', (): void => {
  beforeEach((): void => {
    jest.useFakeTimers();
  });

  afterEach((): void => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should initialize and report healthy with injected mock client', (): void => {
    const mockClient = new RedisMock();
    const cache = new RedisCache({ client: mockClient });
    expect(cache.isHealthy()).toBe(true);
  });

  it('should set and get fresh entries from Redis', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const cache = new RedisCache({ client: mockClient, defaultTtlSeconds: 30 });

    await cache.set('token:123', { priceUsd: '10.5' });
    const fresh = await cache.get<{ priceUsd: string }>('token:123');

    expect(fresh).toEqual({ priceUsd: '10.5' });
  });

  it('should return null for expired entries on get, but allow getStale', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const cache = new RedisCache({ client: mockClient, defaultTtlSeconds: 5 });

    await cache.set('expiring-token', { symbol: 'SOL' }, 5);
    expect(await cache.get<{ symbol: string }>('expiring-token')).toEqual({
      symbol: 'SOL',
    });

    // Advance 6 seconds -> logical TTL expires
    jest.advanceTimersByTime(6000);

    expect(await cache.get<{ symbol: string }>('expiring-token')).toBeNull();
    const stale = await cache.getStale<{ symbol: string }>('expiring-token');
    expect(stale).toEqual({ symbol: 'SOL' });
  });

  it('should delete and clear entries properly', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const cache = new RedisCache({ client: mockClient });

    await cache.set('k1', 'v1');
    expect(await cache.del('k1')).toBe(true);
    expect(await cache.get('k1')).toBeNull();

    await cache.set('k2', 'v2');
    await cache.clear();
    expect(await cache.get('k2')).toBeNull();
  });

  it('should handle non-existent keys gracefully', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const cache = new RedisCache({ client: mockClient });

    expect(await cache.get('non-existent')).toBeNull();
    expect(await cache.getStale('non-existent')).toBeNull();
    expect(await cache.del('non-existent')).toBe(false);
  });

  it('should degrade gracefully and mark unhealthy if Redis operations throw', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const cache = new RedisCache({ client: mockClient });

    jest.spyOn(mockClient, 'get').mockRejectedValueOnce(new Error('Connection lost'));
    const result = await cache.get('any-key');
    expect(result).toBeNull();
    expect(cache.isHealthy()).toBe(false);

    jest.spyOn(mockClient, 'set').mockRejectedValueOnce(new Error('Write error'));
    await cache.set('any-key', 'value');
    expect(cache.isHealthy()).toBe(false);

    jest.spyOn(mockClient, 'del').mockRejectedValueOnce(new Error('Del error'));
    expect(await cache.del('any-key')).toBe(false);

    jest.spyOn(mockClient, 'flushdb').mockRejectedValueOnce(new Error('Flush error'));
    await cache.clear();
    expect(cache.isHealthy()).toBe(false);

    jest.spyOn(mockClient, 'get').mockRejectedValueOnce(new Error('Stale read error'));
    expect(await cache.getStale('any-key')).toBeNull();
  });

  it('should disconnect cleanly', async (): Promise<void> => {
    const mockClient = new RedisMock();
    const cache = new RedisCache({ client: mockClient });
    await cache.disconnect();
    expect(cache.isHealthy()).toBe(false);
  });
});
