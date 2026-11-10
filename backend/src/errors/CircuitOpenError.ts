import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { AppError } from './AppError';

/**
 * Error thrown when a call is blocked because a service's circuit breaker is currently OPEN.
 */
export class CircuitOpenError extends AppError {
  public readonly serviceName: string;
  public readonly resetTimeMs?: number;

  /**
   * Initializes a new instance of CircuitOpenError.
   *
   * @param serviceName - The service or provider whose circuit breaker is open
   * @param message - Optional custom message
   * @param resetTimeMs - Estimated milliseconds remaining until circuit enters HALF_OPEN
   */
  public constructor(serviceName: string, message?: string, resetTimeMs?: number) {
    const errorMsg =
      message ??
      `Circuit breaker for service '${serviceName}' is OPEN. Requests temporarily halted.`;
    const details = { serviceName, resetTimeMs };
    super(errorMsg, HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.CIRCUIT_OPEN_ERROR, true, details);
    this.serviceName = serviceName;
    this.resetTimeMs = resetTimeMs;
  }
}
