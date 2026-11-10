import { DegradedModeEmitter } from './degradedMode';
import { LiquidityEvaluation, PriceMovementOptions, PriceMovementResult } from './safeMath.types';

export type { LiquidityEvaluation, PriceMovementOptions, PriceMovementResult };

/**
 * Performs division with protection against division-by-zero, NaN, and infinite values.
 *
 * @param numerator - Dividend
 * @param denominator - Divisor
 * @param fallback - Return value when division is invalid (default: 0)
 * @returns Quotient or fallback value
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  const safeFallback = Number.isFinite(fallback) ? fallback : 0;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return safeFallback;
  }
  const result = numerator / denominator;
  if (!Number.isFinite(result)) {
    return safeFallback;
  }
  return result === 0 ? 0 : result;
}

/**
 * Validates pool liquidity, never throws, and emits LIQUIDITY_ZERO on degraded emitter if invalid.
 *
 * @param liquidity - Pool liquidity value to validate
 * @param tokenOrPair - Token or market pair identifier
 * @param emitter - Optional DegradedModeEmitter to notify
 * @returns LiquidityEvaluation indicating validity and safe fallback
 */
export function handleLiquidity(
  liquidity: number,
  tokenOrPair = 'UNKNOWN',
  emitter?: DegradedModeEmitter,
): LiquidityEvaluation {
  if (!Number.isFinite(liquidity) || liquidity <= 0) {
    const safeValue = Number.isFinite(liquidity) ? liquidity : 0;
    const reason =
      liquidity <= 0 ? 'Zero or negative pool liquidity' : 'Non-finite liquidity value';
    if (emitter) {
      emitter.emitLiquidityZero({
        tokenOrPair,
        liquidity: safeValue,
        reason,
        timestamp: Date.now(),
      });
    }
    return { isValid: false, liquidity: 0, reason };
  }
  return { isValid: true, liquidity };
}

/**
 * Calculates trade price impact against pool liquidity safely, emitting LIQUIDITY_ZERO on zero liquidity.
 *
 * @param tradeAmount - Trade volume/amount
 * @param poolLiquidity - Total pool liquidity
 * @param tokenOrPair - Token or market pair identifier
 * @param emitter - Optional DegradedModeEmitter
 * @returns Price impact ratio (0.0 to 1.0+)
 */
export function calculatePriceImpact(
  tradeAmount: number,
  poolLiquidity: number,
  tokenOrPair = 'UNKNOWN',
  emitter?: DegradedModeEmitter,
): number {
  const liquidityResult = handleLiquidity(poolLiquidity, tokenOrPair, emitter);
  if (!liquidityResult.isValid) {
    return 1.0;
  }
  if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) {
    return 0;
  }
  return safeDivide(tradeAmount, liquidityResult.liquidity, 0);
}

/**
 * Evaluates price changes between ticks, safely handling flash crashes and extreme spikes.
 *
 * @param currentPrice - Current market price
 * @param previousPrice - Prior market price
 * @param options - Configuration options for spike and crash detection
 * @param emitter - Optional DegradedModeEmitter to alert
 * @returns PriceMovementResult detailing percentage change and extreme anomaly flags
 */
export function evaluatePriceMovement(
  currentPrice: number,
  previousPrice: number,
  options?: PriceMovementOptions,
  emitter?: DegradedModeEmitter,
): PriceMovementResult {
  const tokenOrPair = options?.tokenOrPair ?? 'UNKNOWN';
  const spikeThreshold = options?.spikeThresholdPercent ?? 100;
  const crashThreshold = options?.crashThresholdPercent ?? 80;

  const validCurrent = Number.isFinite(currentPrice) && currentPrice >= 0;
  const validPrevious = Number.isFinite(previousPrice) && previousPrice > 0;

  let percentageChange = 0;
  let isExtremeSpike = false;
  let isExtremeCrash = false;

  if (!validPrevious) {
    if (validCurrent && currentPrice > 0) {
      isExtremeSpike = true;
      percentageChange = 1000;
    }
  } else if (!validCurrent || currentPrice === 0) {
    isExtremeCrash = true;
    percentageChange = -100;
  } else {
    const rawChange = safeDivide(currentPrice - previousPrice, previousPrice, 0) * 100;
    percentageChange = Number.isFinite(rawChange) ? rawChange : 1000;
    if (percentageChange >= spikeThreshold) {
      isExtremeSpike = true;
    } else if (percentageChange <= -crashThreshold) {
      isExtremeCrash = true;
    }
  }

  const isExtreme = isExtremeSpike || isExtremeCrash;
  if (isExtreme && emitter) {
    emitter.emitPriceSpike({
      tokenOrPair,
      currentPrice: validCurrent ? currentPrice : 0,
      previousPrice: validPrevious ? previousPrice : 0,
      percentageChange,
      thresholdPercent: isExtremeSpike ? spikeThreshold : crashThreshold,
      timestamp: Date.now(),
    });
  }

  return {
    percentageChange,
    isExtremeSpike,
    isExtremeCrash,
    isExtreme,
    safePrice: validCurrent ? currentPrice : 0,
  };
}

/**
 * Service providing mathematical operations with built-in volatility guardrails and DI.
 */
export class SafeMathService {
  constructor(private readonly degradedEmitter?: DegradedModeEmitter) {}

  public safeDivide(numerator: number, denominator: number, fallback = 0): number {
    return safeDivide(numerator, denominator, fallback);
  }

  public handleLiquidity(liquidity: number, tokenOrPair = 'UNKNOWN'): LiquidityEvaluation {
    return handleLiquidity(liquidity, tokenOrPair, this.degradedEmitter);
  }

  public calculatePriceImpact(
    tradeAmount: number,
    poolLiquidity: number,
    tokenOrPair = 'UNKNOWN',
  ): number {
    return calculatePriceImpact(tradeAmount, poolLiquidity, tokenOrPair, this.degradedEmitter);
  }

  public evaluatePriceMovement(
    currentPrice: number,
    previousPrice: number,
    options?: PriceMovementOptions,
  ): PriceMovementResult {
    return evaluatePriceMovement(currentPrice, previousPrice, options, this.degradedEmitter);
  }
}
