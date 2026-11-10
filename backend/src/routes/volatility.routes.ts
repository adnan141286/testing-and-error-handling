import { Router, Request, Response } from 'express';
import { DegradedModeEmitter, IncidentRecord } from '../volatility/degradedMode';
import { SafeMathService } from '../volatility/safeMath';
import { OutlierDetector } from '../volatility/outlierDetector';
import { DexScreenerClient } from '../services/providers/dexScreener.client';
import { eventLogger } from '../utils/eventLogger';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../errors/ValidationError';

export interface VolatilityRouterOptions {
  degradedEmitter?: DegradedModeEmitter;
  dexScreenerClient?: DexScreenerClient;
}

/**
 * Creates and configures the Volatility Handling Express router.
 *
 * @param options - Injected dependency configuration
 * @returns Configured Express router
 */
export const createVolatilityRouter = (options: VolatilityRouterOptions = {}): Router => {
  const router = Router();
  const degradedEmitter = options.degradedEmitter ?? new DegradedModeEmitter();
  const safeMath = new SafeMathService(degradedEmitter);
  const outlierDetector = new OutlierDetector({}, degradedEmitter);
  const dexScreenerClient = options.dexScreenerClient ?? new DexScreenerClient();

  router.post(
    '/check',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { liquidity, tradeSize, prices, token = 'TEST_TOKEN' } = req.body;
      const numLiquidity = Number(liquidity);
      const numTradeSize = Number(tradeSize);

      let priceList: number[] = [];
      if (Array.isArray(prices)) {
        priceList = prices.map((p) => Number(p));
      } else if (typeof prices === 'string') {
        priceList = prices
          .split(',')
          .map((p) => Number(p.trim()))
          .filter((p) => !Number.isNaN(p));
      }

      const initialIncidentsCount = degradedEmitter.getRecentIncidents(100).length;
      const liquidityResult = safeMath.handleLiquidity(numLiquidity, token);
      const priceImpact = safeMath.calculatePriceImpact(numTradeSize, numLiquidity, token);

      const candidatePrice = priceList.length > 0 ? (priceList[priceList.length - 1] as number) : 0;
      const history = priceList.slice(0, -1);
      const outlierResult = outlierDetector.detect(candidatePrice, history, token);

      const allIncidents = degradedEmitter.getRecentIncidents(100);
      const newIncidents = allIncidents.slice(initialIncidentsCount);
      const isDegraded = degradedEmitter.isDegraded(token);

      eventLogger.addEvent(
        'VOLATILITY_CHECK',
        `Volatility evaluated for ${token}: Price impact ${(priceImpact * 100).toFixed(2)}%, Outlier: ${outlierResult.isOutlier}`,
        { token, priceImpact, outlier: outlierResult.isOutlier, isDegraded },
      );

      res.status(200).json({
        success: true,
        token,
        priceImpact,
        priceImpactPercent: Number((priceImpact * 100).toFixed(4)),
        liquidity: liquidityResult,
        outlier: outlierResult,
        killSwitchActive: isDegraded,
        emittedEvents: newIncidents,
      });
    }),
  );

  router.post(
    '/check-live',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const symbol =
        typeof req.query.symbol === 'string' ? req.query.symbol.trim().toUpperCase() : 'SOL';
      const searchRes = await dexScreenerClient.searchPairs(symbol);
      const pairs = searchRes.pairs ?? [];
      const bestPair = pairs[0];

      if (!bestPair) {
        throw new ValidationError(`No market pair available for ${symbol}`);
      }

      const currentPrice = parseFloat(bestPair.priceUsd ?? '0');
      const poolLiquidity = bestPair.liquidity?.usd ?? 0;

      // Use real history from sampler if available, otherwise fallback to recent points
      const samplerHistory = (await import('../services/sampler'))
        .getPriceSampler()
        .getHistory(symbol);
      const priceHistory =
        samplerHistory.length > 1
          ? samplerHistory.map((s) => s.price)
          : [currentPrice * 0.99, currentPrice * 1.005, currentPrice];

      const priceImpact = safeMath.calculatePriceImpact(10000, poolLiquidity, symbol);
      const prior = priceHistory.slice(0, -1);
      const outlierResult = outlierDetector.detect(currentPrice, prior, symbol);

      res.status(200).json({
        success: true,
        symbol,
        price: currentPrice,
        liquidity: poolLiquidity,
        priceImpact,
        priceImpactPercent: Number((priceImpact * 100).toFixed(4)),
        outlier: outlierResult,
        killSwitchActive: degradedEmitter.isDegraded(symbol),
        history: samplerHistory.length > 0 ? samplerHistory : undefined,
      });
    }),
  );

  router.get('/events', (_req: Request, res: Response): void => {
    const events: IncidentRecord[] = degradedEmitter.getRecentIncidents(100).reverse();
    res.status(200).json({
      success: true,
      killSwitchActive: degradedEmitter.isDegraded(),
      count: events.length,
      events,
    });
  });

  router.delete('/events', (_req: Request, res: Response): void => {
    degradedEmitter.clear();
    eventLogger.addEvent(
      'VOLATILITY_EVENTS_CLEARED',
      'Degraded mode incident records and kill switch flags cleared',
    );
    res.status(200).json({
      success: true,
      message: 'Degraded mode events cleared successfully',
    });
  });

  return router;
};
