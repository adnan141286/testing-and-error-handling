import fc from 'fast-check';
import pino from 'pino';
import {
  normalizeBigNumber,
  normalizeTimestamp,
  normalizeAddress,
  toChecksumEvmAddress,
  QuarantineManager,
  tokenPairSchema,
  swapEventSchema,
} from '../../src/sanitizers';
import { SwapEvent } from '../../src/sanitizers/schemas';

describe('Fast-Check Property-Based Sanitizer Tests', (): void => {
  const silentLogger = pino({ level: 'silent' });

  it('Property: normalizeBigNumber never throws on arbitrary fuzzed inputs', (): void => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        let threw = false;
        let result: string | null = null;
        try {
          result = normalizeBigNumber(input);
        } catch {
          threw = true;
        }
        expect(threw).toBe(false);
        if (result !== null) {
          expect(result.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property: normalizeTimestamp produces valid epoch ms bounds or null, never throws', (): void => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        let threw = false;
        let result: number | null = null;
        try {
          result = normalizeTimestamp(input);
        } catch {
          threw = true;
        }
        expect(threw).toBe(false);
        if (result !== null) {
          expect(Number.isInteger(result)).toBe(true);
          expect(result).toBeGreaterThanOrEqual(946684800000);
          expect(result).toBeLessThanOrEqual(4102444800000);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property: address normalizers never crash on arbitrary randomized strings', (): void => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        let threw = false;
        try {
          toChecksumEvmAddress(input);
          normalizeAddress(input);
        } catch {
          threw = true;
        }
        expect(threw).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('Property: QuarantineManager never crashes on arbitrary fuzzed inputs', (): void => {
    const manager = new QuarantineManager({ logger: silentLogger });

    fc.assert(
      fc.property(fc.anything(), (corruptedRecord) => {
        let threw = false;
        try {
          manager.sanitizeRecord(corruptedRecord, tokenPairSchema);
          manager.sanitizeRecord(corruptedRecord, swapEventSchema);
        } catch {
          threw = true;
        }
        expect(threw).toBe(false);
      }),
      { numRuns: 150 },
    );
  });

  it('Property: batch sorting invariant produces monotonically non-decreasing timestamps', (): void => {
    const manager = new QuarantineManager({ logger: silentLogger });

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            txHash: fc.hexaString({ minLength: 64, maxLength: 64 }).map((h) => `0x${h}`),
            chainId: fc.constant('ethereum'),
            dexId: fc.constant('uniswap'),
            pairAddress: fc.constant('0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640'),
            sender: fc.constant('0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640'),
            tokenIn: fc.constant('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'),
            tokenOut: fc.constant('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'),
            amountIn: fc.constant('1000000'),
            amountOut: fc.constant('500'),
            priceUsd: fc.constant(2500.5),
            timestamp: fc.integer({ min: 1000000000, max: 2000000000 }),
          }),
          { minLength: 2, maxLength: 20 },
        ),
        (batch) => {
          const sorted = manager.sanitizeBatch(batch, swapEventSchema, {
            sortByTimestamp: true,
          });

          for (let i = 1; i < sorted.length; i++) {
            const prev: number = (sorted[i - 1] as SwapEvent).timestamp;
            const curr: number = (sorted[i] as SwapEvent).timestamp;
            expect(curr).toBeGreaterThanOrEqual(prev);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
