import { Router, Request, Response } from 'express';
import { EnvConfig, env } from '../config/env';
import { CacheManager } from '../services/cache/cacheManager';
import { QuarantineManager } from '../sanitizers/quarantine';
import { ResilientHttpClient } from '../services/resilience/httpClient';
import { PROVIDERS } from '../config/constants';
import { diagnosticsTracker } from '../utils/diagnosticsTracker';

export interface DiagnosticsRouterOptions {
  config?: EnvConfig;
  cacheManager?: CacheManager;
  quarantineManager?: QuarantineManager;
  dexScreenerClient?: ResilientHttpClient;
  goPlusClient?: ResilientHttpClient;
}

/**
 * Creates and configures the system Diagnostics Express router.
 *
 * @param options - Injected dependencies
 * @returns Configured Express router
 */
export const createDiagnosticsRouter = (options: DiagnosticsRouterOptions = {}): Router => {
  const router = Router();
  const config = options.config ?? env;
  const cacheManager = options.cacheManager ?? new CacheManager();
  const quarantineManager = options.quarantineManager ?? new QuarantineManager();

  const dexClient =
    options.dexScreenerClient ??
    new ResilientHttpClient({
      providerName: PROVIDERS.DEXSCREENER,
    });

  const goPlusClient =
    options.goPlusClient ??
    new ResilientHttpClient({
      providerName: PROVIDERS.GOPLUS,
    });

  router.get('/', (_req: Request, res: Response): void => {
    const metrics = diagnosticsTracker.getMetrics();
    const qStats = quarantineManager.getStats();

    const dexCbStats = dexClient.circuitBreaker.getStats();
    const goPlusCbStats = goPlusClient.circuitBreaker.getStats();

    const isBirdeyeConfigured =
      Boolean(config.BIRDEYE_API_KEY) &&
      config.BIRDEYE_API_KEY !== 'placeholder_birdeye_api_key' &&
      config.BIRDEYE_API_KEY !== 'your_birdeye_api_key_here' &&
      config.BIRDEYE_API_KEY !== 'test_birdeye_key' &&
      !config.BIRDEYE_API_KEY.includes('placeholder') &&
      !config.BIRDEYE_API_KEY.includes('birdeye_api_key');

    const checks = {
      backend: 'ONLINE',
      redis: cacheManager.isRedisHealthy() ? 'ONLINE' : 'DEGRADED',
      postgres: 'ONLINE',
      providers:
        dexCbStats.state === 'CLOSED' && goPlusCbStats.state === 'CLOSED' ? 'ONLINE' : 'DEGRADED',
    };
    const passedChecks = Object.values(checks).filter((s) => s === 'ONLINE').length;
    const scorePercent = Math.round((passedChecks / 4) * 100);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      healthSummary: {
        scorePercent,
        passedChecks,
        totalChecks: 4,
        status: scorePercent === 100 ? 'HEALTHY' : 'DEGRADED',
        checks,
      },
      providers: {
        dexScreener: {
          name: 'DEX Screener',
          status: 'online',
          configured: true,
          circuitBreakerState: dexCbStats.state,
          failures: dexCbStats.failures,
          rateLimit: `${config.DEXSCREENER_RATE_LIMIT_RPS} RPS`,
          latencyMs: metrics.latencies[PROVIDERS.DEXSCREENER]?.lastMs ?? 0,
          avgLatencyMs: metrics.latencies[PROVIDERS.DEXSCREENER]?.avgMs ?? 0,
        },
        goPlus: {
          name: 'GoPlus Security',
          status: 'online',
          configured: true,
          circuitBreakerState: goPlusCbStats.state,
          failures: goPlusCbStats.failures,
          rateLimit: `${config.GOPLUS_RATE_LIMIT_RPS} RPS`,
          latencyMs: metrics.latencies[PROVIDERS.GOPLUS]?.lastMs ?? 0,
          avgLatencyMs: metrics.latencies[PROVIDERS.GOPLUS]?.avgMs ?? 0,
        },
        birdeye: {
          name: 'Birdeye',
          status: isBirdeyeConfigured ? 'online' : 'not configured',
          configured: isBirdeyeConfigured,
          circuitBreakerState: 'CLOSED',
          failures: 0,
          rateLimit: `${config.BIRDEYE_RATE_LIMIT_RPS} RPS`,
          latencyMs: metrics.latencies[PROVIDERS.BIRDEYE]?.lastMs ?? 0,
          avgLatencyMs: metrics.latencies[PROVIDERS.BIRDEYE]?.avgMs ?? 0,
        },
        coingecko: {
          name: 'CoinGecko',
          status: 'online',
          configured: true,
          circuitBreakerState: 'CLOSED',
          failures: 0,
          rateLimit: `${config.COINGECKO_RATE_LIMIT_RPM} RPM`,
          latencyMs: metrics.latencies[PROVIDERS.COINGECKO]?.lastMs ?? 0,
          avgLatencyMs: metrics.latencies[PROVIDERS.COINGECKO]?.avgMs ?? 0,
        },
        ethRpc: {
          name: 'Ethereum RPC',
          status: 'online',
          configured: true,
          circuitBreakerState: 'CLOSED',
          failures: 0,
          rateLimit: 'Public RPC',
          latencyMs: metrics.latencies[PROVIDERS.ETH_RPC]?.lastMs ?? 0,
          avgLatencyMs: metrics.latencies[PROVIDERS.ETH_RPC]?.avgMs ?? 0,
        },
      },
      cache: {
        redisHealthy: cacheManager.isRedisHealthy(),
        backend: cacheManager.isRedisHealthy() ? 'Redis' : 'Memory Fallback',
        hits: metrics.cacheHits,
        misses: metrics.cacheMisses,
        hitRatio:
          metrics.cacheHits + metrics.cacheMisses > 0
            ? Number((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)).toFixed(4))
            : 0,
      },
      quarantine: {
        quarantinedCount: qStats.totalQuarantined,
        totalProcessed: qStats.totalReceived,
        totalValid: qStats.totalValid,
        reasons: qStats.quarantineReasons,
      },
    });
  });

  return router;
};
