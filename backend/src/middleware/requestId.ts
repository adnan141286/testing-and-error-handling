import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

export const REQUEST_ID_HEADER = 'X-Request-Id';

/**
 * Middleware that assigns or propagates a unique correlation ID for every incoming HTTP request.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next middleware function
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.header(REQUEST_ID_HEADER) ?? req.header('x-request-id');
  const requestId = existingId && existingId.trim().length > 0 ? existingId.trim() : randomUUID();

  req.id = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};
