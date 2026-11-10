/**
 * Volatility test scenario definitions.
 */
export const VOLATILITY_SCENARIOS: Record<
  string,
  { liquidity: string; tradeSize: string; prices: string }
> = {
  'Zero Liquidity': { liquidity: '0', tradeSize: '1000', prices: '100,101,102' },
  'Price Spike +50%': { liquidity: '1000000', tradeSize: '5000', prices: '100,101,99,150' },
  'Price Crash -60%': { liquidity: '1000000', tradeSize: '5000', prices: '100,99,101,40' },
  'Stale Data': { liquidity: '500000', tradeSize: '1000', prices: '100,100,100,100' },
};

