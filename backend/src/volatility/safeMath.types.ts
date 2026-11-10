/**
 * Result of pool liquidity evaluation.
 */
export interface LiquidityEvaluation {
  isValid: boolean;
  liquidity: number;
  reason?: string;
}

/**
 * Options for evaluating price movement and flash anomalies.
 */
export interface PriceMovementOptions {
  spikeThresholdPercent?: number;
  crashThresholdPercent?: number;
  tokenOrPair?: string;
}

/**
 * Result of price movement evaluation.
 */
export interface PriceMovementResult {
  percentageChange: number;
  isExtremeSpike: boolean;
  isExtremeCrash: boolean;
  isExtreme: boolean;
  safePrice: number;
}
