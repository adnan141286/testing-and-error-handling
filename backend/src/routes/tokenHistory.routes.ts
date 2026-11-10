import { Router, Request, Response } from 'express';
import { getPriceSampler, PriceSamplerService } from '../services/sampler';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../errors/ValidationError';

export interface TokenHistoryRouterOptions {
  sampler?: PriceSamplerService;
}

/**
 * Creates and mounts GET /api/token/history returning real rolling price history.
 *
 * @param options - Router options
 * @returns Express router
 */
export const createTokenHistoryRouter = (options: TokenHistoryRouterOptions = {}): Router => {
  const router = Router();
  const sampler = options.sampler ?? getPriceSampler();

  router.get(
    '/history',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const rawSymbol = req.query.symbol;
      if (!rawSymbol || typeof rawSymbol !== 'string') {
        throw new ValidationError('Query parameter "symbol" is required and must be a string');
      }

      const upperSymbol = rawSymbol.trim().toUpperCase();
      const samples = sampler.getHistory(upperSymbol);

      res.status(200).json({
        success: true,
        symbol: upperSymbol,
        count: samples.length,
        samples,
      });
    }),
  );

  return router;
};
