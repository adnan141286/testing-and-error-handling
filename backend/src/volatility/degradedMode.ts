import { EventEmitter } from 'events';

/**
 * Standard Degraded Mode Event names for the Whalepath Kill Switch module.
 */
export const DEGRADED_EVENTS = {
  LIQUIDITY_ZERO: 'LIQUIDITY_ZERO',
  PRICE_SPIKE: 'PRICE_SPIKE',
  DATA_STALE: 'DATA_STALE',
} as const;

export type DegradedEvent = (typeof DEGRADED_EVENTS)[keyof typeof DEGRADED_EVENTS];

/**
 * Event payload emitted when zero or negative pool liquidity is detected.
 */
export interface LiquidityZeroPayload {
  tokenOrPair: string;
  liquidity: number;
  reason: string;
  timestamp: number;
}

/**
 * Event payload emitted when an anomalous price spike or flash crash is detected.
 */
export interface PriceSpikePayload {
  tokenOrPair: string;
  currentPrice: number;
  previousPrice: number;
  percentageChange: number;
  thresholdPercent: number;
  timestamp: number;
}

/**
 * Event payload emitted when incoming price/market data exceeds freshness constraints.
 */
export interface DataStalePayload {
  tokenOrPair: string;
  lastUpdated: number;
  staleDurationMs: number;
  maxAllowedAgeMs: number;
  timestamp: number;
}

/**
 * Historical record of a triggered degraded event incident.
 */
export interface IncidentRecord {
  event: DegradedEvent;
  tokenOrPair: string;
  details: LiquidityZeroPayload | PriceSpikePayload | DataStalePayload;
  timestamp: number;
}

/**
 * EventEmitter service signaling volatility and market anomalies to the Kill Switch module.
 */
export class DegradedModeEmitter extends EventEmitter {
  private readonly incidents: IncidentRecord[] = [];
  private readonly maxIncidentHistory: number;
  private readonly degradedTokens: Set<string> = new Set();

  /**
   * Initializes DegradedModeEmitter with configurable history limits.
   *
   * @param maxIncidentHistory - Maximum number of incidents to retain in memory (default: 1000)
   */
  constructor(maxIncidentHistory = 1000) {
    super();
    this.maxIncidentHistory = maxIncidentHistory;
  }

  /**
   * Emits LIQUIDITY_ZERO event and logs incident to active degraded set.
   *
   * @param payload - Liquidity zero event details
   * @returns True if event had listeners
   */
  public emitLiquidityZero(payload: LiquidityZeroPayload): boolean {
    this.recordIncident(DEGRADED_EVENTS.LIQUIDITY_ZERO, payload.tokenOrPair, payload);
    return this.emit(DEGRADED_EVENTS.LIQUIDITY_ZERO, payload);
  }

  /**
   * Emits PRICE_SPIKE event and logs incident to active degraded set.
   *
   * @param payload - Price spike event details
   * @returns True if event had listeners
   */
  public emitPriceSpike(payload: PriceSpikePayload): boolean {
    this.recordIncident(DEGRADED_EVENTS.PRICE_SPIKE, payload.tokenOrPair, payload);
    return this.emit(DEGRADED_EVENTS.PRICE_SPIKE, payload);
  }

  /**
   * Emits DATA_STALE event and logs incident to active degraded set.
   *
   * @param payload - Data stale event details
   * @returns True if event had listeners
   */
  public emitDataStale(payload: DataStalePayload): boolean {
    this.recordIncident(DEGRADED_EVENTS.DATA_STALE, payload.tokenOrPair, payload);
    return this.emit(DEGRADED_EVENTS.DATA_STALE, payload);
  }

  /**
   * Evaluates timestamp freshness against maximum allowed age, emitting DATA_STALE if expired.
   *
   * @param tokenOrPair - Token or market pair symbol/address
   * @param lastUpdated - Epoch timestamp of last update in milliseconds
   * @param maxAllowedAgeMs - Maximum acceptable age in milliseconds
   * @returns True if data is stale and event was emitted, false if fresh
   */
  public checkStaleness(
    tokenOrPair: string,
    lastUpdated: number,
    maxAllowedAgeMs: number,
  ): boolean {
    const now = Date.now();
    const staleDurationMs = now - lastUpdated;
    if (staleDurationMs > maxAllowedAgeMs) {
      this.emitDataStale({
        tokenOrPair,
        lastUpdated,
        staleDurationMs,
        maxAllowedAgeMs,
        timestamp: now,
      });
      return true;
    }
    return false;
  }

  /**
   * Checks whether a specific token or pair (or any token) is in a degraded state.
   *
   * @param tokenOrPair - Optional token identifier to check specifically
   * @returns True if token/market is currently marked degraded
   */
  public isDegraded(tokenOrPair?: string): boolean {
    if (tokenOrPair !== undefined) {
      return this.degradedTokens.has(tokenOrPair);
    }
    return this.degradedTokens.size > 0;
  }

  /**
   * Returns recent recorded incidents up to the specified limit.
   *
   * @param limit - Maximum incidents to return (default: 50)
   * @returns Array of recent incidents
   */
  public getRecentIncidents(limit = 50): IncidentRecord[] {
    return this.incidents.slice(-limit);
  }

  /**
   * Clears all recorded incidents and degraded flags.
   */
  public clear(): void {
    this.incidents.length = 0;
    this.degradedTokens.clear();
  }

  private recordIncident(
    event: DegradedEvent,
    tokenOrPair: string,
    details: LiquidityZeroPayload | PriceSpikePayload | DataStalePayload,
  ): void {
    this.degradedTokens.add(tokenOrPair);
    if (this.incidents.length >= this.maxIncidentHistory) {
      this.incidents.shift();
    }
    this.incidents.push({
      event,
      tokenOrPair,
      details,
      timestamp: Date.now(),
    });
  }
}
