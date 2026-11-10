/**
 * Predefined sample batch payloads for Data Sanitation testing.
 */
export const SANITATION_SAMPLES: Record<string, unknown[]> = {
  'Valid Batch': [
    {
      chainId: 'solana',
      dexId: 'raydium',
      pairAddress: 'So11111111111111111111111111111111111111112',
      baseToken: {
        address: 'So11111111111111111111111111111111111111112',
        name: 'SOL',
        symbol: 'SOL',
      },
      quoteToken: {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'USDC',
        symbol: 'USDC',
      },
      priceUsd: 184.6,
      liquidityUsd: 2500000,
      volume24hUsd: 800000,
      timestamp: Date.now(),
    },
  ],
  'Null & Missing': [{ chainId: 'solana' }, null, {}],
  'NaN & Negative': [{ chainId: 'solana', priceUsd: -1, liquidityUsd: NaN }],
  'Bad Addresses': [
    { chainId: 'solana', pairAddress: 'invalid_addr', baseToken: { address: 'bad' } },
  ],
  'Duplicates': [
    { chainId: 'solana', timestamp: 100 },
    { chainId: 'solana', timestamp: 100 },
  ],
};

