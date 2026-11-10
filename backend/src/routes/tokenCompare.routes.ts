import { Router, Request, Response, NextFunction } from 'express';
import { DexScreenerClient } from '../services/providers/dexScreener.client';
import { CoinGeckoClient } from '../services/providers/coingecko.client';
import { QuarantineManager } from '../sanitizers/quarantine';
import { ValidationError } from '../errors/ValidationError';
import { asyncHandler } from '../utils/asyncHandler';
import { EnvConfig, env } from '../config/env';
import { SYMBOL_MAP } from './tokenPrice.constants';
import { findBestDexPair } from './tokenPrice.helpers';

export interface TokenCompareRouterOptions {
  dexScreenerClient?: DexScreenerClient;
  coinGeckoClient?: CoinGeckoClient;
  quarantineManager?: QuarantineManager;
  config?: EnvConfig;
}

/**
 * Creates and configures the token price comparison router.
 *
 * @param options - Injected provider dependencies and configuration
 * @returns Express Router with /compare endpoint
 */
export const createTokenCompareRouter = (options: TokenCompareRouterOptions = {}): Router => {
  const router = Router();
  const config = options.config ?? env;
  const dexScreenerClient = options.dexScreenerClient ?? new DexScreenerClient();
  const coinGeckoClient = options.coinGeckoClient ?? new CoinGeckoClient();
  const quarantineManager = options.quarantineManager ?? new QuarantineManager();

  router.get(
    '/compare',
    asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const rawSymbol = req.query.symbol;
      if (!rawSymbol || typeof rawSymbol !== 'string') {
        throw new ValidationError('Query parameter "symbol" is required and must be a string');
      }

      const upperSymbol = rawSymbol.trim().toUpperCase();
      const symbolConfig = SYMBOL_MAP[upperSymbol] ?? {
        query: upperSymbol,
        expectedSymbol: upperSymbol,
      };

      const dexPair = await findBestDexPair(
        dexScreenerClient,
        quarantineManager,
        symbolConfig,
        upperSymbol,
        config,
      );

      let cgData: { price: number; timestamp: number } | null = null;
      if (symbolConfig.coinGeckoId) {
        try {
          cgData = await coinGeckoClient.getPriceWithTimestamp(symbolConfig.coinGeckoId);
        } catch {
          // CoinGecko unreachable
        }
      }

      const dexPrice = dexPair?.priceUsd ?? 0;
      const dexTimestamp = dexPair?.timestamp ?? 0;
      const cgPrice = cgData?.price ?? 0;
      const cgTimestamp = cgData?.timestamp ?? 0;

      if (dexPrice === 0 && cgPrice === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: `No active market pairs found for symbol ${upperSymbol}`,
          },
        });
        return;
      }

      let deviationPercent = 0;
      if (dexPrice > 0 && cgPrice > 0) {
        deviationPercent = Number(((Math.abs(dexPrice - cgPrice) / cgPrice) * 100).toFixed(4));
      }

      const threshold = config.PRICE_DEVIATION_THRESHOLD_PERCENT ?? 1.0;
      const isDeviated = deviationPercent > threshold;

      let servedPrice = dexPrice;
      let servedSource = 'DEX Screener';
      if ((isDeviated && cgPrice > 0) || dexPrice === 0) {
        servedPrice = cgPrice;
        servedSource = 'CoinGecko';
      }

      res.status(200).json({
        success: true,
        symbol: upperSymbol,
        dexScreener: {
          price: dexPrice,
          pairAddress: dexPair?.pairAddress ?? null,
          chainId: dexPair?.chainId ?? null,
          timestamp: dexTimestamp,
        },
        coinGecko: {
          price: cgPrice,
          timestamp: cgTimestamp,
        },
        deviationPercent,
        thresholdPercent: threshold,
        isDeviated,
        servedPrice,
        servedSource,
      });
    }),
  );

  return router;
};

