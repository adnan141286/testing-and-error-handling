import { Pool } from 'pg';
import { DexScreenerClient } from '../providers/dexScreener.client';
import { CoinGeckoClient } from '../providers/coingecko.client';
import { QuarantineManager } from '../../sanitizers/quarantine';
import { DegradedModeEmitter } from '../../volatility/degradedMode';
import { OutlierDetector } from '../../volatility/outlierDetector';
import { SafeMathService } from '../../volatility/safeMath';
import { logger } from '../../utils/logger';
import { SYMBOL_MAP } from '../../routes/tokenPrice.constants';
import { findBestDexPair } from '../../routes/tokenPrice.helpers';

export interface PriceSample {
  symbol: string;
  price: number;
  liquidity: number;
  source: string;
  timestamp: number;
}

export interface PriceSamplerOptions {
  pool?: Pool;
  dexScreenerClient?: DexScreenerClient;
  coinGeckoClient?: CoinGeckoClient;
  degradedEmitter?: DegradedModeEmitter;
  intervalMs?: number;
}

const SUPPORTED_SYMBOLS = ['SOL', 'ETH', 'BTC', 'BNB'];

/**
 * Background price sampling service maintaining a 240-sample rolling window in memory and PostgreSQL.
 */
export class PriceSamplerService {
  private readonly pool?: Pool;
  private readonly dexClient: DexScreenerClient;
  private readonly coinGeckoClient: CoinGeckoClient;
  private readonly degradedEmitter: DegradedModeEmitter;
  private readonly outlierDetector: OutlierDetector;
  private readonly safeMath: SafeMathService;
  private readonly intervalMs: number;
  private readonly history: Map<string, PriceSample[]> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private isSampling = false;

  public constructor(options: PriceSamplerOptions = {}) {
    this.pool = options.pool;
    this.dexClient = options.dexScreenerClient ?? new DexScreenerClient();
    this.coinGeckoClient = options.coinGeckoClient ?? new CoinGeckoClient();
    this.degradedEmitter = options.degradedEmitter ?? new DegradedModeEmitter();
    this.outlierDetector = new OutlierDetector({}, this.degradedEmitter);
    this.safeMath = new SafeMathService(this.degradedEmitter);
    this.intervalMs = options.intervalMs ?? 15000;

    for (const sym of SUPPORTED_SYMBOLS) {
      this.history.set(sym, []);
    }
  }

  public getHistory(symbol: string): PriceSample[] {
    return [...(this.history.get(symbol.toUpperCase()) ?? [])];
  }

  public addSample(sample: PriceSample): void {
    const list = this.history.get(sample.symbol.toUpperCase()) ?? [];
    list.push(sample);
    if (list.length > 240) list.shift();
    this.history.set(sample.symbol.toUpperCase(), list);
  }

  public async seedFromCoinGecko(): Promise<void> {
    for (const sym of SUPPORTED_SYMBOLS) {
      const cfg = SYMBOL_MAP[sym];
      if (!cfg?.coinGeckoId) continue;
      try {
        const rawChart = await this.coinGeckoClient.getMarketChartPrices(cfg.coinGeckoId);
        if (rawChart.length > 0) {
          const slice = rawChart.slice(-240);
          const samples: PriceSample[] = slice.map(([ts, price]) => ({
            symbol: sym,
            price,
            liquidity: 10000000,
            source: 'CoinGecko (Seed)',
            timestamp: ts,
          }));
          this.history.set(sym, samples);
          logger.info({ symbol: sym, count: samples.length }, 'Seeded price history from CoinGecko');
        }
      } catch (err) {
        logger.warn({ symbol: sym, err }, 'Failed to seed from CoinGecko');
      }
    }
  }

  public async sampleOne(symbol: string): Promise<PriceSample | null> {
    const cfg = SYMBOL_MAP[symbol] ?? { query: symbol, expectedSymbol: symbol };
    const q = new QuarantineManager();
    let price = 0;
    let liquidity = 0;
    let source = 'DEX Screener';

    const pair = await findBestDexPair(this.dexClient, q, cfg, symbol);
    if (pair) {
      price = pair.priceUsd;
      liquidity = pair.liquidityUsd;
      source = 'DEX Screener';

      if (cfg.coinGeckoId) {
        try {
          const cgPrice = await this.coinGeckoClient.getPrice(cfg.coinGeckoId);
          if (cgPrice && cgPrice > 0 && Math.abs(price - cgPrice) / cgPrice > 0.01) {
            price = cgPrice;
            source = 'CoinGecko';
          }
        } catch {
          // Cross-check failed
        }
      }
    } else if (cfg.coinGeckoId) {
      const cgPrice = await this.coinGeckoClient.getPrice(cfg.coinGeckoId);
      if (cgPrice && cgPrice > 0) {
        price = cgPrice;
        liquidity = 10000000;
        source = 'CoinGecko';
      }
    }

    if (price <= 0) return null;

    const sample: PriceSample = { symbol, price, liquidity, source, timestamp: Date.now() };
    this.addSample(sample);
    this.evaluateDegradedAndAnomalies(symbol, sample);
    void this.persistSample(sample);
    return sample;
  }

  private evaluateDegradedAndAnomalies(symbol: string, sample: PriceSample): void {
    this.safeMath.handleLiquidity(sample.liquidity, symbol);
    const history = this.getHistory(symbol);
    const prices = history.map((s) => s.price);
    const prior = prices.slice(0, -1);
    if (prior.length >= 2) {
      this.outlierDetector.detect(sample.price, prior, symbol);
    }

    // Check DATA_STALE (if previous sample > 60s ago)
    if (history.length >= 2) {
      const prev = history[history.length - 2];
      if (prev && sample.timestamp - prev.timestamp > 60000) {
        this.degradedEmitter.emitDataStale({
          tokenOrPair: symbol,
          lastUpdated: prev.timestamp,
          staleDurationMs: sample.timestamp - prev.timestamp,
          maxAllowedAgeMs: 60000,
          timestamp: sample.timestamp,
        });
      }
    }
  }

  private async persistSample(sample: PriceSample): Promise<void> {
    if (!this.pool) return;
    try {
      const q = `INSERT INTO token_price_history (symbol, price, liquidity, source, timestamp) VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))`;
      await this.pool.query(q, [sample.symbol, sample.price, sample.liquidity, sample.source, sample.timestamp]);
    } catch {
      // Ignored if db unreachable
    }
  }

  public async sampleAll(): Promise<void> {
    if (this.isSampling) return;
    this.isSampling = true;
    try {
      for (const sym of SUPPORTED_SYMBOLS) {
        try {
          await this.sampleOne(sym);
        } catch {
          // Keep sampling others
        }
      }
    } finally {
      this.isSampling = false;
    }
  }

  public start(): void {
    if (this.timer) return;
    void this.sampleAll();
    this.timer = setInterval(() => void this.sampleAll(), this.intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
