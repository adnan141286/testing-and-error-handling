import React, { useState } from 'react';
import { Btn } from '../Btn';
import { HonestBadge } from '../HonestBadge';
import { cyberCard, cyberTitle, statBox } from '../cyberStyles';

export interface LiveTokenCheckerProps {
  apiUrl: string;
}

interface HistorySample {
  price: number;
  timestamp: number;
}

interface CheckLiveResponse {
  symbol: string;
  price: number;
  liquidity: number;
  priceImpactPercent: number;
  killSwitchActive: boolean;
  outlier: { isOutlier: boolean };
}

/**
 * Live Token Volatility & SVG Series Chart Component.
 */
export function LiveTokenChecker({ apiUrl }: LiveTokenCheckerProps): React.JSX.Element {
  const [symbol, setSymbol] = useState('SOL');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckLiveResponse | null>(null);
  const [history, setHistory] = useState<HistorySample[]>([]);

  const checkLive = async (): Promise<void> => {
    setLoading(true);
    try {
      const [liveRes, histRes] = await Promise.all([
        fetch(`${apiUrl}/api/volatility/check-live?symbol=${symbol}`, { method: 'POST' }),
        fetch(`${apiUrl}/api/token/history?symbol=${symbol}`),
      ]);
      const liveData = (await liveRes.json()) as CheckLiveResponse;
      const histData = (await histRes.json()) as { samples?: HistorySample[] };
      setResult(liveData);
      setHistory(histData.samples ?? []);
    } catch {
      // Handled
    }
    setLoading(false);
  };

  const prices = history.map((h) => h.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 1;
  const range = maxPrice - minPrice || 1;
  const points = prices
    .map((p, i) => `${(i / Math.max(prices.length - 1, 1)) * 300},${60 - ((p - minPrice) / range) * 50}`)
    .join(' ');

  return (
    <section style={cyberCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={cyberTitle}>LIVE TOKEN VOLATILITY AUDIT & SAMPLER</div>
        <HonestBadge type="LIVE" source="DEX Screener + CoinGecko" />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{
            background: '#0a0515',
            border: '1px solid #36225e',
            borderRadius: 6,
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: 12,
            minHeight: 44,
          }}
        >
          <option value="SOL">SOL (Solana)</option>
          <option value="ETH">ETH (Ethereum)</option>
          <option value="BTC">BTC (Bitcoin)</option>
          <option value="BNB">BNB (Binance)</option>
        </select>
        <Btn onClick={checkLive} loading={loading} label="Check Live Token" />
      </div>

      {result && (
        <div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={statBox}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Live Price</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>${result.price}</span>
            </div>
            <div style={statBox}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Pool Liquidity</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#c084fc' }}>
                ${Math.round(result.liquidity).toLocaleString()}
              </span>
            </div>
            <div style={statBox}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Price Impact</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
                {result.priceImpactPercent}%
              </span>
            </div>
            <div style={statBox}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Anomaly</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: result.outlier.isOutlier ? '#f87171' : '#34d399' }}>
                {result.outlier.isOutlier ? 'OUTLIER DETECTED' : 'NORMAL'}
              </span>
            </div>
          </div>

          {prices.length > 1 && (
            <div style={{ background: '#090514', border: '1px solid #281a49', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                240-Sample Rolling History ({prices.length} points)
              </div>
              <svg viewBox="0 0 300 70" style={{ width: '100%', height: 70, overflow: 'visible' }}>
                <polyline fill="none" stroke="#8b5cf6" strokeWidth="2" points={points} />
                {result.outlier.isOutlier && (
                  <circle cx="300" cy={60 - ((result.price - minPrice) / range) * 50} r="4" fill="#ef4444" />
                )}
              </svg>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

