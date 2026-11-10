import { Router, Request, Response } from 'express';
import { QuarantineManager } from '../sanitizers/quarantine';
import { eventLogger } from '../utils/eventLogger';

export interface QuarantineRouterOptions {
  quarantineManager?: QuarantineManager;
}

/**
 * Creates and configures the Quarantine management Express router.
 *
 * @param options - Injected dependency configuration
 * @returns Configured Express router
 */
export const createQuarantineRouter = (options: QuarantineRouterOptions = {}): Router => {
  const router = Router();
  const quarantineManager = options.quarantineManager ?? new QuarantineManager();

  router.get('/', (_req: Request, res: Response): void => {
    const records = quarantineManager.getQuarantinedRecords().slice(-100).reverse();
    const stats = quarantineManager.getStats();

    res.status(200).json({
      success: true,
      stats,
      count: records.length,
      records,
    });
  });

  router.delete('/', (_req: Request, res: Response): void => {
    quarantineManager.clear();
    eventLogger.addEvent('QUARANTINE_CLEARED', 'Quarantine records and metrics were reset to zero');

    res.status(200).json({
      success: true,
      message: 'Quarantine pool cleared successfully',
    });
  });

  return router;
};
