import React, { useState } from 'react';
import { Btn } from '../Btn';
import {
  cyberCard,
  cyberTitle,
  cyberSelect,
  PriceResult,
  resBox,
  pillSuccess,
  pillWarn,
  statBox,
} from '../cyberStyles';
import { ChaosLabSection } from './ChaosLabSection';

export interface Tab1Props {
  apiUrl: string;
}

interface BurstRow {
  label: string;
  count: number;
}

/**
 * Tab 1 — API Rate Limiting (Cyber-Violet Terminal Design).
 *
 * @param props - Component properties
 * @returns React element
 */
export function Tab1RateLimiting({ apiUrl }: Tab1Props): React.JSX.Element {
  const [symbol, setSymbol] = useState<string>('SOL');
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [burstRows, setBurstRows] = useState<BurstRow[] | null>(null);
  const [burstLoading, setBurstLoading] = useState(false);

  const fetchPrice = async (): Promise<void> => {
    setPriceLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/token/price?symbol=${symbol}`);
      setPriceResult((await res.json()) as PriceResult);
    } catch {
      // Ignored
    }
    setPriceLoading(false);
  };

  const runBurst = async (): Promise<void> => {
    setBurstLoading(true);
    setBurstRows(null);
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => fetch(`${apiUrl}/api/token/price?symbol=${symbol}`)),
    );
    let fresh = 0;
    let cached = 0;
    let throttled = 0;
    let rejected = 0;
    for (const r of results) {
      if (r.status === 'rejected') {
        rejected++;
        continue;
      }
      const json = (await r.value.json()) as { cached?: boolean };
      if (!r.value.ok) throttled++;
      else if (json.cached) cached++;
      else fresh++;
    }
    setBurstRows([
      { label: 'Fresh L1', count: fresh },
      { label: 'Cached L2', count: cached },
      { label: 'Throttled', count: throttled },
      { label: 'Rejected', count: rejected },
    ]);
    setBurstLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section style={cyberCard}>
        <div style={cyberTitle}>LIVE MARKET PRICE & TOKEN BUCKET INGESTION ({symbol})</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="sym-select" style={{ fontSize: 13, color: '#94a3b8' }}>
            Token Asset:
          </label>
          <select
            id="sym-select"
            value={symbol}
            onChange={(e): void => {
              setSymbol(e.target.value);
              setPriceResult(null);
            }}
            aria-label="Select asset"
            style={cyberSelect}
          >
            {['SOL', 'ETH', 'BTC', 'BNB'].map((s) => (
              <option key={s} value={s} style={{ background: '#1c1236' }}>
                {s}
              </option>
            ))}
          </select>
          <Btn onClick={fetchPrice} loading={priceLoading} label="Fetch Live Price" />
        </div>

        {priceResult && (
          <div style={resBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{priceResult.symbol}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#34d399' }}>
                ${priceResult.price?.toFixed(4)}
              </span>
              <span style={priceResult.cached ? pillWarn : pillSuccess}>
                {priceResult.cached
                  ? priceResult.cacheTier === 'L2'
                    ? 'CACHED L2 (REDIS)'
                    : 'CACHED L1 (MEMORY)'
                  : 'FRESH LIVE'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Provider: <strong style={{ color: '#c084fc' }}>{priceResult.source}</strong> ·
              API Latency:{' '}
              <strong style={{ color: '#38bdf8' }}>
                {priceResult.cached ? 'N/A (Served from cache)' : `${priceResult.apiLatencyMs ?? priceResult.latencyMs}ms`}
              </strong>{' '}
              · Cache Read:{' '}
              <strong style={{ color: '#a855f7' }}>
                {priceResult.cacheReadLatencyMs ?? 0}ms
              </strong>{' '}
              · Liquidity: ${priceResult.liquidity?.toLocaleString()}
            </div>
          </div>
        )}
      </section>

      <section style={cyberCard}>
        <div style={cyberTitle}>BURST RATE LIMIT BENCHMARK (20 RAPID CALLS)</div>
        <Btn onClick={runBurst} loading={burstLoading} label="Execute 20-Request Burst" />
        {burstRows && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {burstRows.map((r) => (
              <div key={r.label} style={statBox}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <ChaosLabSection apiUrl={apiUrl} />
    </div>
  );
}
