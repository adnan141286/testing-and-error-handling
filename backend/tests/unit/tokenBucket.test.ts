import { TokenBucket, ProviderRateLimiter } from '../../src/services/resilience/tokenBucket';

describe('TokenBucket Rate Limiter', (): void => {
  beforeEach((): void => {
    jest.useFakeTimers();
  });

  afterEach((): void => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should initialize with configured capacity and consume available tokens', (): void => {
    const bucket = new TokenBucket({ capacity: 5, refillRatePerSecond: 2 });
    expect(bucket.getAvailableTokens()).toBe(5);

    expect(bucket.tryConsume()).toBe(true);
    expect(bucket.getAvailableTokens()).toBe(4);

    expect(bucket.tryConsume(3)).toBe(true);
    expect(bucket.getAvailableTokens()).toBe(1);

    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.getAvailableTokens()).toBe(0);

    expect(bucket.tryConsume()).toBe(false);
  });

  it('should refill tokens over elapsed time up to maximum capacity', (): void => {
    const bucket = new TokenBucket({
      capacity: 10,
      refillRatePerSecond: 2,
      initialTokens: 0,
    });

    expect(bucket.getAvailableTokens()).toBe(0);

    jest.advanceTimersByTime(1000); // 1 second -> 2 tokens
    expect(bucket.getAvailableTokens()).toBe(2);

    jest.advanceTimersByTime(2000); // 2 more seconds -> 4 more tokens = 6
    expect(bucket.getAvailableTokens()).toBe(6);

    jest.advanceTimersByTime(10000); // 10 seconds -> should cap at capacity 10
    expect(bucket.getAvailableTokens()).toBe(10);
  });

  it('should wait and consume when tokens become available with default parameters', async (): Promise<void> => {
    const bucket = new TokenBucket({
      capacity: 5,
      refillRatePerSecond: 10,
      initialTokens: 0,
    });

    let consumed = false;
    const consumePromise = bucket.consume().then((): void => {
      consumed = true;
    });

    expect(consumed).toBe(false);

    // Advance 150ms
    jest.advanceTimersByTime(150);
    await Promise.resolve();

    await consumePromise;
    expect(consumed).toBe(true);
  });

  it('should throw an error if requested tokens exceed bucket capacity', async (): Promise<void> => {
    const bucket = new TokenBucket({ capacity: 5, refillRatePerSecond: 1 });
    await expect(bucket.consume(10)).rejects.toThrow('exceeds bucket capacity');
  });

  describe('ProviderRateLimiter', (): void => {
    it('should register providers and allow token acquisition per provider', async (): Promise<void> => {
      const limiter = new ProviderRateLimiter();
      limiter.registerProvider('dexscreener', { capacity: 10, refillRatePerSecond: 5 });

      expect(limiter.getBucket('dexscreener')).toBeDefined();
      expect(limiter.getBucket('unknown_provider')).toBeUndefined();

      await expect(limiter.acquire('dexscreener')).resolves.toBeUndefined();
      await expect(limiter.acquire('non_registered_provider', 5)).resolves.toBeUndefined();
    });
  });
});
