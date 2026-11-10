import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { AppError } from './AppError';

/**
 * Error thrown when an external provider (e.g., DexScreener, Birdeye, GoPlus) fails or returns an error.
 */
export class ProviderError extends AppError {
  public readonly provider: string;
  public readonly originalError?: unknown;

  /**
   * Initializes a new instance of ProviderError.
   *
   * @param provider - Name of the failing upstream provider
   * @param message - Descriptive failure message
   * @param statusCode - HTTP status code representing the upstream failure
   * @param originalError - Original caught error or response payload for debugging
   */
  public constructor(
    provider: string,
    message: string,
    statusCode: number = HTTP_STATUS.BAD_GATEWAY,
    originalError?: unknown,
  ) {
    const details = { provider, originalError };
    super(message, statusCode, ERROR_CODES.PROVIDER_ERROR, true, details);
    this.provider = provider;
    this.originalError = originalError;
  }
}
