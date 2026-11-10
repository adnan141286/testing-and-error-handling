import fc from 'fast-check';
import {
  safeDivide,
  handleLiquidity,
  calculatePriceImpact,
  evaluatePriceMovement,
} from '../../src/volatility/safeMath';
import {
  calculateZScore,
  calculatePercentageJump,
  OutlierDetector,
} from '../../src/volatility/outlierDetector';
import { DegradedModeEmitter, DEGRADED_EVENTS } from '../../src/volatility/degradedMode';

describe('Fast-Check Property-Based Volatility Tests', (): void => {
  it('Property: safeDivide never throws on arbitrary floats (including 0, NaN, Infinities)', (): void => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double(),
          fc.constant(0),
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity),
        ),
        fc.oneof(
          fc.double(),
          fc.constant(0),
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity),
        ),
        fc.double(),
        (num, denom, fallback) => {
          let threw = false;
          let result = 0;
          try {
            result = safeDivide(num, denom, fallback);
          } catch {
            threw = true;
          }
          expect(threw).toBe(false);
          expect(Number.isFinite(result)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property: zero-liquidity or negative inputs never throw and consistently emit LIQUIDITY_ZERO', (): void => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double({ max: 0 }),
          fc.constant(0),
          fc.constant(-0),
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity),
        ),
        fc.string(),
        (liquidity, pair) => {
          const emitter = new DegradedModeEmitter();
          let emitted = false;
          emitter.on(DEGRADED_EVENTS.LIQUIDITY_ZERO, () => {
            emitted = true;
          });

          let threw = false;
          let valid = false;
          try {
            const evalResult = handleLiquidity(liquidity, pair, emitter);
            valid = evalResult.isValid;
          } catch {
            threw = true;
          }

          expect(threw).toBe(false);
          expect(valid).toBe(false);
          expect(emitted).toBe(true);
        },
      ),
      { numRuns: 150 },
    );
  });

  it('Property: calculatePriceImpact never throws and returns 1.0 on zero or negative liquidity', (): void => {
    fc.assert(
      fc.property(
        fc.double(),
        fc.oneof(fc.double({ max: 0 }), fc.constant(0), fc.constant(NaN)),
        fc.string(),
        (tradeAmount, poolLiquidity, pair) => {
          const emitter = new DegradedModeEmitter();
          let threw = false;
          let impact = 0;
          try {
            impact = calculatePriceImpact(tradeAmount, poolLiquidity, pair, emitter);
          } catch {
            threw = true;
          }

          expect(threw).toBe(false);
          expect(impact).toBe(1.0);
        },
      ),
      { numRuns: 150 },
    );
  });

  it('Property: evaluatePriceMovement never throws on arbitrary price pairs and safePrice is always non-negative', (): void => {
    fc.assert(
      fc.property(
        fc.oneof(fc.double(), fc.constant(0), fc.constant(NaN), fc.constant(Infinity)),
        fc.oneof(fc.double(), fc.constant(0), fc.constant(NaN), fc.constant(Infinity)),
        (current, previous) => {
          let threw = false;
          let safePrice = -1;
          try {
            const result = evaluatePriceMovement(current, previous);
            safePrice = result.safePrice;
          } catch {
            threw = true;
          }

          expect(threw).toBe(false);
          expect(safePrice).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(safePrice)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property: OutlierDetector.detect never throws on arbitrary price history and candidate prices', (): void => {
    fc.assert(
      fc.property(
        fc.double(),
        fc.array(fc.double(), { minLength: 0, maxLength: 50 }),
        fc.string(),
        (currentPrice, history, token) => {
          const emitter = new DegradedModeEmitter();
          const detector = new OutlierDetector(
            { zScoreThreshold: 3.0, percentageJumpThreshold: 50.0 },
            emitter,
          );

          let threw = false;
          let result: { isOutlier: boolean; zScore: number; percentageJump: number } | null = null;
          try {
            result = detector.detect(currentPrice, history, token);
          } catch {
            threw = true;
          }

          expect(threw).toBe(false);
          if (result !== null) {
            expect(typeof result.isOutlier).toBe('boolean');
            expect(Number.isFinite(result.zScore)).toBe(true);
            expect(Number.isFinite(result.percentageJump)).toBe(true);
          }
        },
      ),
      { numRuns: 150 },
    );
  });

  it('Property: calculateZScore and calculatePercentageJump never throw on arbitrary inputs', (): void => {
    fc.assert(
      fc.property(
        fc.double(),
        fc.array(fc.double(), { minLength: 0, maxLength: 30 }),
        fc.double(),
        fc.double(),
        (val, hist, curr, prev) => {
          let threw = false;
          let zScoreFinite = false;
          let jumpFinite = false;
          try {
            const z = calculateZScore(val, hist);
            const j = calculatePercentageJump(curr, prev);
            zScoreFinite = Number.isFinite(z.zScore);
            jumpFinite = Number.isFinite(j.percentageJump);
          } catch {
            threw = true;
          }
          expect(threw).toBe(false);
          expect(zScoreFinite).toBe(true);
          expect(jumpFinite).toBe(true);
        },
      ),
      { numRuns: 150 },
    );
  });
});
