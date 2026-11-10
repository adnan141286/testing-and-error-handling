import { MemoryCache } from '../../src/services/cache/memoryCache';

describe('MemoryCache', (): void => {
  beforeEach((): void => {
    jest.useFakeTimers();
  });

  afterEach((): void => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should store and retrieve fresh values', async (): Promise<void> => {
    const cache = new MemoryCache(60);
    await cache.set('wallet:0x1', { balance: '100' });

    const val = await cache.get<{ balance: string }>('wallet:0x1');
    expect(val).toEqual({ balance: '100' });
    expect(await cache.has('wallet:0x1')).toBe(true);
    expect(await cache.size()).toBe(1);
  });

  it('should return null for expired entries on get, but allow getStale retrieval', async (): Promise<void> => {
    const cache = new MemoryCache(10);
    await cache.set('temp-key', 'active-data', 5);

    expect(await cache.get<string>('temp-key')).toBe('active-data');

    // Advance 6 seconds -> now expired
    jest.advanceTimersByTime(6000);

    expect(await cache.get<string>('temp-key')).toBeNull();
    expect(await cache.getStale<string>('temp-key')).toBe('active-data');
    expect(await cache.has('temp-key')).toBe(false);
  });

  it('should delete and clear entries', async (): Promise<void> => {
    const cache = new MemoryCache();
    await cache.set('key1', 'val1');
    await cache.set('key2', 'val2');

    expect(await cache.del('key1')).toBe(true);
    expect(await cache.get('key1')).toBeNull();

    await cache.clear();
    expect(await cache.size()).toBe(0);
  });

  it('should prune expired entries from the store', async (): Promise<void> => {
    const cache = new MemoryCache();
    await cache.set('fresh', 'data', 100);
    await cache.set('expired1', 'data', 1);
    await cache.set('expired2', 'data', 2);

    jest.advanceTimersByTime(3000);

    const pruned = await cache.prune();
    expect(pruned).toBe(2);
    expect(await cache.size()).toBe(1);
    expect(await cache.get('fresh')).toBe('data');
  });

  it('should return null for non-existent keys on get and getStale', async (): Promise<void> => {
    const cache = new MemoryCache();
    expect(await cache.get('unknown')).toBeNull();
    expect(await cache.getStale('unknown')).toBeNull();
  });
});
