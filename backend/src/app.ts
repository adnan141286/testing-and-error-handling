import express, { Express, Request, Response, NextFunction } from 'express';
import { EnvConfig, env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { createErrorHandler } from './middleware/errorHandler';
import { createRateLimiter } from './middleware/rateLimiter';
import { createCorsMiddleware } from './middleware/cors';
import { createApiRouter } from './routes';
import { createHealthRouter } from './routes/health.routes';
import { NotFoundError } from './errors/NotFoundError';

export interface AppOptions {
  enableRateLimiting?: boolean;
}

/**
 * Creates and configures the Express application instance with dependency injection.
 *
 * @param config - Application environment configuration
 * @param options - Additional application runtime options
 * @returns Configured Express application instance
 */
export const createApp = (config: EnvConfig = env, options: AppOptions = {}): Express => {
  const app = express();

  app.use(createCorsMiddleware(config.CORS_ORIGIN));
  app.use(requestIdMiddleware);
  app.use(express.json());

  if (options.enableRateLimiting ?? true) {
    app.use(
      createRateLimiter({
        windowMs: config.RATE_LIMIT_WINDOW_MS,
        maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
      }),
    );
  }

  // Mount health check at root and api router under /api
  app.use('/health', createHealthRouter(config));
  app.use('/api', createApiRouter(config));

  // Catch-all 404 handler for unmatched routes
  app.use((req: Request, _res: Response, next: NextFunction): void => {
    next(new NotFoundError('Route', `${req.method} ${req.originalUrl || req.path}`));
  });

  // Global centralized error handler
  app.use(createErrorHandler(config.NODE_ENV === 'production'));

  return app;
};
