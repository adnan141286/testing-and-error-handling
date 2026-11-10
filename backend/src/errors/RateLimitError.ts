import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { AppError } from './AppError';

/**
 * Error thrown when an incoming client request or outgoing provider request violates rate limits.
 */
export class RateLimitError extends AppError {
  public readonly retryAfterSeconds?: number;
  public readonly retryAfter?: string | number;

  /**
   * Initializes a new instance of RateLimitError.
   *
   * @param message - Rate limit message
   * @param retryAfterSeconds - Suggested duration in seconds to wait before retrying
   * @param retryAfter - Raw Retry-After header value (seconds or date string)
   */
  public constructor(
    message = 'Rate limit exceeded',
    retryAfterSeconds?: number,
    retryAfter?: string | number,
  ) {
    const effectiveSeconds =
      retryAfterSeconds ?? (typeof retryAfter === 'number' ? retryAfter : undefined);
    const effectiveRetryAfter = retryAfter ?? effectiveSeconds;

    const details =
      effectiveSeconds !== undefined || effectiveRetryAfter !== undefined
        ? { retryAfterSeconds: effectiveSeconds, retryAfter: effectiveRetryAfter }
        : undefined;

    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_ERROR, true, details);
    this.retryAfterSeconds = effectiveSeconds;
    this.retryAfter = effectiveRetryAfter;
  }
}
