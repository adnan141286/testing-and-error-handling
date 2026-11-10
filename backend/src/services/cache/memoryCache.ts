import { env } from '../../config/env';

/**
 * Structure of a cached value supporting freshness and stale retrieval.
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  storedAt: number;
}

/**
 * Fast in-memory key-value cache implementation supporting TTL expiration and stale access.
 */
export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlSeconds: number;

  /**
   * Initializes a new MemoryCache instance.
   *
   * @param defaultTtlSeconds - Default time-to-live in seconds
   */
  public constructor(defaultTtlSeconds: number = env.CACHE_TTL_DEFAULT_SECONDS) {
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  /**
   * Retrieves a non-expired cached value.
   *
   * @param key - Cache key
   * @returns Cached value if fresh, or null if expired or missing
   */
  public async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      return null;
    }

    return entry.value;
  }

  /**
   * Retrieves cached value even if expired (stale-while-revalidate fallback).
   *
   * @param key - Cache key
   * @returns Stale cached value, or null if key does not exist
   */
  public async getStale<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    return entry ? entry.value : null;
  }

  /**
   * Stores a value in memory with a specified or default TTL.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time-to-live in seconds
   */
  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttl * 1000,
      storedAt: now,
    };
    this.store.set(key, entry);
  }

  /**
   * Removes a specific key from the cache.
   *
   * @param key - Cache key to remove
   * @returns True if key existed and was deleted
   */
  public async del(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  /**
   * Clears all entries from the cache.
   */
  public async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Checks whether a fresh (non-expired) key exists.
   *
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  public async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  /**
   * Returns current count of entries in memory cache.
   *
   * @returns Number of stored entries
   */
  public async size(): Promise<number> {
    return this.store.size;
  }

  /**
   * Prunes all expired entries to prevent memory leaks.
   *
   * @returns Number of pruned expired entries
   */
  public async prune(): Promise<number> {
    const now = Date.now();
    let prunedCount = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        prunedCount++;
      }
    }
    return prunedCount;
  }
}
