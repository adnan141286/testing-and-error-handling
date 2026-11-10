import { Router } from 'express';
import { EnvConfig, env } from '../config/env';
import { CacheManager } from '../services/cache';
import { QuarantineManager } from '../sanitizers/quarantine';
import { createHealthRouter } from './health.routes';
import { createTokenPriceRouter } from './tokenPrice.routes';
import { createTokenSecurityRouter } from './tokenSecurity.routes';
import { createDiagnosticsRouter } from './diagnostics.routes';
import { createSanitizeRouter } from './sanitize.routes';
import { createExtendedSanitizeRouter } from './sanitizeExtended.routes';
import { createTokenHistoryRouter } from './tokenHistory.routes';
import { createQuarantineRouter } from './quarantine.routes';
import { createVolatilityRouter } from './volatility.routes';
import { createSelfTestRouter } from './selftest.routes';
import { createCoverageRouter } from './coverage.routes';
import { createEventsRouter } from './events.routes';
import { createLabRouter } from './lab.routes';
import { createGasRouter } from './gas.routes';

/**
 * Creates and mounts all application routes with DI.
 *
 * @param config - Environment configuration
 * @returns Configured Express router
 */
export const createApiRouter = (config: EnvConfig = env): Router => {
  const router = Router();
  const cacheManager = new CacheManager();
  const quarantineManager = new QuarantineManager();

  router.use('/health', createHealthRouter(config));
  router.use('/token', createTokenPriceRouter({ config, cacheManager, quarantineManager }));
  router.use('/token', createTokenSecurityRouter());
  router.use('/token', createTokenHistoryRouter());
  router.use('/gas', createGasRouter({ config }));
  router.use('/network/gas', createGasRouter({ config }));
  router.use('/diagnostics', createDiagnosticsRouter({ config, cacheManager, quarantineManager }));
  router.use('/sanitize', createSanitizeRouter({ quarantineManager }));
  router.use('/sanitize', createExtendedSanitizeRouter({ config, quarantineManager }));
  router.use('/quarantine', createQuarantineRouter({ quarantineManager }));
  router.use('/volatility', createVolatilityRouter());
  router.use('/selftest', createSelfTestRouter());
  router.use('/coverage', createCoverageRouter());
  router.use('/events', createEventsRouter());
  router.use('/lab', createLabRouter({ labMode: config.LAB_MODE }));

  return router;
};

export const apiRouter: Router = createApiRouter();
export * from './health.routes';
export * from './tokenPrice.routes';
export * from './tokenSecurity.routes';
export * from './gas.routes';
export * from './diagnostics.routes';
export * from './sanitize.routes';
export * from './quarantine.routes';
export * from './volatility.routes';
export * from './selftest.routes';
export * from './coverage.routes';
export * from './events.routes';
export * from './lab.routes';
