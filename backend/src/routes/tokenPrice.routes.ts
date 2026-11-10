import { Router, Request, Response, NextFunction } from 'express';
import { DexScreenerClient } from '../services/providers/dexScreener.client';
import { BirdeyeClient } from '../services/providers/birdeye.client';
import { CoinGeckoClient } from '../services/providers/coingecko.client';
import { CacheManager } from '../services/cache/cacheManager';
import { QuarantineManager } from '../sanitizers/quarantine';
import { diagnosticsTracker } from '../utils/diagnosticsTracker';
import { eventLogger } from '../utils/eventLogger';
import { ValidationError } from '../errors/ValidationError';
import { asyncHandler } from '../utils/asyncHandler';
import { EnvConfig, env } from '../config/env';
import { SYMBOL_MAP } from './tokenPrice.constants';
import { resolveMarketPrice } from './tokenPrice.resolver';
import { createTokenCompareRouter } from './tokenCompare.routes';

export interface TokenPriceRouterOptions {
  dexScreenerClient?: DexScreenerClient;
  birdeyeClient?: BirdeyeClient;
  coinGeckoClient?: CoinGeckoClient;
  cacheManager?: CacheManager;
  quarantineManager?: QuarantineManager;
  config?: EnvConfig;
}

interface CachedPricePayload {
  price: number;
  liquidity: number;
  source?: string;
  stale?: boolean;
  deviated?: boolean;
  deviationPercent?: number;
  timestamp?: string;
}

/**
 * Creates and configures the token pricing Express router.
 *
 * @param options - Injected provider, cache, and quarantine manager dependencies
 * @returns Configured Express router
 */
export const createTokenPriceRouter = (options: TokenPriceRouterOptions = {}): Router => {
  const router = Router();
  const config = options.config ?? env;
  const cacheManager = options.cacheManager ?? new CacheManager();
  const dexScreenerClient = options.dexScreenerClient ?? new DexScreenerClient({ cacheManager });
  const birdeyeClient = options.birdeyeClient ?? new BirdeyeClient({ cacheManager });
  const coinGeckoClient = options.coinGeckoClient ?? new CoinGeckoClient({ cacheManager });
  const quarantineManager = options.quarantineManager ?? new QuarantineManager();

  router.use(
    createTokenCompareRouter({
      dexScreenerClient,
      coinGeckoClient,
      quarantineManager,
      config,
    }),
  );

  router.get(
    '/price',
    asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const startTime = Date.now();
      const rawSymbol = req.query.symbol;
      if (!rawSymbol || typeof rawSymbol !== 'string') {
        throw new ValidationError('Query parameter "symbol" is required and must be a string');
      }

      const upperSymbol = rawSymbol.trim().toUpperCase();
      const symbolConfig = SYMBOL_MAP[upperSymbol] ?? {
        query: upperSymbol,
        expectedSymbol: upperSymbol,
      };

      const cacheKey = `token:price:${upperSymbol.toLowerCase()}`;
      const cacheStart = performance.now();
      const detailed = await cacheManager.getDetailed<CachedPricePayload>(cacheKey);
      const cacheReadLatencyMs = Number((performance.now() - cacheStart).toFixed(2));

      let wasCached = false;
      let cacheTier: 'L1' | 'L2' | null = null;
      let isStale = false;
      let isDeviated = false;
      let deviationPercent = 0;
      let finalPrice = 0;
      let finalLiquidity = 0;
      let source = 'DEX Screener';
      let apiLatencyMs = 0;
      let finalTimestamp = new Date().toISOString();

      if (detailed.value !== null) {
        wasCached = true;
        cacheTier = detailed.tier;
        finalPrice = detailed.value.price;
        finalLiquidity = detailed.value.liquidity;
        source = detailed.value.source ?? 'DEX Screener';
        isStale = detailed.value.stale ?? false;
        isDeviated = detailed.value.deviated ?? false;
        deviationPercent = detailed.value.deviationPercent ?? 0;
        finalTimestamp = detailed.value.timestamp ?? finalTimestamp;
        diagnosticsTracker.recordCacheHit();
      } else {
        diagnosticsTracker.recordCacheMiss();
        const apiStart = performance.now();
        const resolved = await resolveMarketPrice(symbolConfig, upperSymbol, {
          dexScreenerClient,
          birdeyeClient,
          coinGeckoClient,
          quarantineManager,
          config,
        });

        if (resolved) {
          finalPrice = resolved.finalPrice;
          finalLiquidity = resolved.finalLiquidity;
          source = resolved.source;
          isStale = resolved.isStale;
          isDeviated = resolved.isDeviated;
          deviationPercent = resolved.deviationPercent;
          finalTimestamp = resolved.finalTimestamp;
        } else {
          const stale = await cacheManager.getStale<CachedPricePayload>(cacheKey);
          if (stale !== null) {
            finalPrice = stale.price;
            finalLiquidity = stale.liquidity;
            source = `${stale.source ?? 'DEX Screener'} (Stale)`;
            isStale = true;
          } else {
            quarantineManager.quarantine(
              { symbol: upperSymbol },
              `No active market pairs found for symbol: ${upperSymbol}`,
              'dexscreener',
            );
            res.status(404).json({
              success: false,
              error: {
                code: 'NOT_FOUND_ERROR',
                message: `No active market pairs found for symbol ${upperSymbol}`,
              },
            });
            return;
          }
        }

        if (!isStale) {
          await cacheManager.set(
            cacheKey,
            {
              price: finalPrice,
              liquidity: finalLiquidity,
              source,
              stale: isStale,
              deviated: isDeviated,
              deviationPercent,
              timestamp: finalTimestamp,
            },
            15,
          );
        }
        apiLatencyMs = Math.round(performance.now() - apiStart);
      }

      const latencyMs = Date.now() - startTime;
      eventLogger.addEvent(
        'PRICE_FETCH',
        `Fetched ${upperSymbol} price ($${finalPrice}) from ${wasCached ? 'cache' : source}`,
        { symbol: upperSymbol, price: finalPrice, cached: wasCached, latencyMs, source },
      );

      res.status(200).json({
        symbol: upperSymbol,
        price: finalPrice,
        liquidity: finalLiquidity,
        source,
        cached: wasCached,
        cacheTier,
        stale: isStale,
        deviated: isDeviated,
        deviationPercent,
        latencyMs,
        cacheReadLatencyMs,
        apiLatencyMs: wasCached ? 0 : apiLatencyMs,
        timestamp: finalTimestamp,
      });
    }),
  );

  return router;
};
