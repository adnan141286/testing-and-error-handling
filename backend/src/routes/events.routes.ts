import { Router, Request, Response } from 'express';
import { EventLogTracker, eventLogger as defaultTracker } from '../utils/eventLogger';

export interface EventsRouterOptions {
  tracker?: EventLogTracker;
}

/**
 * Creates and configures the system events log Express router.
 *
 * @param options - Injected dependency configuration
 * @returns Configured Express router
 */
export const createEventsRouter = (options: EventsRouterOptions = {}): Router => {
  const router = Router();
  const tracker = options.tracker ?? defaultTracker;

  router.get('/', (req: Request, res: Response): void => {
    const rawLimit = req.query.limit;
    const limit =
      typeof rawLimit === 'string' && !Number.isNaN(Number(rawLimit))
        ? Math.min(200, Math.max(1, parseInt(rawLimit, 10)))
        : 200;

    const events = tracker.getEvents(limit);
    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  });

  return router;
};
