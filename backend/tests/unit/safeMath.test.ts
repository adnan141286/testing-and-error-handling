import {
  safeDivide,
  handleLiquidity,
  calculatePriceImpact,
  evaluatePriceMovement,
  SafeMathService,
  DegradedModeEmitter,
  DEGRADED_EVENTS,
} from '../../src/volatility';

describe('SafeMath Volatility Module', (): void => {
  let emitter: DegradedModeEmitter;

  beforeEach((): void => {
    emitter = new DegradedModeEmitter();
  });

  describe('safeDivide', (): void => {
    it('performs standard division accurately', (): void => {
      expect(safeDivide(10, 2)).toBe(5);
      expect(safeDivide(1, 4)).toBe(0.25);
    });

    it('safely handles division by zero and returns fallback without throwing', (): void => {
      expect(safeDivide(100, 0)).toBe(0);
      expect(safeDivide(100, 0, -1)).toBe(-1);
    });

    it('safely handles non-finite inputs and NaN', (): void => {
      expect(safeDivide(NaN, 10)).toBe(0);
      expect(safeDivide(10, NaN)).toBe(0);
      expect(safeDivide(Infinity, 10)).toBe(0);
      expect(safeDivide(10, -Infinity)).toBe(0);
      expect(safeDivide(-0, 5)).toBe(0);
      expect(safeDivide(Number.MAX_VALUE, 5e-324, 0)).toBe(0);
    });
  });

  describe('handleLiquidity (Zero-Liquidity Handling)', (): void => {
    it('zero-liquidity input must never throw and must emit LIQUIDITY_ZERO event', (): void => {
      let emitted = false;
      let emittedPair = '';
      emitter.on(DEGRADED_EVENTS.LIQUIDITY_ZERO, (payload) => {
        emitted = true;
        emittedPair = payload.tokenOrPair;
      });

      const result = handleLiquidity(0, 'PAIR-ZERO', emitter);

      expect(result.isValid).toBe(false);
      expect(result.liquidity).toBe(0);
      expect(emitted).toBe(true);
      expect(emittedPair).toBe('PAIR-ZERO');
      expect(emitter.isDegraded('PAIR-ZERO')).toBe(true);
    });

    it('negative liquidity never throws and emits LIQUIDITY_ZERO', (): void => {
      let emitted = false;
      emitter.on(DEGRADED_EVENTS.LIQUIDITY_ZERO, () => {
        emitted = true;
      });

      const result = handleLiquidity(-500, 'PAIR-NEG', emitter);
      expect(result.isValid).toBe(false);
      expect(result.liquidity).toBe(0);
      expect(emitted).toBe(true);
    });

    it('NaN or Infinity liquidity never throws and emits LIQUIDITY_ZERO', (): void => {
      let emittedCount = 0;
      emitter.on(DEGRADED_EVENTS.LIQUIDITY_ZERO, () => {
        emittedCount++;
      });

      expect(handleLiquidity(NaN, 'PAIR-NAN', emitter).isValid).toBe(false);
      expect(handleLiquidity(Infinity, 'PAIR-INF', emitter).isValid).toBe(false);
      expect(emittedCount).toBe(2);
    });

    it('valid positive liquidity returns valid and does not emit event', (): void => {
      let emitted = false;
      emitter.on(DEGRADED_EVENTS.LIQUIDITY_ZERO, () => {
        emitted = true;
      });

      const result = handleLiquidity(1000000, 'PAIR-HEALTHY', emitter);
      expect(result.isValid).toBe(true);
      expect(result.liquidity).toBe(1000000);
      expect(emitted).toBe(false);
    });

    it('executes safely without emitter without throwing', (): void => {
      expect(() => handleLiquidity(0, 'PAIR-NO-EMITTER')).not.toThrow();
      const res = handleLiquidity(0, 'PAIR-NO-EMITTER');
      expect(res.isValid).toBe(false);
    });
  });

  describe('calculatePriceImpact', (): void => {
    it('calculates ratio for normal trade against pool liquidity', (): void => {
      const impact = calculatePriceImpact(100, 10000, 'PAIR-1');
      expect(impact).toBe(0.01);
    });

    it('zero liquidity pool returns 1.0 impact and emits LIQUIDITY_ZERO', (): void => {
      let emitted = false;
      emitter.on(DEGRADED_EVENTS.LIQUIDITY_ZERO, () => {
        emitted = true;
      });

      const impact = calculatePriceImpact(500, 0, 'PAIR-EMPTY', emitter);
      expect(impact).toBe(1.0);
      expect(emitted).toBe(true);
    });

    it('returns 0 for negative or non-finite trade volume', (): void => {
      expect(calculatePriceImpact(-10, 10000, 'PAIR-1')).toBe(0);
      expect(calculatePriceImpact(NaN, 10000, 'PAIR-1')).toBe(0);
    });
  });

  describe('evaluatePriceMovement (Spike & Crash Handling)', (): void => {
    it('detects extreme upward spike and emits PRICE_SPIKE', (): void => {
      let spikeDetected = false;
      emitter.on(DEGRADED_EVENTS.PRICE_SPIKE, (payload) => {
        spikeDetected = true;
        expect(payload.percentageChange).toBe(150);
      });

      const result = evaluatePriceMovement(250, 100, { spikeThresholdPercent: 100 }, emitter);
      expect(result.isExtremeSpike).toBe(true);
      expect(result.isExtremeCrash).toBe(false);
      expect(result.isExtreme).toBe(true);
      expect(spikeDetected).toBe(true);
    });

    it('detects flash crash and emits PRICE_SPIKE', (): void => {
      let crashDetected = false;
      emitter.on(DEGRADED_EVENTS.PRICE_SPIKE, () => {
        crashDetected = true;
      });

      const result = evaluatePriceMovement(10, 100, { crashThresholdPercent: 80 }, emitter);
      expect(result.isExtremeCrash).toBe(true);
      expect(result.isExtremeSpike).toBe(false);
      expect(result.isExtreme).toBe(true);
      expect(crashDetected).toBe(true);
    });

    it('does not emit or flag normal price fluctuations', (): void => {
      let emitted = false;
      emitter.on(DEGRADED_EVENTS.PRICE_SPIKE, () => {
        emitted = true;
      });

      const result = evaluatePriceMovement(102, 100, undefined, emitter);
      expect(result.isExtreme).toBe(false);
      expect(emitted).toBe(false);
    });

    it('safely handles spike from 0 previous price', (): void => {
      const result = evaluatePriceMovement(50, 0, undefined, emitter);
      expect(result.isExtremeSpike).toBe(true);
      expect(result.isExtreme).toBe(true);
    });

    it('safely handles total crash to 0 current price', (): void => {
      const result = evaluatePriceMovement(0, 100, undefined, emitter);
      expect(result.isExtremeCrash).toBe(true);
      expect(result.isExtreme).toBe(true);
    });

    it('handles negative or invalid prices without throwing', (): void => {
      const result = evaluatePriceMovement(-10, -5, undefined, emitter);
      expect(result.isExtreme).toBe(false);
      expect(result.safePrice).toBe(0);
    });
  });

  describe('SafeMathService with Dependency Injection', (): void => {
    it('delegates calls and utilizes injected emitter', (): void => {
      const service = new SafeMathService(emitter);

      expect(service.safeDivide(20, 4)).toBe(5);

      let emitted = false;
      emitter.on(DEGRADED_EVENTS.LIQUIDITY_ZERO, () => {
        emitted = true;
      });

      const liq = service.handleLiquidity(0, 'PAIR-DI');
      expect(liq.isValid).toBe(false);
      expect(emitted).toBe(true);

      const impact = service.calculatePriceImpact(10, 1000);
      expect(impact).toBe(0.01);

      const movement = service.evaluatePriceMovement(300, 100);
      expect(movement.isExtremeSpike).toBe(true);
    });
  });
});
