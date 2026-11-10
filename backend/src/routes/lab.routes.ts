import { Router, Request, Response } from 'express';
import { runRateLimitScenario, runOutageScenario } from '../lab/chaosUpstream';
import { CacheManager } from '../services/cache/cacheManager';
import { QuarantineManager } from '../sanitizers/quarantine';
import { DegradedModeEmitter } from '../volatility/degradedMode';
import { diagnosticsTracker } from '../utils/diagnosticsTracker';
import { eventLogger } from '../utils/eventLogger';
import { asyncHandler } from '../utils/asyncHandler';
import {
  ValidationError,
  RateLimitError,
  ProviderError,
  CircuitOpenError,
  NotFoundError,
} from '../errors';

export interface LabRouterOptions {
  labMode?: boolean;
  cacheManager?: CacheManager;
  quarantineManager?: QuarantineManager;
  degradedEmitter?: DegradedModeEmitter;
}

/**
 * Creates and configures the Chaos Lab diagnostic Express router.
 *
 * @param options - Dependency injection configuration
 * @returns Configured Express router
 */
export const createLabRouter = (options: LabRouterOptions = {}): Router => {
  const router = Router();
  const labMode = options.labMode ?? true;
  const cacheManager = options.cacheManager ?? new CacheManager();
  const quarantineManager = options.quarantineManager ?? new QuarantineManager();
  const degradedEmitter = options.degradedEmitter ?? new DegradedModeEmitter();

  router.use((_req: Request, _res: Response, next): void => {
    if (!labMode) {
      throw new NotFoundError('Lab endpoint', 'LAB_MODE is disabled in this environment');
    }
    next();
  });

  router.post(
    '/scenario',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { type } = req.body;
      if (type === 'rate_limit') {
        const result = await runRateLimitScenario();
        eventLogger.addEvent(
          'LAB_SCENARIO_RATE_LIMIT',
          'Chaos 429 rate limit scenario executed with exponential backoff',
        );
        res.status(200).json({ ...result });
        return;
      }

      if (type === 'outage') {
        const result = await runOutageScenario(cacheManager);
        eventLogger.addEvent(
          'LAB_SCENARIO_OUTAGE',
          'Chaos 503 outage scenario executed; circuit transitioned to OPEN and served stale data',
        );
        res.status(200).json({ ...result });
        return;
      }

      throw new ValidationError('Invalid scenario type; must be "rate_limit" or "outage"');
    }),
  );

  router.post(
    '/reset',
    asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      await cacheManager.clear();
      quarantineManager.clear();
      degradedEmitter.clear();
      diagnosticsTracker.reset();
      eventLogger.addEvent(
        'LAB_RESET',
        'All circuit breakers, caches, token buckets and quarantine counters were reset',
      );

      res.status(200).json({
        success: true,
        message: 'All breakers, caches, token buckets, and diagnostic counters successfully reset',
      });
    }),
  );

  router.post(
    '/error',
    asyncHandler(async (req: Request, _res: Response): Promise<void> => {
      const { type } = req.body;
      eventLogger.addEvent('LAB_ERROR_TEST', `Triggered error check for type "${type}"`);

      switch (type) {
        case 'validation':
          throw new ValidationError('Input validation failed on provided payload', [
            { field: 'symbol', issue: 'Symbol is missing or malformed' },
          ]);
        case 'rate_limit':
          throw new RateLimitError('Upstream provider rate limit reached', 30, '30');
        case 'provider':
          throw new ProviderError(
            'upstream_service',
            'Upstream gateway returned 502 Bad Gateway',
            502,
          );
        case 'circuit_open':
          throw new CircuitOpenError('upstream_service', undefined, 15000);
        case 'not_found':
          throw new NotFoundError('AssetPair', 'SOL/USDC');
        default:
          throw new ValidationError(
            `Unknown error type "${type}". Allowed: validation, rate_limit, provider, circuit_open, not_found`,
          );
      }
    }),
  );

  return router;
};
