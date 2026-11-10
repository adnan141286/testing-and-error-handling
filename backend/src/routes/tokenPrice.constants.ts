import { EnvConfig } from '../config/env';

export interface SymbolTarget {
  query: string;
  expectedSymbol: string;
  canonicalChain?: string;
  canonicalAddress?: string;
  allowedQuotes?: string[];
  allowedSymbols?: string[];
  birdeyeAddress?: string;
  birdeyeChain?: string;
  coinGeckoId?: string;
}

/**
 * Known token symbol mapping for DEX Screener search, CoinGecko fallback, and Birdeye queries.
 */
export const SYMBOL_MAP: Record<string, SymbolTarget> = {
  SOL: {
    query: 'SOL',
    expectedSymbol: 'SOL',
    canonicalChain: 'solana',
    canonicalAddress: 'So11111111111111111111111111111111111111112',
    allowedQuotes: ['USDC', 'USDT'],
    allowedSymbols: ['SOL', 'WSOL'],
    birdeyeAddress: 'So11111111111111111111111111111111111111112',
    birdeyeChain: 'solana',
    coinGeckoId: 'solana',
  },
  ETH: {
    query: 'WETH',
    expectedSymbol: 'WETH',
    canonicalChain: 'ethereum',
    canonicalAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    allowedQuotes: ['USDC', 'USDT'],
    allowedSymbols: ['ETH', 'WETH'],
    birdeyeAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    birdeyeChain: 'ethereum',
    coinGeckoId: 'ethereum',
  },
  BTC: {
    query: 'WBTC',
    expectedSymbol: 'WBTC',
    canonicalChain: 'ethereum',
    canonicalAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    allowedQuotes: ['USDT', 'USDC'],
    allowedSymbols: ['BTC', 'WBTC'],
    birdeyeAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    birdeyeChain: 'ethereum',
    coinGeckoId: 'bitcoin',
  },
  BNB: {
    query: 'WBNB',
    expectedSymbol: 'WBNB',
    canonicalChain: 'bsc',
    canonicalAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    allowedQuotes: ['USDT', 'USDC'],
    allowedSymbols: ['BNB', 'WBNB'],
    birdeyeAddress: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    birdeyeChain: 'bsc',
    coinGeckoId: 'binancecoin',
  },
};

/**
 * Checks whether the configured Birdeye API key is an active, valid key (not a placeholder).
 *
 * @param config - Runtime environment configuration
 * @returns True if Birdeye is actively configured
 */
export function isBirdeyeConfigured(config: EnvConfig): boolean {
  const key = config.BIRDEYE_API_KEY;
  return (
    Boolean(key) &&
    key !== 'placeholder_birdeye_api_key' &&
    key !== 'your_birdeye_api_key_here' &&
    key !== 'test_birdeye_key' &&
    !key.includes('placeholder') &&
    !key.includes('birdeye_api_key')
  );
}
