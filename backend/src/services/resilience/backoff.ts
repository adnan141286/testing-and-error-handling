import { env } from '../../config/env';

/**
 * Options configuring exponential backoff and retry behavior.
 */
export interface BackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFactor?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Parses a standard HTTP Retry-After header into milliseconds.
 * Supports decimal/integer seconds or HTTP date strings.
 *
 * @param header - Raw Retry-After header value
 * @returns Delay in milliseconds, or undefined if header is absent/invalid
 */
export const parseRetryAfter = (header?: string | number | null): number | undefined => {
  if (header === undefined || header === null || header === '') {
    return undefined;
  }

  if (typeof header === 'number') {
    return header > 0 ? header * 1000 : 0;
  }

  const numericSeconds = Number(header);
  if (!Number.isNaN(numericSeconds)) {
    return numericSeconds > 0 ? numericSeconds * 1000 : 0;
  }

  const parsedDate = Date.parse(header);
  if (!Number.isNaN(parsedDate)) {
    const diff = parsedDate - Date.now();
    return Math.max(0, diff);
  }

  return undefined;
};

/**
 * Calculates exponential backoff delay with full jitter.
 *
 * @param attempt - Zero-based retry attempt number
 * @param options - Backoff tuning options
 * @param retryAfterHeader - Optional Retry-After header value to honor directly
 * @returns Delay in milliseconds
 */
export const calculateBackoffDelay = (
  attempt: number,
  options: BackoffOptions = {},
  retryAfterHeader?: string | number | null,
): number => {
  const retryAfterMs = parseRetryAfter(retryAfterHeader);
  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }

  const baseDelay = options.baseDelayMs ?? env.RETRY_BASE_DELAY_MS;
  const maxDelay = options.maxDelayMs ?? env.RETRY_MAX_DELAY_MS;
  const jitterFactor = options.jitterFactor ?? 0.2;

  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1);
  const calculatedDelay = exponentialDelay + jitter;

  return Math.min(maxDelay, Math.max(0, Math.round(calculatedDelay)));
};

/**
 * Executes an asynchronous operation with exponential backoff and retries.
 *
 * @param operation - Operation to execute on each attempt
 * @param options - Backoff and retry configuration
 * @param shouldRetry - Predicate determining whether to retry given the caught error
 * @returns Result of the operation
 */
export const executeWithRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  options: BackoffOptions = {},
  shouldRetry: (error: unknown, attempt: number) => boolean = (): boolean => true,
): Promise<T> => {
  const maxRetries = options.maxRetries ?? env.MAX_RETRIES;
  const sleep =
    options.sleepFn ??
    ((ms: number): Promise<void> =>
      new Promise<void>((resolve): void => {
        setTimeout(resolve, ms);
      }));

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await operation(attempt);
    } catch (error: unknown) {
      lastError = error;
      if (!shouldRetry(error, attempt + 1) || attempt === maxRetries) {
        throw error;
      }

      let retryAfter: string | number | undefined;
      if (typeof error === 'object' && error !== null && 'retryAfter' in error) {
        retryAfter = (error as { retryAfter?: string | number }).retryAfter;
      }

      const delay = calculateBackoffDelay(attempt, options, retryAfter);
      await sleep(delay);
      attempt++;
    }
  }

  throw lastError;
};
