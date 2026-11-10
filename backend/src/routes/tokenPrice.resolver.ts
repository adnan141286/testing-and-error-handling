import { DexScreenerClient } from '../services/providers/dexScreener.client';
import { BirdeyeClient } from '../services/providers/birdeye.client';
import { CoinGeckoClient } from '../services/providers/coingecko.client';
import { QuarantineManager } from '../sanitizers/quarantine';
import { handleLiquidity, evaluatePriceMovement } from '../volatility/safeMath';
import { eventLogger } from '../utils/eventLogger';
import { EnvConfig } from '../config/env';
import { SymbolTarget, isBirdeyeConfigured } from './tokenPrice.constants';
import { findBestDexPair, isPairStale } from './tokenPrice.helpers';

export interface PriceResolutionContext {
  dexScreenerClient: DexScreenerClient;
  birdeyeClient: BirdeyeClient;
  coinGeckoClient: CoinGeckoClient;
  quarantineManager: QuarantineManager;
  config: EnvConfig;
}

export interface ResolvedPriceData {
  finalPrice: number;
  finalLiquidity: number;
  source: string;
  isStale: boolean;
  isDeviated: boolean;
  deviationPercent: number;
  finalTimestamp: string;
}

/**
 * Resolves live market pricing across DEX Screener, Birdeye, and CoinGecko with deviation checks.
 *
 * @param symbolConfig - Target asset configuration
 * @param upperSymbol - Normalized uppercase token symbol
 * @param ctx - Service clients and configuration context
 * @returns Resolved price payload or null if no provider yielded data
 */
export async function resolveMarketPrice(
  symbolConfig: SymbolTarget,
  upperSymbol: string,
  ctx: PriceResolutionContext,
): Promise<ResolvedPriceData | null> {
  let finalPrice = 0;
  let finalLiquidity = 0;
  let source = 'DEX Screener';
  let isStale = false;
  let isDeviated = false;
  let deviationPercent = 0;
  let finalTimestamp = new Date().toISOString();

  const dexPair = await findBestDexPair(
    ctx.dexScreenerClient,
    ctx.quarantineManager,
    symbolConfig,
    upperSymbol,
    ctx.config,
  );

  if (dexPair) {
    finalLiquidity = handleLiquidity(dexPair.liquidityUsd).liquidity;
    finalPrice = evaluatePriceMovement(dexPair.priceUsd, dexPair.priceUsd).safePrice;
    source = 'DEX Screener';
    finalTimestamp = new Date(dexPair.timestamp).toISOString();
    isStale = isPairStale(dexPair.timestamp);

    if (symbolConfig.coinGeckoId) {
      try {
        const cgData = await ctx.coinGeckoClient.getPriceWithTimestamp(symbolConfig.coinGeckoId);
        if (cgData && cgData.price > 0) {
          deviationPercent = Number(
            ((Math.abs(finalPrice - cgData.price) / cgData.price) * 100).toFixed(4),
          );
          const threshold = ctx.config.PRICE_DEVIATION_THRESHOLD_PERCENT ?? 1.0;
          if (deviationPercent > threshold) {
            isDeviated = true;
            finalPrice = cgData.price;
            source = 'CoinGecko';
            finalTimestamp = new Date(cgData.timestamp).toISOString();
            eventLogger.addEvent(
              'PRICE_DEVIATION',
              `Price deviation ${deviationPercent}% exceeded ${threshold}% for ${upperSymbol}. Serving CoinGecko.`,
              { symbol: upperSymbol, dexPrice: dexPair.priceUsd, coinGeckoPrice: cgData.price, deviationPercent },
            );
          }
        }
      } catch {
        // Upstream cross-check failed
      }
    }
  } else if (isBirdeyeConfigured(ctx.config) && symbolConfig.birdeyeAddress) {
    try {
      const bRes = await ctx.birdeyeClient.getTokenPrice(
        symbolConfig.birdeyeAddress,
        symbolConfig.birdeyeChain ?? 'solana',
      );
      if (bRes?.data?.value && bRes.data.value > 0) {
        finalPrice = bRes.data.value;
        finalLiquidity = 1_000_000;
        source = 'Birdeye';
      }
    } catch {
      // Birdeye fallback failed
    }
  }

  if (finalPrice === 0 && symbolConfig.coinGeckoId) {
    try {
      const cgRes = await ctx.coinGeckoClient.getPriceWithTimestamp(symbolConfig.coinGeckoId);
      if (cgRes && cgRes.price > 0) {
        finalPrice = cgRes.price;
        finalLiquidity = 10_000_000;
        source = 'CoinGecko';
        finalTimestamp = new Date(cgRes.timestamp).toISOString();
        isStale = isPairStale(cgRes.timestamp);
      }
    } catch {
      // CoinGecko fallback failed
    }
  }

  if (finalPrice <= 0) return null;

  return {
    finalPrice,
    finalLiquidity,
    source,
    isStale,
    isDeviated,
    deviationPercent,
    finalTimestamp,
  };
}

