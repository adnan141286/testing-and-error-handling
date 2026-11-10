import {
  parseRetryAfter,
  calculateBackoffDelay,
  executeWithRetry,
} from '../../src/services/resilience/backoff';

describe('Exponential Backoff and Retry', (): void => {
  describe('parseRetryAfter', (): void => {
    it('should parse numeric seconds as number or string', (): void => {
      expect(parseRetryAfter(10)).toBe(10000);
      expect(parseRetryAfter('5')).toBe(5000);
      expect(parseRetryAfter(0)).toBe(0);
      expect(parseRetryAfter(-5)).toBe(0);
    });

    it('should parse HTTP GMT date format', (): void => {
      const futureDate = new Date(Date.now() + 15000).toUTCString();
      const parsed = parseRetryAfter(futureDate);
      expect(parsed).toBeDefined();
      expect(parsed).toBeGreaterThanOrEqual(14000);
      expect(parsed).toBeLessThanOrEqual(16000);
    });

    it('should return undefined for empty or invalid headers', (): void => {
      expect(parseRetryAfter(undefined)).toBeUndefined();
      expect(parseRetryAfter(null)).toBeUndefined();
      expect(parseRetryAfter('')).toBeUndefined();
      expect(parseRetryAfter('invalid-header-string')).toBeUndefined();
    });
  });

  describe('calculateBackoffDelay', (): void => {
    it('should prioritize Retry-After header over calculated backoff', (): void => {
      const delay = calculateBackoffDelay(1, {}, '30');
      expect(delay).toBe(30000);
    });

    it('should compute exponential delay and clip at maxDelayMs', (): void => {
      const delayAttempt0 = calculateBackoffDelay(0, {
        baseDelayMs: 100,
        maxDelayMs: 1000,
        jitterFactor: 0,
      });
      expect(delayAttempt0).toBe(100);

      const delayAttempt1 = calculateBackoffDelay(1, {
        baseDelayMs: 100,
        maxDelayMs: 1000,
        jitterFactor: 0,
      });
      expect(delayAttempt1).toBe(200);

      const delayClipped = calculateBackoffDelay(10, {
        baseDelayMs: 100,
        maxDelayMs: 500,
        jitterFactor: 0,
      });
      expect(delayClipped).toBe(500);
    });
  });

  describe('executeWithRetry', (): void => {
    it('should succeed immediately without retrying on successful operation', async (): Promise<void> => {
      let calls = 0;
      const result = await executeWithRetry(async (): Promise<string> => {
        calls++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(calls).toBe(1);
    });

    it('should use default sleep function when sleepFn is not provided', async (): Promise<void> => {
      let attempts = 0;
      const result = await executeWithRetry(
        async (attempt: number): Promise<string> => {
          attempts++;
          if (attempt === 0) {
            throw new Error('Immediate retry');
          }
          return 'ok';
        },
        { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 5 },
      );

      expect(result).toBe('ok');
      expect(attempts).toBe(2);
    });

    it('should retry on failure and eventually succeed', async (): Promise<void> => {
      let attempts = 0;
      const sleepMock = jest.fn().mockResolvedValue(undefined);

      const result = await executeWithRetry(
        async (attempt: number): Promise<string> => {
          attempts++;
          if (attempt === 0) {
            throw new Error('Temporary failure');
          }
          return 'recovered';
        },
        { maxRetries: 3, sleepFn: sleepMock },
      );

      expect(result).toBe('recovered');
      expect(attempts).toBe(2);
      expect(sleepMock).toHaveBeenCalledTimes(1);
    });

    it('should honor retryAfter property from caught error', async (): Promise<void> => {
      const sleepMock = jest.fn().mockResolvedValue(undefined);
      const errorWithRetryAfter = Object.assign(new Error('Rate limited'), {
        retryAfter: '5',
      });

      let attempts = 0;
      await executeWithRetry(
        async (attempt: number): Promise<string> => {
          attempts++;
          if (attempt === 0) {
            throw errorWithRetryAfter;
          }
          return 'ok';
        },
        { maxRetries: 2, sleepFn: sleepMock },
      );

      expect(attempts).toBe(2);
      expect(sleepMock).toHaveBeenCalledWith(5000);
    });

    it('should throw when maximum retries are exhausted', async (): Promise<void> => {
      const sleepMock = jest.fn().mockResolvedValue(undefined);

      await expect(
        executeWithRetry(
          async (): Promise<never> => {
            throw new Error('Permanent failure');
          },
          { maxRetries: 2, sleepFn: sleepMock },
        ),
      ).rejects.toThrow('Permanent failure');

      expect(sleepMock).toHaveBeenCalledTimes(2);
    });

    it('should not retry if shouldRetry predicate returns false', async (): Promise<void> => {
      const sleepMock = jest.fn().mockResolvedValue(undefined);

      await expect(
        executeWithRetry(
          async (): Promise<never> => {
            throw new Error('Non-retryable error');
          },
          { maxRetries: 3, sleepFn: sleepMock },
          (): boolean => false,
        ),
      ).rejects.toThrow('Non-retryable error');

      expect(sleepMock).not.toHaveBeenCalled();
    });
  });
});
