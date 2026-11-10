import { CircuitBreaker } from '../../src/services/resilience/circuitBreaker';
import { CIRCUIT_BREAKER_STATES } from '../../src/config/constants';
import { CircuitOpenError } from '../../src/errors';

describe('CircuitBreaker Pattern', (): void => {
  beforeEach((): void => {
    jest.useFakeTimers();
  });

  afterEach((): void => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should initialize with default options in CLOSED state', (): void => {
    const cb = new CircuitBreaker();
    expect(cb.serviceName).toBe('default_service');
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.CLOSED);
  });

  it('should execute successful operations and remain in CLOSED state', async (): Promise<void> => {
    const cb = new CircuitBreaker({ serviceName: 'dexscreener', failureThreshold: 3 });
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.CLOSED);

    const result = await cb.execute(async (): Promise<string> => 'data');
    expect(result).toBe('data');
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.CLOSED);
  });

  it('should transition from CLOSED to OPEN when failure threshold is reached', async (): Promise<void> => {
    const cb = new CircuitBreaker({
      serviceName: 'birdeye',
      failureThreshold: 2,
      resetTimeoutMs: 10000,
    });

    const failingOp = async (): Promise<never> => {
      throw new Error('API down');
    };

    // First failure
    await expect(cb.execute(failingOp)).rejects.toThrow('API down');
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.CLOSED);

    // Second failure -> reaches threshold 2
    await expect(cb.execute(failingOp)).rejects.toThrow('API down');
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.OPEN);

    // Third call while OPEN throws CircuitOpenError without calling the operation
    const opMock = jest.fn();
    await expect(cb.execute(opMock)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(opMock).not.toHaveBeenCalled();
  });

  it('should transition from OPEN to HALF_OPEN after reset timeout expires', async (): Promise<void> => {
    const cb = new CircuitBreaker({
      serviceName: 'goplus',
      failureThreshold: 1,
      resetTimeoutMs: 5000,
      halfOpenSuccessThreshold: 2,
    });

    cb.trip();
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.OPEN);

    // Advance time past reset timeout
    jest.advanceTimersByTime(5001);
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.HALF_OPEN);

    // In HALF_OPEN: trial success 1
    await cb.execute(async (): Promise<string> => 'trial-1');
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.HALF_OPEN);

    // In HALF_OPEN: trial success 2 -> reaches threshold 2 -> closes circuit!
    await cb.execute(async (): Promise<string> => 'trial-2');
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.CLOSED);
  });

  it('should re-open circuit if trial operation fails during HALF_OPEN', async (): Promise<void> => {
    const cb = new CircuitBreaker({
      serviceName: 'test-service',
      failureThreshold: 1,
      resetTimeoutMs: 5000,
    });

    cb.trip();
    jest.advanceTimersByTime(5001);
    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.HALF_OPEN);

    // Failing trial request immediately trips circuit back to OPEN
    await expect(
      cb.execute(async (): Promise<never> => {
        throw new Error('Trial failed');
      }),
    ).rejects.toThrow('Trial failed');

    expect(cb.getState()).toBe(CIRCUIT_BREAKER_STATES.OPEN);
  });

  it('should support manual trip and reset, and provide stats snapshot', (): void => {
    const cb = new CircuitBreaker({ serviceName: 'manual-test', resetTimeoutMs: 3000 });
    expect(cb.getStats().state).toBe(CIRCUIT_BREAKER_STATES.CLOSED);

    cb.trip();
    const openStats = cb.getStats();
    expect(openStats.state).toBe(CIRCUIT_BREAKER_STATES.OPEN);
    expect(openStats.timeUntilResetMs).toBeGreaterThan(0);

    cb.reset();
    const resetStats = cb.getStats();
    expect(resetStats.state).toBe(CIRCUIT_BREAKER_STATES.CLOSED);
    expect(resetStats.failures).toBe(0);
    expect(resetStats.timeUntilResetMs).toBe(0);
  });
});
