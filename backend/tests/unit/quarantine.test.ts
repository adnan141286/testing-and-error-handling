import pino from 'pino';
import { QuarantineManager, swapEventSchema } from '../../src/sanitizers';
import {
  duplicateBatchRecords,
  outOfOrderBatchRecords,
  malformedSwapEvents,
} from '../fixtures/malformed.fixture';

describe('QuarantineManager Pipeline Fault-Tolerance', (): void => {
  let silentLogger: pino.Logger;
  let quarantineManager: QuarantineManager;

  beforeEach((): void => {
    silentLogger = pino({ level: 'silent' });
    quarantineManager = new QuarantineManager({ logger: silentLogger, maxQuarantinedItems: 5 });
  });

  it('sanitizes valid records and increments success statistics', (): void => {
    const valid = {
      txHash: '0x4f49479e0bf0327fef66b19d41d91456a00c6dc6714a9cd3a17e5a8820f18c57',
      chainId: 'ethereum',
      dexId: 'uniswap',
      pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
      sender: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
      tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      amountIn: '1000000',
      amountOut: '350',
      priceUsd: 3500.0,
      timestamp: 1718000000000,
    };

    const sanitized = quarantineManager.sanitizeRecord(valid, swapEventSchema);
    expect(sanitized).not.toBeNull();
    expect(quarantineManager.getStats().totalValid).toBe(1);
    expect(quarantineManager.getStats().totalQuarantined).toBe(0);
  });

  it('safely traps and quarantines null or malformed payloads without crashing', (): void => {
    const nullRes = quarantineManager.sanitizeRecord(null, swapEventSchema);
    expect(nullRes).toBeNull();

    for (const malformed of malformedSwapEvents) {
      const res = quarantineManager.sanitizeRecord(malformed, swapEventSchema);
      expect(res).toBeNull();
    }

    const stats = quarantineManager.getStats();
    expect(stats.totalQuarantined).toBe(1 + malformedSwapEvents.length);
    expect(quarantineManager.getQuarantinedRecords().length).toBeGreaterThan(0);
  });

  it('processes batches, discarding malformed records and non-arrays gracefully', (): void => {
    const nonArrayRes = quarantineManager.sanitizeBatch(
      'not-an-array' as unknown as unknown[],
      swapEventSchema,
    );
    expect(nonArrayRes).toEqual([]);

    const mixedBatch = [
      null,
      malformedSwapEvents[0],
      {
        txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        chainId: 'ethereum',
        dexId: 'uniswap',
        pairAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
        sender: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
        tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        amountIn: '100',
        amountOut: '50',
        priceUsd: 1000.0,
        timestamp: 1718000010000,
      },
    ];

    const clean = quarantineManager.sanitizeBatch(mixedBatch, swapEventSchema);
    expect(clean).toHaveLength(1);
  });

  it('detects and quarantines duplicate records in batches', (): void => {
    const clean = quarantineManager.sanitizeBatch(duplicateBatchRecords, swapEventSchema, {
      deduplicateBy: (item) => item.txHash,
    });

    expect(clean).toHaveLength(1);
    expect(quarantineManager.getStats().totalQuarantined).toBe(1);
  });

  it('re-orders out-of-order records into correct chronological order', (): void => {
    const sorted = quarantineManager.sanitizeBatch(outOfOrderBatchRecords, swapEventSchema, {
      sortByTimestamp: true,
    });

    expect(sorted).toHaveLength(3);
    expect(sorted[0]?.timestamp).toBe(1718000010000);
    expect(sorted[1]?.timestamp).toBe(1718000020000);
    expect(sorted[2]?.timestamp).toBe(1718000030000);
  });

  it('enforces maximum capacity on quarantined memory buffer', (): void => {
    for (let i = 0; i < 10; i++) {
      quarantineManager.quarantine({ test: i }, 'Capacity test reason');
    }

    expect(quarantineManager.getQuarantinedRecords().length).toBe(5);
  });

  it('resets counters and clears records on clear()', (): void => {
    quarantineManager.quarantine({ a: 1 }, 'Test');
    expect(quarantineManager.getStats().totalQuarantined).toBe(1);

    quarantineManager.clear();
    expect(quarantineManager.getStats().totalQuarantined).toBe(0);
    expect(quarantineManager.getQuarantinedRecords()).toHaveLength(0);
  });
});
