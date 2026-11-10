/**
 * Options for configuring a TokenBucket instance.
 */
export interface TokenBucketOptions {
  capacity: number;
  refillRatePerSecond: number;
  initialTokens?: number;
}

/**
 * Token Bucket implementation for rate limiting requests per provider.
 */
export class TokenBucket {
  private readonly capacity: number;
  private readonly refillRatePerSecond: number;
  private tokens: number;
  private lastRefillTimestamp: number;

  /**
   * Initializes a new TokenBucket instance.
   *
   * @param options - Configuration options for bucket capacity and refill rate
   */
  public constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.refillRatePerSecond = options.refillRatePerSecond;
    this.tokens = options.initialTokens ?? options.capacity;
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Returns current available token balance after calculating refills.
   *
   * @returns Current number of available tokens
   */
  public getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Attempts to consume specified number of tokens without blocking.
   *
   * @param tokens - Number of tokens to consume (defaults to 1)
   * @returns True if tokens were consumed; false if insufficient tokens
   */
  public tryConsume(tokens = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  /**
   * Asynchronously consumes specified tokens, waiting until available if necessary.
   *
   * @param tokens - Number of tokens to consume (defaults to 1)
   */
  public async consume(tokens = 1): Promise<void> {
    if (tokens > this.capacity) {
      throw new Error(`Requested tokens (${tokens}) exceeds bucket capacity (${this.capacity})`);
    }

    while (!this.tryConsume(tokens)) {
      const needed = tokens - this.tokens;
      const waitMs = Math.ceil((needed / this.refillRatePerSecond) * 1000);
      await new Promise<void>((resolve) => setTimeout(resolve, Math.max(waitMs, 10)));
    }
  }

  /**
   * Recalculates available tokens based on elapsed time since last refill.
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    if (elapsedSeconds > 0) {
      const addedTokens = elapsedSeconds * this.refillRatePerSecond;
      this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
      this.lastRefillTimestamp = now;
    }
  }
}

/**
 * Provider-keyed registry for TokenBucket instances.
 */
export class ProviderRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();

  /**
   * Registers a rate limit bucket for a named provider.
   *
   * @param provider - Provider identifier name
   * @param options - Token bucket options for this provider
   */
  public registerProvider(provider: string, options: TokenBucketOptions): void {
    this.buckets.set(provider, new TokenBucket(options));
  }

  /**
   * Retrieves the TokenBucket associated with a provider.
   *
   * @param provider - Provider identifier name
   * @returns TokenBucket instance or undefined if not registered
   */
  public getBucket(provider: string): TokenBucket | undefined {
    return this.buckets.get(provider);
  }

  /**
   * Asynchronously acquires tokens for a given provider if configured.
   *
   * @param provider - Provider identifier name
   * @param tokens - Number of tokens to acquire
   */
  public async acquire(provider: string, tokens = 1): Promise<void> {
    const bucket = this.buckets.get(provider);
    if (bucket) {
      await bucket.consume(tokens);
    }
  }
}
