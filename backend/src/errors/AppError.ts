import { HTTP_STATUS, ERROR_CODES, ErrorCode } from '../config/constants';

/**
 * Base application error for operational and programmer errors in Whalepath.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  /**
   * Initializes a new instance of AppError.
   *
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code associated with the error
   * @param code - Unique machine-readable error code string
   * @param isOperational - Whether this is a trusted, known operational error
   * @param details - Optional additional context or validation metadata
   */
  public constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ErrorCode | string = ERROR_CODES.APP_ERROR,
    isOperational = true,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes the error to a JSON-compatible representation.
   *
   * @returns Plain object representation of the error
   */
  public toJSON(): Record<string, unknown> {
    const serialized: Record<string, unknown> = {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
    };

    if (this.details !== undefined) {
      serialized['details'] = this.details;
    }

    return serialized;
  }
}
