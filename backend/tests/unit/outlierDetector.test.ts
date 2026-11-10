import {
  calculateZScore,
  calculatePercentageJump,
  OutlierDetector,
} from '../../src/volatility/outlierDetector';
import { DegradedModeEmitter, DEGRADED_EVENTS } from '../../src/volatility/degradedMode';

describe('OutlierDetector Volatility Module', (): void => {
  let emitter: DegradedModeEmitter;

  beforeEach((): void => {
    emitter = new DegradedModeEmitter();
  });

  describe('calculateZScore', (): void => {
    it('calculates Z-score accurately on normal distribution', (): void => {
      // Mean = 100, variance = 0, stdDev = 0
      const history = [100, 100, 100, 100];
      const result = calculateZScore(100, history);
      expect(result.zScore).toBe(0);
      expect(result.isOutlier).toBe(false);
      expect(result.mean).toBe(100);
      expect(result.stdDev).toBe(0);
    });

    it('identifies an extreme statistical outlier', (): void => {
      // Inject slight variation so stdDev > 0
      const variedHistory = [10, 10, 11, 9, 10];
      const result = calculateZScore(100, variedHistory, 3.0);
      expect(result.zScore).toBeGreaterThan(3.0);
      expect(result.isOutlier).toBe(true);
    });

    it('returns zero z-score if history length is less than minimum', (): void => {
      const result = calculateZScore(50, [10, 20], 3.0, 3);
      expect(result.zScore).toBe(0);
      expect(result.isOutlier).toBe(false);
    });

    it('safely filters out NaN and infinite values in history', (): void => {
      const result = calculateZScore(10, [10, NaN, Infinity, 10, 10]);
      expect(result.mean).toBe(10);
      expect(result.isOutlier).toBe(false);
    });
  });

  describe('calculatePercentageJump', (): void => {
    it('detects jumps exceeding percentage threshold', (): void => {
      const jumpResult = calculatePercentageJump(160, 100, 50);
      expect(jumpResult.percentageJump).toBe(60);
      expect(jumpResult.isJump).toBe(true);
    });

    it('ignores price changes within threshold limits', (): void => {
      const calmResult = calculatePercentageJump(110, 100, 50);
      expect(calmResult.percentageJump).toBe(10);
      expect(calmResult.isJump).toBe(false);
    });

    it('safely handles non-positive previous prices', (): void => {
      expect(calculatePercentageJump(100, 0).isJump).toBe(true);
      expect(calculatePercentageJump(0, 0).isJump).toBe(false);
      expect(calculatePercentageJump(-10, -5).isJump).toBe(false);
    });
  });

  describe('OutlierDetector Class with DI', (): void => {
    it('uses configured thresholds and detects anomalies', (): void => {
      const detector = new OutlierDetector(
        {
          zScoreThreshold: 2.5,
          percentageJumpThreshold: 30.0,
          minHistoryLength: 3,
        },
        emitter,
      );

      let priceSpikeEmitted = false;
      emitter.on(DEGRADED_EVENTS.PRICE_SPIKE, (payload) => {
        priceSpikeEmitted = true;
        expect(payload.tokenOrPair).toBe('TOKEN-ANOMALY');
      });

      const history = [100, 101, 99, 100];
      const result = detector.detect(150, history, 'TOKEN-ANOMALY');

      expect(result.isOutlier).toBe(true);
      expect(result.isPercentageJumpOutlier).toBe(true);
      expect(result.reason).toBeDefined();
      expect(priceSpikeEmitted).toBe(true);
    });

    it('reports NONE reason and does not emit when prices are stable', (): void => {
      const detector = new OutlierDetector({}, emitter);

      let emitted = false;
      emitter.on(DEGRADED_EVENTS.PRICE_SPIKE, () => {
        emitted = true;
      });

      const history = [100, 100.5, 99.8, 100.2];
      const result = detector.detect(100.3, history, 'TOKEN-STABLE');

      expect(result.isOutlier).toBe(false);
      expect(result.reason).toBe('NONE');
      expect(emitted).toBe(false);
    });

    it('identifies BOTH reason when both Z-score and percentage jump trigger', (): void => {
      const detector = new OutlierDetector(
        {
          zScoreThreshold: 2.0,
          percentageJumpThreshold: 40.0,
        },
        emitter,
      );

      const history = [10, 11, 9, 10, 10];
      const result = detector.detect(100, history, 'TOKEN-DUAL');

      expect(result.reason).toBe('BOTH');
      expect(result.isOutlier).toBe(true);
    });

    it('identifies Z_SCORE reason when only Z-score triggers', (): void => {
      const detector = new OutlierDetector(
        {
          zScoreThreshold: 2.0,
          percentageJumpThreshold: 200.0, // High jump threshold
        },
        emitter,
      );

      const history = [10, 10.1, 9.9, 10, 10];
      const result = detector.detect(15, history, 'TOKEN-Z');

      expect(result.reason).toBe('Z_SCORE');
      expect(result.isOutlier).toBe(true);
    });

    it('operates without emitter without throwing', (): void => {
      const detector = new OutlierDetector();
      expect(() => detector.detect(500, [100, 100, 100])).not.toThrow();
    });
  });
});
