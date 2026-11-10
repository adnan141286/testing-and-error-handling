import { env } from '../../config/env';
import { PROVIDERS } from '../../config/constants';
import { ResilientHttpClient, TokenBucket, CircuitBreaker } from '../resilience';
import { CacheManager } from '../cache';
import { coinGeckoPriceSchema } from '../../sanitizers/schemas';

/**
 * Options configuring the CoinGeckoClient.
 */
export interface CoinGeckoClientOptions {
  httpClient?: ResilientHttpClient;
  cacheManager?: CacheManager;
  baseUrl?: string;
}

/**
 * CoinGecko price client providing fallback token pricing with rate limiting and circuit breaking.
 */
export class CoinGeckoClient {
  private readonly httpClient: ResilientHttpClient;
  private readonly cacheManager: CacheManager;
  private readonly baseUrl: string;

  /**
   * Initializes a new CoinGeckoClient instance with dependency injection.
   *
   * @param options - Injected HTTP client, cache manager, and base URL
   */
  public constructor(options: CoinGeckoClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? env.COINGECKO_BASE_URL;
    this.cacheManager = options.cacheManager ?? new CacheManager();
    this.httpClient =
      options.httpClient ??
      new ResilientHttpClient({
        providerName: PROVIDERS.COINGECKO,
        tokenBucket: new TokenBucket({
          capacity: 10,
          refillRatePerSecond: env.COINGECKO_RATE_LIMIT_RPM / 60,
        }),
        circuitBreaker: new CircuitBreaker({ serviceName: PROVIDERS.COINGECKO }),
      });
  }

  /**
   * Fetches the USD price and update timestamp for a given CoinGecko asset id.
   *
   * @param coinId - Asset identifier on CoinGecko
   * @returns Price in USD and timestamp in epoch ms, or null if unavailable/invalid
   */
  public async getPriceWithTimestamp(
    coinId: string,
  ): Promise<{ price: number; timestamp: number } | null> {
    const normalizedId = coinId.toLowerCase().trim();
    const cacheKey = `token:price:coingecko:ts:${normalizedId}`;

    return this.cacheManager.getOrSet(
      cacheKey,
      async (): Promise<{ price: number; timestamp: number } | null> => {
        const url = `${this.baseUrl}/simple/price?ids=${encodeURIComponent(normalizedId)}&vs_currencies=usd&include_last_updated_at=true`;
        const res = await this.httpClient.get<unknown>(url);
        const parsed = coinGeckoPriceSchema.safeParse(res.data);
        if (!parsed.success) {
          return null;
        }
        const coinData = parsed.data[normalizedId];
        if (!coinData?.usd) return null;
        const timestamp = coinData.last_updated_at ? coinData.last_updated_at * 1000 : Date.now();
        return { price: coinData.usd, timestamp };
      },
      { ttlSeconds: 15 },
    );
  }

  /**
   * Fetches the USD price for a given CoinGecko asset id (e.g. 'bitcoin', 'ethereum').
   *
   * @param coinId - Asset identifier on CoinGecko
   * @returns Price in USD, or null if unavailable/invalid
   */
  public async getPrice(coinId: string): Promise<number | null> {
    const normalizedId = coinId.toLowerCase().trim();
    const cacheKey = `token:price:coingecko:${normalizedId}`;

    return this.cacheManager.getOrSet(
      cacheKey,
      async (): Promise<number | null> => {
        const url = `${this.baseUrl}/simple/price?ids=${encodeURIComponent(normalizedId)}&vs_currencies=usd`;
        const res = await this.httpClient.get<unknown>(url);
        const parsed = coinGeckoPriceSchema.safeParse(res.data);
        if (!parsed.success) {
          return null;
        }
        return parsed.data[normalizedId]?.usd ?? null;
      },
      { ttlSeconds: 15 },
    );
  }

  /**
   * Fetches the 1-day market chart prices for a coin from CoinGecko.
   *
   * @param coinId - CoinGecko asset id (e.g. 'ethereum', 'bitcoin')
   * @returns Array of [timestampMs, priceUsd] pairs
   */
  public async getMarketChartPrices(coinId: string): Promise<[number, number][]> {
    const normalizedId = coinId.toLowerCase().trim();
    const cacheKey = `token:chart:coingecko:${normalizedId}`;

    return this.cacheManager.getOrSet(
      cacheKey,
      async (): Promise<[number, number][]> => {
        const url = `${this.baseUrl}/coins/${encodeURIComponent(normalizedId)}/market_chart?vs_currency=usd&days=1`;
        const res = await this.httpClient.get<{ prices?: [number, number][] }>(url);
        if (res.data && Array.isArray(res.data.prices)) {
          return res.data.prices.filter(
            (p) => Array.isArray(p) && p.length >= 2 && typeof p[1] === 'number',
          );
        }
        return [];
      },
      { ttlSeconds: 300 },
    );
  }
}
