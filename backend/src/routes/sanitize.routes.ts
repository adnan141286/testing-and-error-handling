import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { QuarantineManager } from '../sanitizers/quarantine';
import {
  tokenPairSchema,
  walletTransactionSchema,
  swapEventSchema,
  securityReportSchema,
} from '../sanitizers/schemas';
import { DexScreenerClient } from '../services/providers/dexScreener.client';
import { eventLogger } from '../utils/eventLogger';
import { asyncHandler } from '../utils/asyncHandler';
import { ValidationError } from '../errors/ValidationError';

export interface SanitizeRouterOptions {
  quarantineManager?: QuarantineManager;
  dexScreenerClient?: DexScreenerClient;
}

const SCHEMAS: Record<string, z.ZodTypeAny> = {
  tokenPair: tokenPairSchema,
  walletTransaction: walletTransactionSchema,
  swapEvent: swapEventSchema,
  securityReport: securityReportSchema,
};

/**
 * Creates and configures the Data Sanitation Express router.
 *
 * @param options - Injected dependency configuration
 * @returns Configured Express router
 */
export const createSanitizeRouter = (options: SanitizeRouterOptions = {}): Router => {
  const router = Router();
  const quarantineManager = options.quarantineManager ?? new QuarantineManager();
  const dexScreenerClient = options.dexScreenerClient ?? new DexScreenerClient();

  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { records, schemaType = 'tokenPair' } = req.body;
      if (!Array.isArray(records)) {
        throw new ValidationError('Field "records" must be an array of objects');
      }

      const targetSchema = SCHEMAS[schemaType] ?? tokenPairSchema;
      const initialQuarantinedCount = quarantineManager.getStats().totalQuarantined;
      const accepted: unknown[] = [];
      const quarantinedInBatch: unknown[] = [];

      for (const item of records) {
        const sanitized = quarantineManager.sanitizeRecord(
          item,
          targetSchema,
          `batch-${schemaType}`,
        );
        if (sanitized !== null) {
          accepted.push(sanitized);
        } else {
          quarantinedInBatch.push(item);
        }
      }

      const newlyQuarantined =
        quarantineManager.getStats().totalQuarantined - initialQuarantinedCount;
      const recentQuarantined = quarantineManager.getQuarantinedRecords().slice(-newlyQuarantined);

      eventLogger.addEvent(
        'DATA_SANITIZED',
        `Sanitized ${records.length} records (${accepted.length} accepted, ${quarantinedInBatch.length} quarantined)`,
        { schemaType, accepted: accepted.length, quarantined: quarantinedInBatch.length },
      );

      res.status(200).json({
        success: true,
        total: records.length,
        accepted: accepted.length,
        quarantined: quarantinedInBatch.length,
        acceptedRecords: accepted,
        quarantinedRecords: recentQuarantined,
      });
    }),
  );

  router.post(
    '/live',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim() : 'SOL';
      const searchResult = await dexScreenerClient.searchPairs(symbol);
      const rawPairs = searchResult.pairs ?? [];

      const accepted: unknown[] = [];
      const initialCount = quarantineManager.getStats().totalQuarantined;

      for (const pair of rawPairs) {
        const record = {
          chainId: pair.chainId,
          dexId: pair.dexId,
          pairAddress: pair.pairAddress,
          baseToken: pair.baseToken,
          quoteToken: pair.quoteToken,
          priceUsd: parseFloat(pair.priceUsd ?? '0'),
          liquidityUsd: pair.liquidity?.usd ?? 0,
          volume24hUsd: pair.volume?.h24 ?? 0,
          timestamp: Date.now(),
        };
        const sanitized = quarantineManager.sanitizeRecord(
          record,
          tokenPairSchema,
          'dexscreener-live',
        );
        if (sanitized !== null) {
          accepted.push(sanitized);
        }
      }

      const quarantinedCount = rawPairs.length - accepted.length;
      const newlyQuarantined = quarantineManager.getStats().totalQuarantined - initialCount;
      const quarantinedDetails = quarantineManager.getQuarantinedRecords().slice(-newlyQuarantined);

      eventLogger.addEvent(
        'LIVE_DATA_SANITIZED',
        `Fetched & sanitized ${rawPairs.length} live DEX Screener pairs for ${symbol} (${accepted.length} accepted)`,
        {
          symbol,
          total: rawPairs.length,
          accepted: accepted.length,
          quarantined: quarantinedCount,
        },
      );

      res.status(200).json({
        success: true,
        symbol,
        total: rawPairs.length,
        accepted: accepted.length,
        quarantined: quarantinedCount,
        acceptedRecords: accepted,
        quarantinedRecords: quarantinedDetails,
      });
    }),
  );

  return router;
};
