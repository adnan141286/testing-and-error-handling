import { Router, Request, Response } from 'express';
import { EnvConfig, env } from '../config/env';

/**
 * Creates and configures the Health Check Express router with DI.
 *
 * @param config - Environment configuration
 * @returns Configured Express router
 */
export const createHealthRouter = (config: EnvConfig = env): Router => {
  const router = Router();

  router.get('/', (_req: Request, res: Response): void => {
    res.status(200).json({
      status: 'ok',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  return router;
};

export const healthRouter: Router = createHealthRouter();
