import { runRateLimitScenario, runOutageScenario } from '../../src/lab/chaosUpstream';
import { CacheManager } from '../../src/services/cache/cacheManager';

describe('chaosUpstream (LAB_MODE diagnostic fixture)', (): void => {
  describe('runRateLimitScenario()', (): void => {
    it('returns scenario=rate_limit with 3 attempts', async (): Promise<void> => {
      const result = await runRateLimitScenario();
      expect(result.scenario).toBe('rate_limit');
      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBe(3);
      expect(result.attempts).toHaveLength(3);
    });

    it('first two attempts are 429 with backoff', async (): Promise<void> => {
      const result = await runRateLimitScenario();
      const a0 = result.attempts[0];
      const a1 = result.attempts[1];
      expect(a0?.status).toBe(429);
      expect(a0?.backoffDelayMs).toBeGreaterThan(0);
      expect(a0?.circuitBreakerState).toBe('CLOSED');
      expect(a1?.status).toBe(429);
    });

    it('third attempt succeeds with status 200', async (): Promise<void> => {
      const result = await runRateLimitScenario();
      const a2 = result.attempts[2];
      expect(a2?.status).toBe(200);
      expect(a2?.backoffDelayMs).toBe(0);
    });

    it('finalPayload has symbol and price fields', async (): Promise<void> => {
      const result = await runRateLimitScenario();
      expect(typeof result.finalPayload.symbol).toBe('string');
      expect(typeof result.finalPayload.price).toBe('number');
    });
  });

  describe('runOutageScenario()', (): void => {
    let cacheManager: CacheManager;

    beforeEach((): void => {
      cacheManager = new CacheManager();
    });

    it('returns scenario=outage with success=true', async (): Promise<void> => {
      const result = await runOutageScenario(cacheManager);
      expect(result.scenario).toBe('outage');
      expect(result.success).toBe(true);
    });

    it('trace has 4 entries (3 failures + 1 stale serve)', async (): Promise<void> => {
      const result = await runOutageScenario(cacheManager);
      expect(result.trace).toHaveLength(4);
    });

    it('finalBreakerState is OPEN after failures', async (): Promise<void> => {
      const result = await runOutageScenario(cacheManager);
      expect(result.finalBreakerState).toBe('OPEN');
    });

    it('servedStale is true and stalePayload has symbol/price', async (): Promise<void> => {
      const result = await runOutageScenario(cacheManager);
      expect(result.servedStale).toBe(true);
      expect(typeof result.stalePayload.symbol).toBe('string');
      expect(typeof result.stalePayload.price).toBe('number');
    });
  });
});
