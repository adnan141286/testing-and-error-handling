import { Router, Request, Response } from 'express';
import { TokenBucket } from '../services/resilience/tokenBucket';
import { calculateBackoffDelay, parseRetryAfter } from '../services/resilience/backoff';
import { CircuitBreaker } from '../services/resilience/circuitBreaker';
import { MemoryCache } from '../services/cache/memoryCache';
import { tokenPairSchema } from '../sanitizers/schemas';
import { QuarantineManager } from '../sanitizers/quarantine';
import { safeDivide, calculatePriceImpact } from '../volatility/safeMath';
import { calculateZScore, calculatePercentageJump } from '../volatility/outlierDetector';
import { eventLogger } from '../utils/eventLogger';
import { asyncHandler } from '../utils/asyncHandler';

export interface SelfTestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

/**
 * Creates and configures the Runtime Self-Test Express router.
 *
 * @returns Configured Express router
 */
export const createSelfTestRouter = (): Router => {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const overallStart = Date.now();
      const results: SelfTestResult[] = [];

      // 1. Rate Limiter (TokenBucket)
      const t1Start = Date.now();
      const bucket = new TokenBucket({ capacity: 5, refillRatePerSecond: 5 });
      const r1 = bucket.tryConsume(1) && bucket.getAvailableTokens() <= 4;
      results.push({
        name: 'Rate Limiter (Token Bucket)',
        passed: r1,
        durationMs: Date.now() - t1Start,
      });

      // 2. Exponential Backoff & Retry-After
      const t2Start = Date.now();
      const d1 = calculateBackoffDelay(0, { baseDelayMs: 100, jitterFactor: 0 });
      const pHeader = parseRetryAfter('5');
      const r2 = d1 === 100 && pHeader === 5000;
      results.push({
        name: 'Exponential Backoff Engine',
        passed: r2,
        durationMs: Date.now() - t2Start,
      });

      // 3. Circuit Breaker
      const t3Start = Date.now();
      const cb = new CircuitBreaker({ failureThreshold: 2 });
      cb.trip();
      const isTrip = cb.getState() === 'OPEN';
      cb.reset();
      const isReset = cb.getState() === 'CLOSED';
      results.push({
        name: 'Circuit Breaker State Machine',
        passed: isTrip && isReset,
        durationMs: Date.now() - t3Start,
      });

      // 4. Memory Cache Fallback
      const t4Start = Date.now();
      const memCache = new MemoryCache();
      await memCache.set('test_key', { ok: true }, 10);
      const cached = await memCache.get<{ ok: boolean }>('test_key');
      results.push({
        name: 'Multi-Tier Memory Cache',
        passed: cached?.ok === true,
        durationMs: Date.now() - t4Start,
      });

      // 5. Sanitizer / Zod Schemas
      const t5Start = Date.now();
      const parsedBad = tokenPairSchema.safeParse({ chainId: 'solana' });
      results.push({
        name: 'Zod Input Sanitation Engine',
        passed: !parsedBad.success,
        durationMs: Date.now() - t5Start,
      });

      // 6. Quarantine Manager
      const t6Start = Date.now();
      const qm = new QuarantineManager();
      qm.quarantine({ bad: true }, 'Test failure', 'selftest');
      results.push({
        name: 'Pipeline Quarantine Trap',
        passed: qm.getStats().totalQuarantined === 1,
        durationMs: Date.now() - t6Start,
      });

      // 7. Safe Math & Volatility
      const t7Start = Date.now();
      const divZero = safeDivide(100, 0, 0);
      const zeroImpact = calculatePriceImpact(1000, 0);
      results.push({
        name: 'Fault-Tolerant Safe Math',
        passed: divZero === 0 && zeroImpact === 1.0,
        durationMs: Date.now() - t7Start,
      });

      // 8. Outlier Detector
      const t8Start = Date.now();
      const zScoreRes = calculateZScore(500, [100, 102, 98, 101]);
      const jumpRes = calculatePercentageJump(150, 100);
      results.push({
        name: 'Statistical Outlier Detector',
        passed: zScoreRes.isOutlier && jumpRes.isJump,
        durationMs: Date.now() - t8Start,
      });

      const passedCount = results.filter((r) => r.passed).length;
      const failedCount = results.length - passedCount;
      const totalDurationMs = Date.now() - overallStart;

      eventLogger.addEvent(
        'SELF_TEST_RUN',
        `Self-test executed: ${passedCount}/${results.length} passed in ${totalDurationMs}ms`,
        { passed: passedCount, failed: failedCount, totalDurationMs },
      );

      res.status(200).json({
        success: failedCount === 0,
        timestamp: new Date().toISOString(),
        totalDurationMs,
        passed: passedCount,
        failed: failedCount,
        tests: results,
      });
    }),
  );

  return router;
};
