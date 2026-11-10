import { env } from '../../config/env';
import { PROVIDERS } from '../../config/constants';
import { ResilientHttpClient } from '../resilience';
import { CacheManager } from '../cache';
import { RawGoPlusTokenSecurityResponse, RawGoPlusAddressSecurityResponse } from './types';

/**
 * Configuration options for GoPlusClient.
 */
export interface GoPlusClientOptions {
  httpClient?: ResilientHttpClient;
  cacheManager?: CacheManager;
  baseUrl?: string;
  apiKey?: string;
}

/**
 * GoPlus security analysis client integrating caching and resilience HTTP policies.
 */
export class GoPlusClient {
  private readonly httpClient: ResilientHttpClient;
  private readonly cacheManager: CacheManager;
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  /**
   * Initializes a new GoPlusClient instance with dependency injection.
   *
   * @param options - Injected HTTP client, cache manager, and credentials
   */
  public constructor(options: GoPlusClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? env.GOPLUS_BASE_URL;
    this.apiKey = options.apiKey ?? env.GOPLUS_API_KEY;
    this.cacheManager = options.cacheManager ?? new CacheManager();
    this.httpClient =
      options.httpClient ??
      new ResilientHttpClient({
        providerName: PROVIDERS.GOPLUS,
      });
  }

  /**
   * Fetches token security analysis including honeypot, taxes, and blacklists.
   *
   * @param chainId - Chain identifier (e.g. '1' for Ethereum, '56' for BSC, 'solana')
   * @param contractAddress - Token contract address
   * @returns Raw GoPlus token security response
   */
  public async getTokenSecurity(
    chainId: string,
    contractAddress: string,
  ): Promise<RawGoPlusTokenSecurityResponse> {
    const isSolana = chainId.toLowerCase() === 'solana';
    const normalizedAddress = isSolana
      ? contractAddress.trim()
      : contractAddress.toLowerCase().trim();
    const cacheKey = `token:security:goplus:${chainId}:${normalizedAddress}`;
    const url = isSolana
      ? `${this.baseUrl}/api/v1/solana/token_security?contract_addresses=${normalizedAddress}`
      : `${this.baseUrl}/api/v1/token_security/${chainId}?contract_addresses=${normalizedAddress}`;

    return this.cacheManager.getOrSet(
      cacheKey,
      async (): Promise<RawGoPlusTokenSecurityResponse> => {
        const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined;
        const res = await this.httpClient.get<RawGoPlusTokenSecurityResponse>(url, { headers });
        return res.data;
      },
      { ttlSeconds: 3600 },
    );
  }

  /**
   * Fetches address security information to assess phishing, sanction, or malicious activity.
   *
   * @param address - Wallet or contract address
   * @param chainId - Chain identifier (defaults to '1')
   * @returns Raw GoPlus address security analysis response
   */
  public async getAddressSecurity(
    address: string,
    chainId = '1',
  ): Promise<RawGoPlusAddressSecurityResponse> {
    const normalizedAddress = address.toLowerCase().trim();
    const cacheKey = `wallet:security:goplus:${chainId}:${normalizedAddress}`;
    const url = `${this.baseUrl}/api/v1/address_security/${normalizedAddress}?chain_id=${chainId}`;

    return this.cacheManager.getOrSet(
      cacheKey,
      async (): Promise<RawGoPlusAddressSecurityResponse> => {
        const headers = this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined;
        const res = await this.httpClient.get<RawGoPlusAddressSecurityResponse>(url, { headers });
        return res.data;
      },
      { ttlSeconds: 3600 },
    );
  }
}
