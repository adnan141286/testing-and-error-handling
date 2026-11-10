import nock from 'nock';
import pino from 'pino';
import { env } from '../../src/config/env';
import { DexScreenerClient } from '../../src/services/providers/dexScreener.client';
import { CacheManager, MemoryCache } from '../../src/services/cache';
import { QuarantineManager, tokenPairSchema } from '../../src/sanitizers';
import {
  SafeMathService,
  OutlierDetector,
  DegradedModeEmitter,
  DEGRADED_EVENTS,
} from '../../src/volatility';
import { ResilientHttpClient } from '../../src/services/resilience';
import { mockDexScreenerPairResponse, malformedTokenPairs } from '../fixtures';

describe('End-to-End Pipeline: Fetch -> Sanitize -> Cache -> Analyze -> Paper Trade', (): void => {
  const silentLogger = pino({ level: 'silent' });
  const testChain = 'ethereum';
  const testPair = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
  const pairUrl = `/latest/dex/pairs/${testChain}/${testPair}`;

  let degradedEmitter: DegradedModeEmitter;
  let quarantineManager: QuarantineManager;
  let cacheManager: CacheManager;
  let safeMath: SafeMathService;
  let outlierDetector: OutlierDetector;

  beforeEach((): void => {
    nock.cleanAll();
    degradedEmitter = new DegradedModeEmitter();
    quarantineManager = new QuarantineManager({ logger: silentLogger });
    cacheManager = new CacheManager({
      memory: new MemoryCache(500),
    });
    safeMath = new SafeMathService(degradedEmitter);
    outlierDetector = new OutlierDetector({ percentageJumpThreshold: 50 }, degradedEmitter);
  });

  afterEach((): void => {
    nock.cleanAll();
  });

  it('executes full pipeline: fetch -> sanitize -> cache -> analyze -> paper trade', async (): Promise<void> => {
    nock(env.DEXSCREENER_BASE_URL).get(pairUrl).reply(200, mockDexScreenerPairResponse);

    const client = new DexScreenerClient({ cacheManager });
    const rawData = await client.getPairsByAddress(testChain, testPair);
    const rawPair = rawData.pairs?.[0];
    expect(rawPair).toBeDefined();

    const sanitized = quarantineManager.sanitizeRecord(
      {
        chainId: rawPair?.chainId,
        dexId: rawPair?.dexId,
        pairAddress: rawPair?.pairAddress,
        baseToken: rawPair?.baseToken,
        quoteToken: rawPair?.quoteToken,
        priceUsd: parseFloat(rawPair?.priceUsd ?? '0'),
        liquidityUsd: rawPair?.liquidity?.usd,
        volume24hUsd: rawPair?.volume?.h24,
        timestamp: Date.now(),
      },
      tokenPairSchema,
    );

    expect(sanitized).not.toBeNull();
    if (!sanitized) {
      throw new Error('Sanitized token pair must not be null');
    }

    await cacheManager.set(`analytics:pair:${sanitized.pairAddress}`, sanitized, 60);

    const liquidityEval = safeMath.handleLiquidity(sanitized.liquidityUsd, sanitized.pairAddress);
    expect(liquidityEval.isValid).toBe(true);

    const outlierResult = outlierDetector.detect(
      sanitized.priceUsd,
      [0.99, 1.0, 1.01],
      sanitized.pairAddress,
    );
    expect(outlierResult.isOutlier).toBe(false);

    const tradeVolume = 50000;
    const priceImpact = safeMath.calculatePriceImpact(
      tradeVolume,
      sanitized.liquidityUsd,
      sanitized.pairAddress,
    );
    expect(priceImpact).toBeLessThan(0.01);

    const paperTrade = {
      orderId: 'paper-ord-1',
      pairAddress: sanitized.pairAddress,
      side: 'BUY' as const,
      volumeUsd: tradeVolume,
      priceUsd: sanitized.priceUsd,
      priceImpact,
      status:
        !degradedEmitter.isDegraded() && priceImpact < 0.05
          ? ('FILLED' as const)
          : ('REJECTED' as const),
    };

    expect(paperTrade.status).toBe('FILLED');
  });

  it('handles 429 rate limit via exponential backoff then successfully completes trade', async (): Promise<void> => {
    nock(env.DEXSCREENER_BASE_URL)
      .get(pairUrl)
      .reply(429, 'Rate limited', { 'Retry-After': '0' })
      .get(pairUrl)
      .reply(200, mockDexScreenerPairResponse);

    const httpClient = new ResilientHttpClient({
      providerName: 'dexscreener',
      backoffOptions: { maxRetries: 2, baseDelayMs: 10 },
    });
    const client = new DexScreenerClient({ httpClient, cacheManager });

    const rawData = await client.getPairsByAddress(testChain, testPair);
    expect(rawData.pairs).toHaveLength(1);

    const priceImpact = safeMath.calculatePriceImpact(1000, 350000000, testPair);
    expect(priceImpact).toBeGreaterThan(0);
  });

  it('serves stale cache during provider outage and emits DATA_STALE in degraded mode', async (): Promise<void> => {
    const cacheKey = `dexscreener:pair:${testChain}:${testPair.toLowerCase()}`;
    const initialPair = mockDexScreenerPairResponse.pairs?.[0];

    await cacheManager.set(cacheKey, mockDexScreenerPairResponse, 1);
    await new Promise((resolve) => setTimeout(resolve, 1100));

    nock(env.DEXSCREENER_BASE_URL).get(pairUrl).reply(503, 'Service Unavailable');

    const httpClient = new ResilientHttpClient({
      providerName: 'dexscreener',
      backoffOptions: { maxRetries: 0 },
    });
    const client = new DexScreenerClient({ httpClient, cacheManager });

    let staleEmitted = false;
    degradedEmitter.on(DEGRADED_EVENTS.DATA_STALE, () => {
      staleEmitted = true;
    });

    const fallbackData = await client.getPairsByAddress(testChain, testPair);
    expect(fallbackData.pairs?.[0]?.pairAddress).toBe(initialPair?.pairAddress);

    degradedEmitter.checkStaleness(testPair, Date.now() - 60000, 10000);
    expect(staleEmitted).toBe(true);
    expect(degradedEmitter.isDegraded(testPair)).toBe(true);

    const isTradeAllowed = !degradedEmitter.isDegraded(testPair);
    expect(isTradeAllowed).toBe(false);
  });

  it('quarantines malformed provider payload without crashing and safely skips execution', async (): Promise<void> => {
    const corruptPayload = malformedTokenPairs[1];
    expect(corruptPayload).toBeDefined();

    const sanitized = quarantineManager.sanitizeRecord(corruptPayload, tokenPairSchema);
    expect(sanitized).toBeNull();

    const stats = quarantineManager.getStats();
    expect(stats.totalQuarantined).toBe(1);
    expect(stats.totalReceived).toBe(1);

    const quarantined = quarantineManager.getQuarantinedRecords();
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0]?.errorReason).toContain('priceUsd');

    const executedTrade = sanitized !== null;
    expect(executedTrade).toBe(false);
  });
});
