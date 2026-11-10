import { DegradedModeEmitter } from './degradedMode';
import { safeDivide } from './safeMath';

/**
 * Configuration options for outlier detection.
 */
export interface OutlierDetectorOptions {
  zScoreThreshold?: number;
  percentageJumpThreshold?: number;
  minHistoryLength?: number;
}

/**
 * Result of a Z-score statistical evaluation.
 */
export interface ZScoreResult {
  zScore: number;
  isOutlier: boolean;
  mean: number;
  stdDev: number;
}

/**
 * Result of a percentage jump anomaly evaluation.
 */
export interface PercentageJumpResult {
  percentageJump: number;
  isJump: boolean;
}

/**
 * Combined outlier detection outcome across both metrics.
 */
export interface OutlierDetectionResult {
  isOutlier: boolean;
  zScore: number;
  isZScoreOutlier: boolean;
  percentageJump: number;
  isPercentageJumpOutlier: boolean;
  mean: number;
  stdDev: number;
  reason: 'Z_SCORE' | 'PERCENTAGE_JUMP' | 'BOTH' | 'NONE';
}

/**
 * Calculates Z-score of a value against historical data series.
 *
 * @param value - Candidate value
 * @param history - Historical data points
 * @param threshold - Z-score outlier cutoff (default: 3.0)
 * @param minHistoryLength - Minimum required points (default: 3)
 * @returns ZScoreResult containing calculated metrics and outlier flag
 */
export function calculateZScore(
  value: number,
  history: number[],
  threshold = 3.0,
  minHistoryLength = 3,
): ZScoreResult {
  const validHistory = history.filter((v) => Number.isFinite(v));
  if (!Number.isFinite(value) || validHistory.length < minHistoryLength) {
    return { zScore: 0, isOutlier: false, mean: Number.isFinite(value) ? value : 0, stdDev: 0 };
  }

  const sum = validHistory.reduce((acc, v) => acc + v, 0);
  const mean = safeDivide(sum, validHistory.length, 0);

  const varianceSum = validHistory.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  const variance = safeDivide(varianceSum, validHistory.length, 0);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { zScore: 0, isOutlier: false, mean, stdDev: 0 };
  }

  const zScore = Math.abs(safeDivide(value - mean, stdDev, 0));
  return {
    zScore,
    isOutlier: zScore >= threshold,
    mean,
    stdDev,
  };
}

/**
 * Calculates percentage jump between current and prior tick.
 *
 * @param currentPrice - Current price
 * @param previousPrice - Reference baseline price
 * @param thresholdPercent - Jump threshold percentage (default: 50.0)
 * @returns PercentageJumpResult containing jump size and flag
 */
export function calculatePercentageJump(
  currentPrice: number,
  previousPrice: number,
  thresholdPercent = 50.0,
): PercentageJumpResult {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(previousPrice) || previousPrice <= 0) {
    if (previousPrice <= 0 && Number.isFinite(currentPrice) && currentPrice > 0) {
      return { percentageJump: 100, isJump: true };
    }
    return { percentageJump: 0, isJump: false };
  }

  const rawJump = Math.abs(safeDivide(currentPrice - previousPrice, previousPrice, 0)) * 100;
  const percentageJump = Number.isFinite(rawJump) ? rawJump : Number.MAX_SAFE_INTEGER;
  return {
    percentageJump,
    isJump: percentageJump >= thresholdPercent,
  };
}

/**
 * Outlier detector applying Z-score and percentage-jump filters with DI.
 */
export class OutlierDetector {
  private readonly zScoreThreshold: number;
  private readonly percentageJumpThreshold: number;
  private readonly minHistoryLength: number;

  constructor(
    options: OutlierDetectorOptions = {},
    private readonly degradedEmitter?: DegradedModeEmitter,
  ) {
    this.zScoreThreshold = options.zScoreThreshold ?? 3.0;
    this.percentageJumpThreshold = options.percentageJumpThreshold ?? 50.0;
    this.minHistoryLength = options.minHistoryLength ?? 3;
  }

  /**
   * Evaluates current price against history, emitting PRICE_SPIKE if an anomaly is found.
   *
   * @param currentPrice - Value to test
   * @param history - Recent price observations
   * @param tokenOrPair - Token or market pair identifier
   * @returns OutlierDetectionResult with comprehensive statistics
   */
  public detect(
    currentPrice: number,
    history: number[],
    tokenOrPair = 'UNKNOWN',
  ): OutlierDetectionResult {
    const zResult = calculateZScore(
      currentPrice,
      history,
      this.zScoreThreshold,
      this.minHistoryLength,
    );

    const validHistory = history.filter((v) => Number.isFinite(v));
    const previousPrice =
      validHistory.length > 0 ? (validHistory[validHistory.length - 1] as number) : currentPrice;

    const jumpResult = calculatePercentageJump(
      currentPrice,
      previousPrice,
      this.percentageJumpThreshold,
    );

    const isOutlier = zResult.isOutlier || jumpResult.isJump;
    let reason: 'Z_SCORE' | 'PERCENTAGE_JUMP' | 'BOTH' | 'NONE' = 'NONE';
    if (zResult.isOutlier && jumpResult.isJump) {
      reason = 'BOTH';
    } else if (zResult.isOutlier) {
      reason = 'Z_SCORE';
    } else if (jumpResult.isJump) {
      reason = 'PERCENTAGE_JUMP';
    }

    if (isOutlier && this.degradedEmitter) {
      this.degradedEmitter.emitPriceSpike({
        tokenOrPair,
        currentPrice: Number.isFinite(currentPrice) ? currentPrice : 0,
        previousPrice: Number.isFinite(previousPrice) ? previousPrice : 0,
        percentageChange: jumpResult.percentageJump,
        thresholdPercent: this.percentageJumpThreshold,
        timestamp: Date.now(),
      });
    }

    return {
      isOutlier,
      zScore: zResult.zScore,
      isZScoreOutlier: zResult.isOutlier,
      percentageJump: jumpResult.percentageJump,
      isPercentageJumpOutlier: jumpResult.isJump,
      mean: zResult.mean,
      stdDev: zResult.stdDev,
      reason,
    };
  }
}
