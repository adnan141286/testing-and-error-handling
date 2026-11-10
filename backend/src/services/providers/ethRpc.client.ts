import { env } from '../../config/env';
import { PROVIDERS } from '../../config/constants';
import { ResilientHttpClient, CircuitBreaker } from '../resilience';
import { CacheManager } from '../cache';
import { ethGasPriceSchema } from '../../sanitizers/schemas';
import { ProviderError } from '../../errors/ProviderError';

/**
 * Result structure returned by EthRpcClient.getGasPriceGwei().
 */
export interface GasPriceResult {
  gwei: number;
  rawWei: string;
}

/**
 * Options configuring the EthRpcClient.
 */
export interface EthRpcClientOptions {
  httpClient?: ResilientHttpClient;
  cacheManager?: CacheManager;
  rpcUrl?: string;
}

/**
 * Ethereum JSON-RPC client for fetching real-time gas prices with caching and resilience.
 */
export class EthRpcClient {
  private readonly httpClient: ResilientHttpClient;
  private readonly cacheManager: CacheManager;
  private readonly rpcUrl: string;

  /**
   * Initializes a new EthRpcClient instance with dependency injection.
   *
   * @param options - Injected HTTP client, cache manager, and RPC URL
   */
  public constructor(options: EthRpcClientOptions = {}) {
    this.rpcUrl = options.rpcUrl ?? env.ETH_RPC_URL;
    this.cacheManager = options.cacheManager ?? new CacheManager();
    this.httpClient =
      options.httpClient ??
      new ResilientHttpClient({
        providerName: PROVIDERS.ETH_RPC,
        circuitBreaker: new CircuitBreaker({ serviceName: PROVIDERS.ETH_RPC }),
      });
  }

  /**
   * Fetches the current Ethereum gas price in Gwei.
   *
   * @returns Object with gwei value and raw wei string
   * @throws ProviderError if upstream RPC fails or returns malformed response
   */
  public async getGasPriceGwei(): Promise<GasPriceResult> {
    const cacheKey = 'network:gas:eth';

    return this.cacheManager.getOrSet(
      cacheKey,
      async (): Promise<GasPriceResult> => {
        const payload = {
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1,
        };

        const res = await this.httpClient.post<unknown>(this.rpcUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
        });

        const parsed = ethGasPriceSchema.safeParse(res.data);
        if (!parsed.success) {
          throw new ProviderError(
            'eth_rpc',
            `Invalid JSON-RPC gas response: ${parsed.error.message}`,
            502,
          );
        }

        const hexStr = parsed.data.result;
        const weiBigInt = BigInt(hexStr);
        // Convert wei to gwei (1 gwei = 10^9 wei)
        const gwei = Number(weiBigInt) / 1e9;

        return {
          gwei,
          rawWei: weiBigInt.toString(),
        };
      },
      { ttlSeconds: 15, allowStaleFallback: false },
    );
  }

  /**
   * Fetches the latest block with transactions from Ethereum RPC.
   *
   * @returns Raw block object with transactions array
   */
  public async getLatestBlockTransactions(): Promise<{
    number: string;
    hash: string;
    timestamp: string;
    transactions: Array<{
      hash: string;
      from: string;
      to?: string | null;
      value: string;
      gas?: string;
      gasPrice?: string;
    }>;
  }> {
    const payload = {
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: ['latest', true],
      id: 2,
    };

    const res = await this.httpClient.post<{
      result?: {
        number: string;
        hash: string;
        timestamp: string;
        transactions: Array<{
          hash: string;
          from: string;
          to?: string | null;
          value: string;
          gas?: string;
          gasPrice?: string;
        }>;
      };
    }>(this.rpcUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.data?.result || !Array.isArray(res.data.result.transactions)) {
      throw new ProviderError('eth_rpc', 'Invalid JSON-RPC eth_getBlockByNumber response', 502);
    }

    return res.data.result;
  }
}
