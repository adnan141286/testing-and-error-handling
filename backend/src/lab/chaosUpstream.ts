/**
 * Diagnostic Chaos Upstream Fixture.
 *
 * NOTE: This fixture is used EXCLUSIVELY in LAB_MODE=true for interactive test scenarios.
 * It is completely isolated in `src/lab/` and is NEVER used by the production provider clients.
 */
import { CircuitBreaker } from '../services/resilience/circuitBreaker';
import { CacheManager } from '../services/cache/cacheManager';

export interface RateLimitAttemptRecord {
  attempt: number;
  status: number;
  retryAfterSeconds?: number;
  backoffDelayMs: number;
  circuitBreakerState: string;
  message: string;
}

export interface OutageSimulationRecord {
  callNumber: number;
  status: number;
  circuitStateBefore: string;
  circuitStateAfter: string;
  servedStale: boolean;
  backoffDelayMs: number;
  retryAfterSeconds: number;
  message: string;
}

export interface RateLimitScenarioResult {
  scenario: 'rate_limit';
  success: boolean;
  totalAttempts: number;
  attempts: RateLimitAttemptRecord[];
  finalPayload: { symbol: string; price: number };
}

export interface OutageScenarioResult {
  scenario: 'outage';
  success: boolean;
  totalCalls: number;
  finalBreakerState: string;
  servedStale: boolean;
  stalePayload: { symbol: string; price: number; stale: boolean };
  trace: OutageSimulationRecord[];
}

/**
 * Simulates a rate limit scenario where the upstream returns 429 twice with Retry-After,
 * then successfully recovers on the third attempt.
 *
 * @returns Comprehensive simulation trace detailing attempts and delays
 */
export const runRateLimitScenario = async (): Promise<RateLimitScenarioResult> => {
  const attempts: RateLimitAttemptRecord[] = [];

  // Attempt 1: 429
  attempts.push({
    attempt: 1,
    status: 429,
    retryAfterSeconds: 1,
    backoffDelayMs: 1000,
    circuitBreakerState: 'CLOSED',
    message: 'Chaos upstream returned 429 Too Many Requests (Retry-After: 1s)',
  });

  // Attempt 2: 429
  attempts.push({
    attempt: 2,
    status: 429,
    retryAfterSeconds: 1,
    backoffDelayMs: 2000,
    circuitBreakerState: 'CLOSED',
    message: 'Chaos upstream returned 429 Too Many Requests (Retry-After: 1s)',
  });

  // Attempt 3: 200 OK
  attempts.push({
    attempt: 3,
    status: 200,
    retryAfterSeconds: 0,
    backoffDelayMs: 0,
    circuitBreakerState: 'CLOSED',
    message: 'Chaos upstream returned 200 OK after backoff recovery',
  });

  return {
    scenario: 'rate_limit',
    success: true,
    totalAttempts: 3,
    attempts,
    finalPayload: { symbol: 'CHAOS_MOCK_SOL', price: 122.5 },
  };
};

/**
 * Simulates an upstream outage scenario returning 503 until circuit breaker trips,
 * then serving the response from stale cache.
 *
 * @param cacheManager - Cache manager to seed and fetch stale records
 * @param circuitBreaker - Circuit breaker instance to evaluate
 * @returns Comprehensive simulation trace
 */
export const runOutageScenario = async (
  cacheManager: CacheManager,
  circuitBreaker: CircuitBreaker = new CircuitBreaker({
    serviceName: 'chaos_upstream',
    failureThreshold: 3,
  }),
): Promise<OutageScenarioResult> => {
  const staleData = { symbol: 'CHAOS_MOCK_ETH', price: 2250.0, stale: true };
  const cacheKey = 'chaos:outage:token:eth';
  await cacheManager.set(cacheKey, staleData, 60);

  const trace: OutageSimulationRecord[] = [];

  // Simulate failures until breaker trips
  for (let i = 1; i <= 3; i++) {
    const stateBefore = circuitBreaker.getState();
    try {
      await circuitBreaker.execute(async (): Promise<never> => {
        throw new Error('503 Service Unavailable');
      });
    } catch {
      // Ignored for simulation trace
    }
    const stateAfter = circuitBreaker.getState();
    trace.push({
      callNumber: i,
      status: 503,
      circuitStateBefore: stateBefore,
      circuitStateAfter: stateAfter,
      servedStale: false,
      backoffDelayMs: i * 1000,
      retryAfterSeconds: 0,
      message: `Upstream outage #${i} (503 Service Unavailable)`,
    });
  }

  // Next call: circuit breaker is now OPEN, serves stale data from cache
  const stateBeforeOpenCall = circuitBreaker.getState();
  let servedStale = false;
  let retrievedStaleData = staleData;

  if (stateBeforeOpenCall === 'OPEN') {
    const cached = await cacheManager.getStale<{ symbol: string; price: number; stale: boolean }>(
      cacheKey,
    );
    if (cached) {
      servedStale = true;
      retrievedStaleData = cached;
    }
  }

  trace.push({
    callNumber: 4,
    status: 200,
    circuitStateBefore: stateBeforeOpenCall,
    circuitStateAfter: circuitBreaker.getState(),
    servedStale,
    backoffDelayMs: 0,
    retryAfterSeconds: 0,
    message: 'Fast-failed with circuit OPEN, served stale ETH data from cache',
  });

  return {
    scenario: 'outage',
    success: true,
    totalCalls: trace.length,
    finalBreakerState: circuitBreaker.getState(),
    servedStale,
    stalePayload: retrievedStaleData,
    trace,
  };
};
