import { env } from '../../config/env';
import { MemoryCache } from './memoryCache';
import { RedisCache } from './redisCache';

/** Options for configuring the CacheManager instance. */
export interface CacheManagerOptions {
  redis?: RedisCache;
  memory?: MemoryCache;
  defaultTtlSeconds?: number;
  endpointTtls?: Record<string, number>;
}

/** Options for individual getOrSet operations. */
export interface CacheOptions {
  ttlSeconds?: number;
  allowStaleFallback?: boolean;
}

/** Multi-tier Cache Manager providing L1 memory and L2 Redis caching with single-flight de-duplication. */
export class CacheManager {
  private readonly redis: RedisCache;
  private readonly memory: MemoryCache;
  private readonly defaultTtlSeconds: number;
  private readonly endpointTtls: Record<string, number>;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  public constructor(options: CacheManagerOptions = {}) {
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? env.CACHE_TTL_DEFAULT_SECONDS;
    this.endpointTtls = options.endpointTtls ?? {
      'token:price': env.CACHE_TTL_PRICE_SECONDS,
      'token:metrics': env.CACHE_TTL_TOKEN_METRICS_SECONDS,
      'token:security': env.CACHE_TTL_SECURITY_INFO_SECONDS,
    };
    this.memory = options.memory ?? new MemoryCache(this.defaultTtlSeconds);
    this.redis = options.redis ?? new RedisCache({ defaultTtlSeconds: this.defaultTtlSeconds });
  }

  /** Resolves the configured TTL in seconds for a given key or endpoint prefix. */
  public getTtl(keyOrEndpoint: string): number {
    for (const [prefix, ttl] of Object.entries(this.endpointTtls)) {
      if (keyOrEndpoint.startsWith(prefix) || keyOrEndpoint.includes(prefix)) {
        return ttl;
      }
    }
    return this.defaultTtlSeconds;
  }

  /**
   * Retrieves fresh cached data along with resolving tier (L1 memory or L2 Redis).
   */
  public async getDetailed<T>(key: string): Promise<{ value: T | null; tier: 'L1' | 'L2' | null }> {
    const memVal = await this.memory.get<T>(key);
    if (memVal !== null) return { value: memVal, tier: 'L1' };
    if (this.redis.isHealthy()) {
      const redisVal = await this.redis.get<T>(key);
      if (redisVal !== null) {
        await this.memory.set(key, redisVal, this.getTtl(key));
        return { value: redisVal, tier: 'L2' };
      }
    }
    return { value: null, tier: null };
  }

  /**
   * Retrieves fresh cached data, checking L1 memory first and L2 Redis second.
   */
  public async get<T>(key: string): Promise<T | null> {
    return (await this.getDetailed<T>(key)).value;
  }

  /**
   * Retrieves stale cached data from Redis or memory fallback.
   *
   * @param key - Cache key
   * @returns Stale cached value, or null if never cached
   */
  public async getStale<T>(key: string): Promise<T | null> {
    if (this.redis.isHealthy()) {
      const redisStale = await this.redis.getStale<T>(key);
      if (redisStale !== null) {
        return redisStale;
      }
    }
    return this.memory.getStale<T>(key);
  }

  /**
   * Stores value into cache, populating both Redis (if healthy) and memory fallback.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Optional custom TTL override
   */
  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.getTtl(key);
    await this.memory.set(key, value, ttl);
    if (this.redis.isHealthy()) {
      await this.redis.set(key, value, ttl);
    }
  }

  /**
   * Deletes a key from all cache tiers.
   *
   * @param key - Cache key
   * @returns True if deleted from either tier
   */
  public async del(key: string): Promise<boolean> {
    const memDeleted = await this.memory.del(key);
    const redisDeleted = this.redis.isHealthy() ? await this.redis.del(key) : false;
    return memDeleted || redisDeleted;
  }

  /**
   * Clears all cache tiers.
   */
  public async clear(): Promise<void> {
    await this.memory.clear();
    if (this.redis.isHealthy()) {
      await this.redis.clear();
    }
  }

  /**
   * De-duplicates concurrent identical calls and provides stale fallback on fetch failure.
   *
   * @param key - Cache key
   * @param fetcher - Provider operation to invoke if cache miss occurs
   * @param options - Cache options including TTL and stale fallback policy
   * @returns Resolved cached or fetched data
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const inFlightPromise = this.inFlight.get(key);
    if (inFlightPromise) {
      return inFlightPromise as Promise<T>;
    }

    const task = (async (): Promise<T> => {
      try {
        const cached = await this.get<T>(key);
        if (cached !== null) {
          return cached;
        }

        const fresh = await fetcher();
        const ttl = options.ttlSeconds ?? this.getTtl(key);
        await this.set(key, fresh, ttl);
        return fresh;
      } catch (error: unknown) {
        const allowStale = options.allowStaleFallback ?? true;
        if (allowStale) {
          const stale = await this.getStale<T>(key);
          if (stale !== null) {
            return stale;
          }
        }
        throw error;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, task);
    return task;
  }

  /**
   * Returns whether the Redis backend is currently healthy.
   *
   * @returns True if Redis is online
   */
  public isRedisHealthy(): boolean {
    return this.redis.isHealthy();
  }

  /**
   * Returns current count of de-duplicated in-flight executions.
   *
   * @returns Number of in-flight promises
   */
  public getInFlightCount(): number {
    return this.inFlight.size;
  }
}
