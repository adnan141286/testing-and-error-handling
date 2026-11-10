import { DexScreenerClient } from '../services/providers/dexScreener.client';
import { QuarantineManager } from '../sanitizers/quarantine';
import { tokenPairSchema, TokenPair } from '../sanitizers/schemas';
import { RawDexScreenerPair } from '../services/providers/types';
import { SymbolTarget } from './tokenPrice.constants';
import { EnvConfig, env } from '../config/env';

/**
 * Extracts the pair's last update timestamp from the pair data itself.
 *
 * @param pair - Raw DEX Screener pair object
 * @returns Unix epoch millisecond timestamp
 */
export function extractPairTimestamp(pair: RawDexScreenerPair): number {
  if (typeof pair.timestamp === 'number' && pair.timestamp > 0) {
    return pair.timestamp;
  }

  if (pair.info?.openGraph) {
    const match = pair.info.openGraph.match(/timestamp=(\d+)/);
    if (match?.[1]) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  const txnsM5 = pair.txns?.m5;
  const volM5 = pair.volume?.m5 ?? 0;
  if (txnsM5 && txnsM5.buys + txnsM5.sells === 0 && volM5 === 0) {
    return Date.now() - 300_000;
  }

  if (txnsM5 && txnsM5.buys + txnsM5.sells > 0) {
    const total = txnsM5.buys + txnsM5.sells;
    const estOffsetMs = Math.min(30_000, Math.round(300_000 / total));
    return Date.now() - estOffsetMs;
  }

  return Date.now();
}

/**
 * Determines whether a pair timestamp is stale (> 60 seconds old).
 *
 * @param timestamp - Unix epoch millisecond timestamp
 * @param maxAgeMs - Maximum freshness threshold (default: 60,000ms)
 * @returns True if stale
 */
export function isPairStale(timestamp: number, maxAgeMs = 60_000): boolean {
  return Date.now() - timestamp > maxAgeMs;
}

/**
 * Searches DEX Screener for canonical pairs filtered by address, quote token, and volume.
 *
 * @param client - DexScreenerClient instance
 * @param quarantine - QuarantineManager for sanitizing payloads
 * @param symbolConfig - Target symbol configuration
 * @param upperSymbol - Normalized uppercase symbol
 * @param envConfig - Runtime environment configuration
 * @returns Sanitized token pair or null
 */
export async function findBestDexPair(
  client: DexScreenerClient,
  quarantine: QuarantineManager,
  symbolConfig: SymbolTarget,
  upperSymbol: string,
  envConfig?: EnvConfig,
): Promise<TokenPair | null> {
  try {
    const minLiq = envConfig?.DEX_MIN_LIQUIDITY_USD ?? env.DEX_MIN_LIQUIDITY_USD ?? 10_000;
    const minVol = envConfig?.DEX_MIN_VOLUME_24H_USD ?? env.DEX_MIN_VOLUME_24H_USD ?? 10_000;

    let pairs: RawDexScreenerPair[] = [];
    if (symbolConfig.canonicalAddress && client.getTokenPairs) {
      const resp = await client.getTokenPairs(symbolConfig.canonicalAddress);
      if (resp?.pairs && resp.pairs.length > 0) {
        pairs = resp.pairs;
      }
    }

    if (pairs.length === 0) {
      const searchResp = await client.searchPairs(symbolConfig.query ?? upperSymbol);
      if (searchResp?.pairs && searchResp.pairs.length > 0) {
        pairs = searchResp.pairs;
      }
    }

    if (pairs.length === 0) return null;

    const matchedPairs = pairs.filter((p) => {
      if (symbolConfig.canonicalChain && p.chainId) {
        if (p.chainId.toLowerCase() !== symbolConfig.canonicalChain.toLowerCase()) {
          return false;
        }
      }
      if (symbolConfig.canonicalAddress && p.baseToken?.address) {
        if (p.baseToken.address.toLowerCase() !== symbolConfig.canonicalAddress.toLowerCase()) {
          return false;
        }
      }
      if (symbolConfig.allowedQuotes && symbolConfig.allowedQuotes.length > 0) {
        const quoteSym = p.quoteToken?.symbol?.toUpperCase();
        if (!quoteSym || !symbolConfig.allowedQuotes.includes(quoteSym)) {
          return false;
        }
      } else {
        const baseSym = p.baseToken?.symbol?.toUpperCase();
        const allowed = symbolConfig.allowedSymbols ?? [];
        const symMatch =
          baseSym === upperSymbol ||
          baseSym === symbolConfig.expectedSymbol ||
          allowed.includes(baseSym ?? '');
        if (!symMatch && pairs.length > 1) return false;
      }
      return true;
    });

    const candidates = matchedPairs.length > 0 ? matchedPairs : pairs;
    const highVolumeCandidates = candidates.filter(
      (p) => (p.liquidity?.usd ?? 0) >= minLiq && (p.volume?.h24 ?? 0) >= minVol,
    );
    const pool = highVolumeCandidates.length > 0 ? highVolumeCandidates : candidates;

    const sortedPairs = [...pool].sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0));

    for (const pair of sortedPairs) {
      const pairTimestamp = extractPairTimestamp(pair);
      const recordToSanitize = {
        chainId: pair.chainId,
        dexId: pair.dexId,
        pairAddress: pair.pairAddress,
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        priceUsd: parseFloat(pair.priceUsd ?? '0'),
        liquidityUsd: pair.liquidity?.usd ?? 0,
        volume24hUsd: pair.volume?.h24 ?? 0,
        timestamp: pairTimestamp,
      };

      const sanitized = quarantine.sanitizeRecord(recordToSanitize, tokenPairSchema, 'dexscreener');
      if (sanitized) return sanitized;
    }
  } catch {
    // Upstream search failed
  }
  return null;
}
