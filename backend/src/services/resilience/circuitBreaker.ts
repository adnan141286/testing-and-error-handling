import { CIRCUIT_BREAKER_STATES, CircuitBreakerState } from '../../config/constants';
import { env } from '../../config/env';
import { CircuitOpenError } from '../../errors';

/**
 * Options configuring the CircuitBreaker policy.
 */
export interface CircuitBreakerOptions {
  serviceName?: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenSuccessThreshold?: number;
}

/**
 * Snapshot statistics for a CircuitBreaker instance.
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  timeUntilResetMs: number;
}

/**
 * Three-state circuit breaker pattern protecting calls to external services.
 */
export class CircuitBreaker {
  public readonly serviceName: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;

  private state: CircuitBreakerState = CIRCUIT_BREAKER_STATES.CLOSED;
  private failures = 0;
  private consecutiveSuccesses = 0;
  private lastStateChange: number = Date.now();
  private lastFailureTime?: number;

  /**
   * Initializes a new CircuitBreaker instance.
   *
   * @param options - Configuration options for thresholds and reset timings
   */
  public constructor(options: CircuitBreakerOptions = {}) {
    this.serviceName = options.serviceName ?? 'default_service';
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
  }

  /**
   * Returns the current active state of the circuit breaker.
   *
   * @returns CircuitBreakerState (CLOSED, OPEN, or HALF_OPEN)
   */
  public getState(): CircuitBreakerState {
    this.evaluateState();
    return this.state;
  }

  /**
   * Returns current statistics and metrics of the circuit breaker.
   *
   * @returns Current metrics snapshot
   */
  public getStats(): CircuitBreakerStats {
    this.evaluateState();
    const elapsed = Date.now() - this.lastStateChange;
    const remaining = Math.max(0, this.resetTimeoutMs - elapsed);

    return {
      state: this.state,
      failures: this.failures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      timeUntilResetMs: this.state === CIRCUIT_BREAKER_STATES.OPEN ? remaining : 0,
    };
  }

  /**
   * Executes an asynchronous operation through the circuit breaker guard.
   *
   * @param operation - Operation returning a Promise to execute
   * @returns Result of the operation
   * @throws CircuitOpenError if circuit is currently open
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === CIRCUIT_BREAKER_STATES.OPEN) {
      const elapsed = Date.now() - this.lastStateChange;
      const remaining = Math.max(0, this.resetTimeoutMs - elapsed);
      throw new CircuitOpenError(this.serviceName, undefined, remaining);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error: unknown) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Manually trips the circuit breaker into the OPEN state.
   */
  public trip(): void {
    this.state = CIRCUIT_BREAKER_STATES.OPEN;
    this.lastStateChange = Date.now();
    this.lastFailureTime = Date.now();
  }

  /**
   * Resets the circuit breaker to the initial CLOSED state.
   */
  public reset(): void {
    this.state = CIRCUIT_BREAKER_STATES.CLOSED;
    this.failures = 0;
    this.consecutiveSuccesses = 0;
    this.lastStateChange = Date.now();
  }

  /**
   * Evaluates if enough time has elapsed to transition from OPEN to HALF_OPEN.
   */
  private evaluateState(): void {
    if (this.state === CIRCUIT_BREAKER_STATES.OPEN) {
      const elapsed = Date.now() - this.lastStateChange;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = CIRCUIT_BREAKER_STATES.HALF_OPEN;
        this.lastStateChange = Date.now();
        this.consecutiveSuccesses = 0;
      }
    }
  }

  /**
   * Handles successful call outcome according to current state.
   */
  private onSuccess(): void {
    if (this.state === CIRCUIT_BREAKER_STATES.HALF_OPEN) {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.halfOpenSuccessThreshold) {
        this.reset();
      }
    } else if (this.state === CIRCUIT_BREAKER_STATES.CLOSED) {
      this.failures = 0;
    }
  }

  /**
   * Handles failure call outcome according to current state.
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    if (this.state === CIRCUIT_BREAKER_STATES.HALF_OPEN) {
      this.trip();
    } else if (this.state === CIRCUIT_BREAKER_STATES.CLOSED) {
      this.failures++;
      if (this.failures >= this.failureThreshold) {
        this.trip();
      }
    }
  }
}
