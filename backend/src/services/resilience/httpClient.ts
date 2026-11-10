import { TokenBucket } from './tokenBucket';
import { CircuitBreaker } from './circuitBreaker';
import { executeWithRetry, BackoffOptions } from './backoff';
import { RateLimitError, ProviderError, CircuitOpenError } from '../../errors';
import { sendRawRequest, HttpResponse, HttpRequestOptions } from './requestSender';
import { diagnosticsTracker } from '../../utils/diagnosticsTracker';

export { HttpResponse, HttpRequestOptions, sendRawRequest };

/**
 * Options configuring ResilientHttpClient instance.
 */
export interface ResilientHttpClientOptions {
  providerName?: string;
  circuitBreaker?: CircuitBreaker;
  tokenBucket?: TokenBucket;
  backoffOptions?: BackoffOptions;
  timeoutMs?: number;
}

/**
 * Resilient HTTP client combining TokenBucket, CircuitBreaker, and Exponential Backoff.
 */
export class ResilientHttpClient {
  public readonly providerName: string;
  public readonly circuitBreaker: CircuitBreaker;
  public readonly tokenBucket?: TokenBucket;
  public readonly backoffOptions: BackoffOptions;
  private readonly defaultTimeoutMs: number;

  /**
   * Initializes a new ResilientHttpClient instance.
   *
   * @param options - Resilience policies and provider configuration
   */
  public constructor(options: ResilientHttpClientOptions = {}) {
    this.providerName = options.providerName ?? 'unknown_provider';
    this.circuitBreaker =
      options.circuitBreaker ?? new CircuitBreaker({ serviceName: this.providerName });
    this.tokenBucket = options.tokenBucket;
    this.backoffOptions = options.backoffOptions ?? {};
    this.defaultTimeoutMs = options.timeoutMs ?? 10000;
  }

  /**
   * Sends an HTTP request protected by rate limiting, circuit breaking, and retries.
   *
   * @param url - Destination endpoint URL
   * @param options - Request method, headers, payload, and timeout
   * @returns Typed response payload
   */
  public async request<T = unknown>(
    url: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    if (this.tokenBucket) {
      await this.tokenBucket.consume();
    }

    return executeWithRetry<HttpResponse<T>>(
      async (): Promise<HttpResponse<T>> => {
        return this.circuitBreaker.execute<HttpResponse<T>>(async (): Promise<HttpResponse<T>> => {
          const t0 = Date.now();
          const res = await sendRawRequest<T>(url, {
            ...options,
            timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
          });
          diagnosticsTracker.recordLatency(this.providerName, Date.now() - t0);

          if (res.status === 429) {
            const rawRetry = res.headers['retry-after'];
            const retryAfter = Array.isArray(rawRetry) ? rawRetry[0] : rawRetry;
            const numericSeconds =
              retryAfter !== undefined && !Number.isNaN(Number(retryAfter))
                ? Number(retryAfter)
                : undefined;

            throw new RateLimitError(
              `Provider '${this.providerName}' rate limited (429)`,
              numericSeconds,
              retryAfter,
            );
          }

          if (res.status >= 500) {
            throw new ProviderError(
              this.providerName,
              `Provider '${this.providerName}' returned status ${res.status}`,
              res.status,
            );
          }

          return res;
        });
      },
      this.backoffOptions,
      (error: unknown): boolean => {
        if (error instanceof CircuitOpenError) {
          return false;
        }
        if (error instanceof RateLimitError || error instanceof ProviderError) {
          return true;
        }
        return false;
      },
    );
  }

  /**
   * Convenience helper for GET requests.
   *
   * @param url - Destination URL
   * @param options - Headers and timeout
   * @returns Typed response
   */
  public async get<T = unknown>(
    url: string,
    options: Omit<HttpRequestOptions, 'method'> = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Convenience helper for POST requests.
   *
   * @param url - Destination URL
   * @param body - Request payload (string or object)
   * @param options - Headers and timeout
   * @returns Typed response
   */
  public async post<T = unknown>(
    url: string,
    body?: string | object,
    options: Omit<HttpRequestOptions, 'method' | 'body'> = {},
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }
}
