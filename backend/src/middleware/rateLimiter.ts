import { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../config/env';
import { RateLimitError } from '../errors/RateLimitError';

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

/**
 * Creates an Express rate-limiting middleware with configurable sliding window and DI.
 *
 * @param options - Configuration overrides for rate limiter
 * @returns Express middleware function
 */
export const createRateLimiter = (options: RateLimiterOptions = {}): RequestHandler => {
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? env.RATE_LIMIT_MAX_REQUESTS;
  const keyGenerator =
    options.keyGenerator ??
    ((req: Request): string => req.ip || req.socket.remoteAddress || 'unknown-client');

  const store = new Map<string, ClientRecord>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = keyGenerator(req);

    const record = store.get(key);

    if (!record || now >= record.resetTime) {
      const resetTime = now + windowMs;
      store.set(key, { count: 1, resetTime });

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
      return next();
    }

    record.count++;

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil(record.resetTime / 1000);
    const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfter);
      return next(new RateLimitError('Too many requests, please try again later', retryAfter));
    }

    next();
  };
};

/**
 * Default global rate limiter middleware.
 */
export const rateLimiterMiddleware = createRateLimiter();
