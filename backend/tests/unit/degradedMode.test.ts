import {
  DegradedModeEmitter,
  DEGRADED_EVENTS,
  LiquidityZeroPayload,
  PriceSpikePayload,
  DataStalePayload,
} from '../../src/volatility/degradedMode';

describe('DegradedModeEmitter Service', (): void => {
  let emitter: DegradedModeEmitter;

  beforeEach((): void => {
    emitter = new DegradedModeEmitter(5);
  });

  afterEach((): void => {
    emitter.removeAllListeners();
  });

  it('initializes with default options without crashing', (): void => {
    const defaultEmitter = new DegradedModeEmitter();
    expect(defaultEmitter.isDegraded()).toBe(false);
    expect(defaultEmitter.getRecentIncidents()).toEqual([]);
  });

  it('emits LIQUIDITY_ZERO event and stores incident record', (): void => {
    const received: LiquidityZeroPayload[] = [];
    emitter.on(DEGRADED_EVENTS.LIQUIDITY_ZERO, (payload: LiquidityZeroPayload) => {
      received.push(payload);
    });

    const payload: LiquidityZeroPayload = {
      tokenOrPair: 'TOKEN-ABC',
      liquidity: 0,
      reason: 'Zero or negative pool liquidity',
      timestamp: Date.now(),
    };

    const hasListeners = emitter.emitLiquidityZero(payload);
    expect(hasListeners).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]?.tokenOrPair).toBe('TOKEN-ABC');
    expect(emitter.isDegraded()).toBe(true);
    expect(emitter.isDegraded('TOKEN-ABC')).toBe(true);
    expect(emitter.isDegraded('TOKEN-XYZ')).toBe(false);
  });

  it('emits PRICE_SPIKE event and logs incident to active degraded set', (): void => {
    const received: PriceSpikePayload[] = [];
    emitter.on(DEGRADED_EVENTS.PRICE_SPIKE, (payload: PriceSpikePayload) => {
      received.push(payload);
    });

    const payload: PriceSpikePayload = {
      tokenOrPair: 'WETH-USDC',
      currentPrice: 5000,
      previousPrice: 2500,
      percentageChange: 100,
      thresholdPercent: 50,
      timestamp: Date.now(),
    };

    const hasListeners = emitter.emitPriceSpike(payload);
    expect(hasListeners).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]?.currentPrice).toBe(5000);
    expect(emitter.isDegraded('WETH-USDC')).toBe(true);
  });

  it('emits DATA_STALE event directly when emitDataStale is called', (): void => {
    const received: DataStalePayload[] = [];
    emitter.on(DEGRADED_EVENTS.DATA_STALE, (payload: DataStalePayload) => {
      received.push(payload);
    });

    const payload: DataStalePayload = {
      tokenOrPair: 'SOL-USDC',
      lastUpdated: Date.now() - 60000,
      staleDurationMs: 60000,
      maxAllowedAgeMs: 30000,
      timestamp: Date.now(),
    };

    const hasListeners = emitter.emitDataStale(payload);
    expect(hasListeners).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]?.tokenOrPair).toBe('SOL-USDC');
  });

  it('evaluates staleness correctly via checkStaleness', (): void => {
    const staleEvents: DataStalePayload[] = [];
    emitter.on(DEGRADED_EVENTS.DATA_STALE, (payload: DataStalePayload) => {
      staleEvents.push(payload);
    });

    const now = Date.now();
    // Fresh data
    const isFreshStale = emitter.checkStaleness('TOKEN-FRESH', now - 1000, 5000);
    expect(isFreshStale).toBe(false);
    expect(staleEvents).toHaveLength(0);

    // Expired data
    const isOldStale = emitter.checkStaleness('TOKEN-OLD', now - 10000, 5000);
    expect(isOldStale).toBe(true);
    expect(staleEvents).toHaveLength(1);
    expect(staleEvents[0]?.tokenOrPair).toBe('TOKEN-OLD');
  });

  it('caps the incident history at maxIncidentHistory', (): void => {
    for (let i = 0; i < 10; i++) {
      emitter.emitLiquidityZero({
        tokenOrPair: `TOKEN-${i}`,
        liquidity: 0,
        reason: 'Zero liquidity test',
        timestamp: Date.now(),
      });
    }

    const incidents = emitter.getRecentIncidents(20);
    expect(incidents).toHaveLength(5);
    expect(incidents[incidents.length - 1]?.tokenOrPair).toBe('TOKEN-9');
  });

  it('clears all incidents and degraded status on clear()', (): void => {
    emitter.emitLiquidityZero({
      tokenOrPair: 'TOKEN-CLEAR',
      liquidity: 0,
      reason: 'Testing clear',
      timestamp: Date.now(),
    });

    expect(emitter.isDegraded()).toBe(true);
    emitter.clear();
    expect(emitter.isDegraded()).toBe(false);
    expect(emitter.getRecentIncidents()).toEqual([]);
  });
});
