/**
 * DexScreener test fixtures.
 *
 * Types are defined in src/ and re-exported here so test files have a single
 * fixture import point.  No production src/ file may import from tests/.
 */
export type {
  RawDexScreenerPair,
  RawDexScreenerResponse,
} from '../../src/services/providers/types';

import type { RawDexScreenerResponse } from '../../src/services/providers/types';

/**
 * Sample fixture representing a valid DexScreener pair response.
 */
export const mockDexScreenerPairResponse: RawDexScreenerResponse = {
  schemaVersion: '1.0.0',
  pairs: [
    {
      chainId: 'ethereum',
      dexId: 'uniswap',
      url: 'https://dexscreener.com/ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
      pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
      baseToken: {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        symbol: 'USDC',
      },
      quoteToken: {
        address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        name: 'Wrapped Ether',
        symbol: 'WETH',
      },
      priceNative: '0.000305',
      priceUsd: '1.00',
      volume: {
        h24: 154200000,
        h6: 42500000,
        h1: 8200000,
        m5: 750000,
      },
      liquidity: {
        usd: 350000000,
        base: 180000000,
        quote: 51829,
      },
    },
  ],
};
