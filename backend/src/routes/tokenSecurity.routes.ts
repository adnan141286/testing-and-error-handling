import { Router, Request, Response, NextFunction } from 'express';
import { GoPlusClient } from '../services/providers/goplus.client';
import { CacheManager } from '../services/cache/cacheManager';
import { QuarantineManager } from '../sanitizers/quarantine';
import { securityReportSchema, SecurityReport } from '../sanitizers/schemas';
import { eventLogger } from '../utils/eventLogger';
import { ValidationError } from '../errors/ValidationError';
import { ProviderError } from '../errors/ProviderError';
import { asyncHandler } from '../utils/asyncHandler';

export interface TokenSecurityRouterOptions {
  goPlusClient?: GoPlusClient;
  cacheManager?: CacheManager;
  quarantineManager?: QuarantineManager;
}

/**
 * Creates and configures the token security Express router.
 *
 * @param options - Injected GoPlus client, cache, and quarantine dependencies
 * @returns Configured Express router
 */
export const createTokenSecurityRouter = (options: TokenSecurityRouterOptions = {}): Router => {
  const router = Router();
  const cacheManager = options.cacheManager ?? new CacheManager();
  const goPlusClient = options.goPlusClient ?? new GoPlusClient({ cacheManager });
  const quarantineManager = options.quarantineManager ?? new QuarantineManager();

  router.get(
    '/security',
    asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const rawAddress = req.query.address;
      if (!rawAddress || typeof rawAddress !== 'string' || rawAddress.trim().length === 0) {
        throw new ValidationError('Query parameter "address" is required and must be a string');
      }

      const chain = typeof req.query.chain === 'string' ? req.query.chain.trim() : '1';
      const address = rawAddress.trim();

      let rawGoPlusData;
      try {
        const response = await goPlusClient.getTokenSecurity(chain, address);
        const addressKey = address.toLowerCase();
        rawGoPlusData = response.result?.[addressKey] ?? response.result?.[address];
      } catch (err) {
        throw new ProviderError(
          'goplus',
          `GoPlus Security provider failed for ${address}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          502,
          err,
        );
      }

      const rawBuy = parseFloat(rawGoPlusData?.buy_tax ?? '0');
      const safeBuyTax =
        rawBuy > 0 && rawBuy <= 1 ? rawBuy * 100 : Math.min(100, Math.max(0, rawBuy));
      const rawSell = parseFloat(rawGoPlusData?.sell_tax ?? '0');
      const safeSellTax =
        rawSell > 0 && rawSell <= 1 ? rawSell * 100 : Math.min(100, Math.max(0, rawSell));
      const isHoneypot =
        rawGoPlusData?.is_honeypot === '1' || rawGoPlusData?.is_honeypot === 'true';
      const riskLevel: 'CRITICAL' | 'LOW' = isHoneypot ? 'CRITICAL' : 'LOW';

      const recordToSanitize = {
        targetAddress: address,
        chainId: chain,
        isHoneypot,
        isBlacklisted: rawGoPlusData?.is_airdrop_scam === '1',
        isOpenSource: rawGoPlusData?.is_open_source !== '0',
        buyTax: safeBuyTax,
        sellTax: safeSellTax,
        riskLevel,
        threatFlags: isHoneypot ? ['HONEYPOT_DETECTED'] : [],
        timestamp: Date.now(),
      };

      const sanitized: SecurityReport | null = quarantineManager.sanitizeRecord(
        recordToSanitize,
        securityReportSchema,
        'goplus',
      );

      if (!sanitized) {
        quarantineManager.quarantine(
          recordToSanitize,
          `Token security report for ${address} failed schema validation`,
          'goplus',
        );
        throw new ProviderError(
          'goplus',
          `Security report for ${address} failed sanitation and was quarantined`,
          502,
        );
      }

      eventLogger.addEvent(
        'SECURITY_AUDIT',
        `Evaluated GoPlus token security for ${address} (Chain: ${chain}, Honeypot: ${sanitized.isHoneypot})`,
        {
          address,
          chain,
          isHoneypot: sanitized.isHoneypot,
          buyTax: sanitized.buyTax,
          sellTax: sanitized.sellTax,
        },
      );

      res.status(200).json({
        success: true,
        address: sanitized.targetAddress,
        chain: sanitized.chainId,
        isHoneypot: sanitized.isHoneypot,
        buyTax: sanitized.buyTax,
        sellTax: sanitized.sellTax,
        isOpenSource: sanitized.isOpenSource,
        riskLevel: sanitized.riskLevel,
        threatFlags: sanitized.threatFlags,
        source: 'GoPlus Security',
        timestamp: new Date(sanitized.timestamp).toISOString(),
      });
    }),
  );

  return router;
};
