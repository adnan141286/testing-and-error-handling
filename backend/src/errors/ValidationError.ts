import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { AppError } from './AppError';

/**
 * Error thrown when input parameters, request payloads, or queries fail schema validation.
 */
export class ValidationError extends AppError {
  /**
   * Initializes a new instance of ValidationError.
   *
   * @param message - Validation failure message
   * @param details - Structured validation issues (e.g. field errors, Zod issues)
   */
  public constructor(message = 'Validation failed', details?: unknown) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, true, details);
  }
}
