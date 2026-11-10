import { env } from '../../config/env';
import { PROVIDERS } from '../../config/constants';
import { ResilientHttpClient } from '../resilience';
import { CacheManager } from '../cache';
import { RawDexScreenerResponse } from './types';

/**
 * Configuration options for DexScreenerClient.
 */
export interface DexScreenerClientOptions {
  httpClient?: ResilientHttpClient;
  cacheManager?: CacheManager;
  baseUrl?: string;
  apiKey?: string;
}

/**
 * DexScreener market data API client using resilience HTTP client and caching.
 */
export class DexScreenerClient {
  private readonly httpClient: ResilientHttpClient;
  private readonly cacheManager: CacheManager;
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  /**
   * Initializes a new DexScreenerClient instance with dependency injection.
   *
   * @param options - Injected HTTP client, cache manager, and credentials
   */
  public constructor(options: DexScreenerClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? env.DEXSCREENER_BASE_URL;
    this.apiKey = options.apiKey ?? env.DEXSCREENER_API_KEY;
    this.cacheManager = options.cacheManager ?? new CacheManager();
    this.httpClient =
      options.httpClient ??
      new ResilientHttpClient({
        providerName: PROVIDERS.DEXSCREENER,
      });
  }

  /**
   * Fetches pair data by chain and pair contract address.
   *
   * @param chainId - Blockchain identifier (e.g., 'ethereum', 'solana')
   * @param pairAddress - Liquidity pool contract address
   * @returns Raw DexScreener response payload
   */
  public async getPairsByAddress(
    chainId: string,
    pairAddress: string,
  ): Promise<RawDexScreenerResponse> {
    const cacheKey = `dexscreener:pair:${chainId}:${pairAddress.toLowerCase()}`;
    const url = `${this.baseUrl}/latest/dex/pairs/${chainId}/${pairAddress}`;

    return this.cacheManager.getOrSet(cacheKey, async (): Promise<RawDexScreenerResponse> => {
      const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined;
      const res = await this.httpClient.get<RawDexScreenerResponse>(url, { headers });
      return res.data;
    });
  }

  /**
   * Fetches all pairs containing the given token address.
   *
   * @param tokenAddress - Target token contract address
   * @returns Raw DexScreener response payload
   */
  public async getTokenPairs(tokenAddress: string): Promise<RawDexScreenerResponse> {
    const cacheKey = `dexscreener:tokens:${tokenAddress.toLowerCase()}`;
    const url = `${this.baseUrl}/latest/dex/tokens/${tokenAddress}`;

    return this.cacheManager.getOrSet(cacheKey, async (): Promise<RawDexScreenerResponse> => {
      const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined;
      const res = await this.httpClient.get<RawDexScreenerResponse>(url, { headers });
      return res.data;
    });
  }

  /**
   * Searches for DEX pairs by symbol, name, or token address query.
   *
   * @param query - Search keyword or symbol
   * @returns Raw DexScreener search results
   */
  public async searchPairs(query: string): Promise<RawDexScreenerResponse> {
    const cacheKey = `dexscreener:search:${query.toLowerCase()}`;
    const url = `${this.baseUrl}/latest/dex/search?q=${encodeURIComponent(query)}`;

    return this.cacheManager.getOrSet(cacheKey, async (): Promise<RawDexScreenerResponse> => {
      const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined;
      const res = await this.httpClient.get<RawDexScreenerResponse>(url, { headers });
      return res.data;
    });
  }
}
