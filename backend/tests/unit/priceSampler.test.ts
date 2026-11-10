import { Pool } from 'pg';
import { PriceSamplerService } from '../../src/services/sampler/priceSampler.service';
import { DexScreenerClient } from '../../src/services/providers/dexScreener.client';
import { CoinGeckoClient } from '../../src/services/providers/coingecko.client';
import { DegradedModeEmitter } from '../../src/volatility/degradedMode';

describe('PriceSamplerService', (): void => {
  let mockPool: Partial<Pool>;
  let mockDexClient: Partial<DexScreenerClient>;
  let mockCoinGeckoClient: Partial<CoinGeckoClient>;
  let degradedEmitter: DegradedModeEmitter;
  let sampler: PriceSamplerService;

  beforeEach((): void => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [] } as never),
    };
    mockDexClient = {
      searchPairs: jest.fn().mockResolvedValue({
        schemaVersion: '1.0.0',
        pairs: [
          {
            chainId: 'solana',
            dexId: 'raydium',
            url: 'https://dexscreener.com/solana/1',
            pairAddress: 'So11111111111111111111111111111111111111112',
            baseToken: {
              address: 'So11111111111111111111111111111111111111112',
              name: 'SOL',
              symbol: 'SOL',
              decimals: 9,
            },
            quoteToken: {
              address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              name: 'USDC',
              symbol: 'USDC',
              decimals: 6,
            },
            priceUsd: '150.25',
            liquidity: { usd: 5000000 },
          },
        ],
      }),
    };
    mockCoinGeckoClient = {
      getMarketChartPrices: jest.fn().mockResolvedValue([
        [1000, 140],
        [2000, 150],
      ]),
      getPrice: jest.fn().mockResolvedValue(155.5),
    };
    degradedEmitter = new DegradedModeEmitter();
    sampler = new PriceSamplerService({
      pool: mockPool as Pool,
      dexScreenerClient: mockDexClient as DexScreenerClient,
      coinGeckoClient: mockCoinGeckoClient as CoinGeckoClient,
      degradedEmitter,
      intervalMs: 100,
    });
  });

  afterEach((): void => {
    sampler.stop();
  });

  it('manages rolling history and caps at 240 samples', (): void => {
    expect(sampler.getHistory('SOL')).toHaveLength(0);
    for (let i = 0; i < 245; i++) {
      sampler.addSample({
        symbol: 'SOL',
        price: 100 + i,
        liquidity: 1000,
        source: 'Test',
        timestamp: 1000 + i * 1000,
      });
    }
    const history = sampler.getHistory('sol');
    expect(history).toHaveLength(240);
    expect(history[0]?.price).toBe(105);
  });

  it('seeds history from CoinGecko market chart', async (): Promise<void> => {
    await sampler.seedFromCoinGecko();
    expect(mockCoinGeckoClient.getMarketChartPrices).toHaveBeenCalled();
    const solHistory = sampler.getHistory('SOL');
    expect(solHistory.length).toBeGreaterThan(0);
    expect(solHistory[0]?.source).toBe('CoinGecko (Seed)');
  });

  it('handles CoinGecko seed failures gracefully', async (): Promise<void> => {
    (mockCoinGeckoClient.getMarketChartPrices as jest.Mock).mockRejectedValueOnce(
      new Error('Rate limited'),
    );
    await expect(sampler.seedFromCoinGecko()).resolves.not.toThrow();
  });

  it('samples a single symbol via DEX Screener and persists to DB', async (): Promise<void> => {
    const sample = await sampler.sampleOne('SOL');
    expect(sample).not.toBeNull();
    expect(sample?.price).toBe(150.25);
    expect(sample?.source).toBe('DEX Screener');
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('falls back to CoinGecko when DEX Screener returns no valid pair', async (): Promise<void> => {
    (mockDexClient.searchPairs as jest.Mock).mockResolvedValueOnce({ pairs: [] });
    const sample = await sampler.sampleOne('ETH');
    expect(sample).not.toBeNull();
    expect(sample?.price).toBe(155.5);
    expect(sample?.source).toBe('CoinGecko');
  });

  it('returns null if both DEX Screener and CoinGecko fail', async (): Promise<void> => {
    (mockDexClient.searchPairs as jest.Mock).mockResolvedValueOnce({ pairs: [] });
    (mockCoinGeckoClient.getPrice as jest.Mock).mockResolvedValueOnce(null);
    const sample = await sampler.sampleOne('BTC');
    expect(sample).toBeNull();
  });

  it('detects outlier and emits DATA_STALE on large timestamp gaps', async (): Promise<void> => {
    const emitSpy = jest.spyOn(degradedEmitter, 'emitDataStale');
    sampler.addSample({
      symbol: 'BNB',
      price: 300,
      liquidity: 5000000,
      source: 'seed',
      timestamp: 1000,
    });
    sampler.addSample({
      symbol: 'BNB',
      price: 302,
      liquidity: 5000000,
      source: 'seed',
      timestamp: 2000,
    });

    // Sample with > 60s gap and large price jump
    (mockDexClient.searchPairs as jest.Mock).mockResolvedValueOnce({
      pairs: [{ priceUsd: '900', liquidity: { usd: 5000000 }, baseToken: { symbol: 'WBNB' } }],
    });
    const sample = await sampler.sampleOne('BNB');
    expect(sample).not.toBeNull();
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('swallows database error during sample persistence', async (): Promise<void> => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('DB is down'));
    await expect(sampler.sampleOne('SOL')).resolves.not.toThrow();
  });

  it('samples all symbols and controls timer lifecycle', async (): Promise<void> => {
    await sampler.sampleAll();
    expect(sampler.getHistory('SOL').length).toBeGreaterThan(0);

    sampler.start();
    // Second start should no-op
    sampler.start();
    sampler.stop();
  });
});
