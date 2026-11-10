import { Router, Request, Response, NextFunction } from 'express';
import { EthRpcClient } from '../services/providers/ethRpc.client';
import { CacheManager } from '../services/cache/cacheManager';
import { asyncHandler } from '../utils/asyncHandler';
import { eventLogger } from '../utils/eventLogger';
import { EnvConfig } from '../config/env';

export interface GasRouterOptions {
  ethRpcClient?: EthRpcClient;
  cacheManager?: CacheManager;
  config?: EnvConfig;
}

/**
 * Creates and configures the Ethereum network gas Express router.
 *
 * @param options - Injected EthRpcClient, CacheManager, and environment config
 * @returns Configured Express router
 */
export const createGasRouter = (options: GasRouterOptions = {}): Router => {
  const router = Router();
  const cacheManager = options.cacheManager ?? new CacheManager();
  const ethRpcClient = options.ethRpcClient ?? new EthRpcClient({ cacheManager });

  router.get(
    '/',
    asyncHandler(async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const cacheKey = 'network:gas:eth';
      const existing = await cacheManager.get<{ gwei: number; rawWei: string }>(cacheKey);

      let gwei = 0;
      let rawWei = '0';
      let wasCached = false;
      let isStale = false;
      let source = 'Ethereum RPC';

      if (existing !== null) {
        wasCached = true;
        gwei = existing.gwei;
        rawWei = existing.rawWei;
      } else {
        try {
          const result = await ethRpcClient.getGasPriceGwei();
          gwei = result.gwei;
          rawWei = result.rawWei;
        } catch (err) {
          // Attempt to retrieve stale data if upstream RPC is down
          const stale = await cacheManager.getStale<{ gwei: number; rawWei: string }>(cacheKey);
          if (stale !== null) {
            gwei = stale.gwei;
            rawWei = stale.rawWei;
            isStale = true;
            source = 'Ethereum RPC (Stale)';
          } else {
            throw err;
          }
        }
      }

      const formatted = gwei >= 1 ? `${Math.round(gwei)} Gwei` : `${gwei.toFixed(2)} Gwei`;

      eventLogger.addEvent('GAS_FETCH', `Fetched Ethereum gas price: ${formatted} (${source})`, {
        gwei,
        cached: wasCached,
        stale: isStale,
        source,
      });

      res.status(200).json({
        success: true,
        gwei,
        formatted,
        rawWei,
        source,
        cached: wasCached,
        stale: isStale,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  return router;
};
