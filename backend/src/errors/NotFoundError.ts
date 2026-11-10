import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { AppError } from './AppError';

/**
 * Error thrown when a requested domain entity, route, or resource cannot be found.
 */
export class NotFoundError extends AppError {
  public readonly resource: string;
  public readonly identifier?: string | number;

  /**
   * Initializes a new instance of NotFoundError.
   *
   * @param resource - Entity or resource type name (e.g., 'Wallet', 'Token', 'Route')
   * @param identifier - Optional key or ID that was searched for
   * @param customMessage - Optional override message
   */
  public constructor(resource = 'Resource', identifier?: string | number, customMessage?: string) {
    const message =
      customMessage ??
      (identifier !== undefined
        ? `${resource} with identifier '${identifier}' not found`
        : `${resource} not found`);

    const details = { resource, identifier };
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND_ERROR, true, details);
    this.resource = resource;
    this.identifier = identifier;
  }
}
