import React, { useEffect, useState, useCallback } from 'react';

export interface MarketTickerProps {
  apiUrl: string;
}

type TickerStatus = 'live' | 'stale' | 'offline' | 'deviation';

interface TickerItem {
  symbol: string;
  price: string;
  change: string;
  isUp: boolean;
  status: TickerStatus;
  source: string;
  lastUpdated?: string;
}

const INITIAL_TICKERS: TickerItem[] = [
  { symbol: 'BTC/USD', price: 'N/A', change: 'Offline', isUp: true, status: 'offline', source: 'None' },
  { symbol: 'ETH/USD', price: 'N/A', change: 'Offline', isUp: true, status: 'offline', source: 'None' },
  { symbol: 'SOL/USD', price: 'N/A', change: 'Offline', isUp: true, status: 'offline', source: 'None' },
  { symbol: 'BNB/USD', price: 'N/A', change: 'Offline', isUp: true, status: 'offline', source: 'None' },
  { symbol: 'Gas', price: 'N/A', change: 'Offline', isUp: true, status: 'offline', source: 'None' },
];

const dotColor = (status: TickerStatus): string => {
  if (status === 'live') return '#10b981';
  if (status === 'stale' || status === 'deviation') return '#f59e0b';
  return '#475569';
};

const dotStyle = (status: TickerStatus): React.CSSProperties => {
  const color = dotColor(status);
  return { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: color, boxShadow: status !== 'offline' ? `0 0 6px ${color}` : 'none' };
};

const formatPrice = (val: number): string =>
  `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTime = (ts?: string): string => {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  return sec < 60 ? `${sec}s ago` : `${Math.floor(sec / 60)}m ago`;
};

const CONTAINER_STYLE: React.CSSProperties = {
  background: '#090514', borderBottom: '1px solid #1f1438', padding: '6px 20px',
  display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontFamily: 'monospace',
  overflowX: 'auto', whiteSpace: 'nowrap',
};

const BADGE_STYLE: React.CSSProperties = {
  background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.4)',
  borderRadius: 999, padding: '2px 10px', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em',
  display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
};

/**
 * Top Cyber-Violet Live Market Ticker bar.
 * Fetches BTC, ETH, SOL, BNB and Gas from real providers every 15s.
 */
export function CyberMarketTicker({ apiUrl }: MarketTickerProps): React.JSX.Element {
  const [tickers, setTickers] = useState<TickerItem[]>(INITIAL_TICKERS);

  const updateTickers = useCallback(async (): Promise<void> => {
    const fetchToken = async (symKey: string): Promise<Partial<TickerItem>> => {
      try {
        const res = await fetch(`${apiUrl}/api/token/price?symbol=${symKey}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          price?: number;
          source?: string;
          stale?: boolean;
          deviated?: boolean;
          timestamp?: string;
        };
        if (typeof data.price === 'number') {
          const isStale = Boolean(data.stale);
          const isDev = Boolean(data.deviated);
          const status: TickerStatus = isDev ? 'deviation' : isStale ? 'stale' : 'live';
          const change = isDev ? 'Deviation' : isStale ? 'Stale' : 'Live ▲';
          return {
            price: formatPrice(data.price),
            change,
            status,
            source: data.source ?? 'DEX Screener',
            lastUpdated: formatTime(data.timestamp),
          };
        }
      } catch {
        /* Fallback to stale if available */
      }
      return { status: 'stale', change: 'Stale' };
    };

    const fetchGas = async (): Promise<Partial<TickerItem>> => {
      try {
        const res = await fetch(`${apiUrl}/api/gas`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { formatted?: string; gwei?: number; source?: string; stale?: boolean; timestamp?: string };
        const isStale = Boolean(data.stale);
        const text = data.formatted ?? (typeof data.gwei === 'number' ? `${data.gwei.toFixed(2)} Gwei` : 'N/A');
        return {
          price: text,
          change: isStale ? 'Stale' : 'Optimal',
          status: isStale ? 'stale' : 'live',
          source: data.source ?? 'Ethereum RPC',
          lastUpdated: formatTime(data.timestamp),
        };
      } catch {
        return { status: 'stale', change: 'Stale' };
      }
    };

    const [btc, eth, sol, bnb, gas] = await Promise.all([
      fetchToken('BTC'),
      fetchToken('ETH'),
      fetchToken('SOL'),
      fetchToken('BNB'),
      fetchGas(),
    ]);

    setTickers((prev) => [
      { ...prev[0]!, ...btc, price: btc.price ?? prev[0]!.price },
      { ...prev[1]!, ...eth, price: eth.price ?? prev[1]!.price },
      { ...prev[2]!, ...sol, price: sol.price ?? prev[2]!.price },
      { ...prev[3]!, ...bnb, price: bnb.price ?? prev[3]!.price },
      { ...prev[4]!, ...gas, price: gas.price ?? prev[4]!.price },
    ]);
  }, [apiUrl]);

  useEffect((): (() => void) => {
    void updateTickers();
    const interval = setInterval(() => void updateTickers(), 15000);
    return (): void => clearInterval(interval);
  }, [updateTickers]);

  return (
    <div role="region" aria-label="Live Market Ticker" style={CONTAINER_STYLE}>
      <span style={BADGE_STYLE}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
        LIVE MARKET
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {tickers.map((t) => (
          <span
            key={t.symbol}
            title={`Source: ${t.source} • Status: ${t.status.toUpperCase()}${t.lastUpdated ? ` • Updated ${t.lastUpdated}` : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'default' }}
            aria-label={`${t.symbol} ${t.price} from ${t.source}`}
          >
            <span style={dotStyle(t.status)} title={`${t.status.toUpperCase()} (${t.source})`} />
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>{t.symbol}</span>
            <span style={{ color: t.status !== 'offline' ? '#ffffff' : '#64748b', fontWeight: 700 }}>
              {t.price}
            </span>
            <span
              style={{
                color: t.status === 'live' ? '#10b981' : t.status === 'offline' ? '#475569' : '#f59e0b',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {t.change}
            </span>
            {t.lastUpdated && (
              <span style={{ color: '#64748b', fontSize: 10 }}>({t.lastUpdated})</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
