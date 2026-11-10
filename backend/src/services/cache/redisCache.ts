import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { env } from '../../config/env';
import { CacheEntry } from './memoryCache';

/**
 * Options configuring RedisCache instance.
 */
export interface RedisCacheOptions {
  client?: Redis;
  defaultTtlSeconds?: number;
  staleRetentionMultiplier?: number;
}

/**
 * Redis-backed cache client supporting connection tracking and stale data persistence.
 */
export class RedisCache {
  private readonly client: Redis;
  private readonly defaultTtlSeconds: number;
  private readonly staleRetentionMultiplier: number;
  private healthy = false;

  /**
   * Initializes a new RedisCache instance.
   *
   * @param options - Redis client and TTL configuration
   */
  public constructor(options: RedisCacheOptions = {}) {
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? env.CACHE_TTL_DEFAULT_SECONDS;
    this.staleRetentionMultiplier = options.staleRetentionMultiplier ?? 3;

    if (options.client) {
      this.client = options.client;
      this.healthy = true;
    } else if (env.NODE_ENV === 'test') {
      this.client = new RedisMock() as unknown as Redis;
      this.healthy = true;
    } else {
      this.client = new Redis(env.REDIS_URL, {
        lazyConnect: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        enableOfflineQueue: false,
        retryStrategy: (times: number): number | null => (times > 5 ? null : 1000),
      });
    }

    this.setupListeners();
  }

  /**
   * Returns whether the Redis client is currently connected and healthy.
   *
   * @returns True if Redis is ready and available
   */
  public isHealthy(): boolean {
    return this.healthy || this.client.status === 'ready';
  }

  /**
   * Retrieves a non-expired cached value from Redis.
   *
   * @param key - Cache key
   * @returns Fresh cached value, or null if expired or missing
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) {
        return null;
      }
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (Date.now() > entry.expiresAt) {
        return null;
      }
      return entry.value;
    } catch {
      this.healthy = false;
      return null;
    }
  }

  /**
   * Retrieves cached value even if expired (stale-while-revalidate support).
   *
   * @param key - Cache key
   * @returns Stale cached value, or null if missing or error
   */
  public async getStale<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) {
        return null;
      }
      const entry = JSON.parse(raw) as CacheEntry<T>;
      return entry.value;
    } catch {
      this.healthy = false;
      return null;
    }
  }

  /**
   * Stores a value in Redis with dual TTL (logical freshness + extended physical retention).
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Logical time-to-live in seconds
   */
  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttl * 1000,
      storedAt: now,
    };

    try {
      const physicalTtl = Math.max(ttl * this.staleRetentionMultiplier, ttl + 60);
      await this.client.set(key, JSON.stringify(entry), 'EX', physicalTtl);
      this.healthy = true;
    } catch {
      this.healthy = false;
    }
  }

  /**
   * Deletes a key from Redis.
   *
   * @param key - Key to delete
   * @returns True if deleted
   */
  public async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch {
      this.healthy = false;
      return false;
    }
  }

  /**
   * Flushes keys or deletes matching keys.
   */
  public async clear(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch {
      this.healthy = false;
    }
  }

  /**
   * Disconnects the Redis connection gracefully.
   */
  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    } finally {
      this.healthy = false;
    }
  }

  /**
   * Binds event listeners to track connection health.
   */
  private setupListeners(): void {
    this.client.on('ready', (): void => {
      this.healthy = true;
    });
    this.client.on('error', (): void => {
      this.healthy = false;
    });
    this.client.on('close', (): void => {
      this.healthy = false;
    });
  }
}
