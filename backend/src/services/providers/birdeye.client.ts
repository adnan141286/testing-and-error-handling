import { env } from '../../config/env';
import { PROVIDERS } from '../../config/constants';
import { ResilientHttpClient, TokenBucket } from '../resilience';
import { CacheManager } from '../cache';
import { RawBirdeyePriceResponse, RawBirdeyeOverviewResponse } from './types';

/**
 * Options configuring BirdeyeClient.
 */
export interface BirdeyeClientOptions {
  httpClient?: ResilientHttpClient;
  cacheManager?: CacheManager;
  baseUrl?: string;
  apiKey?: string;
}

/**
 * Birdeye DeFi market data client integrating caching and resilience HTTP policies.
 */
export class BirdeyeClient {
  private readonly httpClient: ResilientHttpClient;
  private readonly cacheManager: CacheManager;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  /**
   * Initializes a new BirdeyeClient instance with dependency injection.
   *
   * @param options - Injected HTTP client, cache manager, and credentials
   */
  public constructor(options: BirdeyeClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? env.BIRDEYE_BASE_URL;
    this.apiKey = options.apiKey ?? env.BIRDEYE_API_KEY;
    this.cacheManager = options.cacheManager ?? new CacheManager();
    this.httpClient =
      options.httpClient ??
      new ResilientHttpClient({
        providerName: PROVIDERS.BIRDEYE,
        tokenBucket: new TokenBucket({
          capacity: 1,
          refillRatePerSecond: env.BIRDEYE_RATE_LIMIT_RPS,
        }),
      });
  }

  /**
   * Fetches the current price and 24h price change for a token.
   *
   * @param address - Token mint or contract address
   * @param chain - Target blockchain network (defaults to 'solana')
   * @returns Raw Birdeye price response
   */
  public async getTokenPrice(address: string, chain = 'solana'): Promise<RawBirdeyePriceResponse> {
    const cacheKey = `token:price:birdeye:${chain}:${address.toLowerCase()}`;
    const url = `${this.baseUrl}/defi/price?address=${address}`;

    return this.cacheManager.getOrSet(cacheKey, async (): Promise<RawBirdeyePriceResponse> => {
      const headers = {
        'X-API-KEY': this.apiKey,
        'x-chain': chain,
      };
      const res = await this.httpClient.get<RawBirdeyePriceResponse>(url, { headers });
      return res.data;
    });
  }

  /**
   * Fetches comprehensive token metrics, liquidity, and 24h volume.
   *
   * @param address - Token contract address
   * @param chain - Target blockchain network (defaults to 'solana')
   * @returns Raw Birdeye token overview response
   */
  public async getTokenOverview(
    address: string,
    chain = 'solana',
  ): Promise<RawBirdeyeOverviewResponse> {
    const cacheKey = `token:metrics:birdeye:${chain}:${address.toLowerCase()}`;
    const url = `${this.baseUrl}/defi/token_overview?address=${address}`;

    return this.cacheManager.getOrSet(cacheKey, async (): Promise<RawBirdeyeOverviewResponse> => {
      const headers = {
        'X-API-KEY': this.apiKey,
        'x-chain': chain,
      };
      const res = await this.httpClient.get<RawBirdeyeOverviewResponse>(url, { headers });
      return res.data;
    });
  }

  /**
   * Fetches transaction history for a wallet address from Birdeye.
   *
   * @param address - Wallet public key / address
   * @param chain - Target blockchain network (default: 'solana')
   * @returns Raw transaction list
   */
  public async getWalletTransactions(address: string, chain = 'solana'): Promise<unknown[]> {
    const url = `${this.baseUrl}/defi/txs/token?address=${address}&limit=20`;
    const headers = {
      'X-API-KEY': this.apiKey,
      'x-chain': chain,
    };
    const res = await this.httpClient.get<{ data?: { items?: unknown[] } }>(url, { headers });
    return res.data?.data?.items ?? [];
  }
}
