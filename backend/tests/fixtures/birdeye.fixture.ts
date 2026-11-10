/**
 * Birdeye test fixtures.
 *
 * Types are defined in src/ and re-exported here so test files have a single
 * fixture import point.  No production src/ file may import from tests/.
 */
export type {
  RawBirdeyePriceData,
  RawBirdeyePriceResponse,
  RawBirdeyeOverviewData,
  RawBirdeyeOverviewResponse,
} from '../../src/services/providers/types';

import type {
  RawBirdeyePriceResponse,
  RawBirdeyeOverviewResponse,
} from '../../src/services/providers/types';

/**
 * Sample fixture representing a valid Birdeye price response.
 */
export const mockBirdeyePriceResponse: RawBirdeyePriceResponse = {
  success: true,
  data: {
    value: 3450.75,
    updateUnixTime: 1718000000,
    updateHumanTime: '2026-06-10T08:00:00Z',
    priceChange24h: 3.42,
  },
};

/**
 * Sample fixture representing a valid Birdeye token overview response.
 */
export const mockBirdeyeOverviewResponse: RawBirdeyeOverviewResponse = {
  success: true,
  data: {
    address: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    symbol: 'SOL',
    name: 'Wrapped SOL',
    price: 148.25,
    liquidity: 125000000,
    v24hUSD: 85000000,
    mc: 68000000000,
  },
};
