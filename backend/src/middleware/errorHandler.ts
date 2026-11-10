import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants';
import { logger } from '../utils/logger';

/**
 * Standardized JSON error response body format across all Whalepath API endpoints.
 */
export interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    stack?: string;
  };
}

/**
 * Factory creating an Express global error-handling middleware.
 *
 * @param isProduction - Whether the app is running in production (hides stack traces)
 * @returns Express error handler function
 */
export const createErrorHandler = (
  isProduction = process.env.NODE_ENV === 'production',
): ErrorRequestHandler => {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = req.id ?? req.header('x-request-id') ?? undefined;

    let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_ERROR;
    let message = 'Internal Server Error';
    let details: unknown = undefined;
    let stack: string | undefined = undefined;

    if (err instanceof AppError) {
      statusCode = err.statusCode;
      code = err.code;
      message = err.message;
      details = err.details;
      stack = err.stack;
    } else if (err instanceof ZodError) {
      statusCode = HTTP_STATUS.BAD_REQUEST;
      code = ERROR_CODES.VALIDATION_ERROR;
      message = 'Request validation failed';
      details = err.issues;
      stack = err.stack;
    } else if (err instanceof Error) {
      message = isProduction ? 'Internal Server Error' : err.message;
      stack = err.stack;
    }

    if (statusCode >= 500) {
      logger.error(
        { err, requestId, path: req.originalUrl || req.path, method: req.method },
        'Unhandled server error occurred',
      );
    } else {
      logger.warn(
        { code, statusCode, requestId, path: req.originalUrl || req.path, method: req.method },
        'Operational request error',
      );
    }

    const responseBody: ErrorResponseBody = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
        ...(requestId !== undefined && { requestId }),
        ...(!isProduction && stack !== undefined && { stack }),
      },
    };

    res.status(statusCode).json(responseBody);
  };
};

/**
 * Default global error handler middleware using environment settings.
 */
export const errorHandlerMiddleware = createErrorHandler();
