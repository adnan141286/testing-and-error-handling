import React, { useState } from 'react';
import { Btn } from '../Btn';
import { cyberCard, cyberTitle, cyberInput, cyberSampleBtn, alertBox, statBox } from '../cyberStyles';
import { VOLATILITY_SCENARIOS } from './volatilityScenarios';
import { DegradedEventsFeed } from './DegradedEventsFeed';
import { LiveTokenChecker } from './LiveTokenChecker';
import { HonestBadge } from '../HonestBadge';

export interface Tab3Props {
  apiUrl: string;
}

interface VolatilityResult {
  priceImpactPercent: number;
  killSwitchActive: boolean;
  outlier: { isOutlier: boolean };
}

/**
 * Tab 3 — Volatility Handling (Cyber-Violet Terminal Design).
 *
 * @param props - Component properties
 * @returns React element
 */
export function Tab3Volatility({ apiUrl }: Tab3Props): React.JSX.Element {
  const [liquidity, setLiquidity] = useState('1000000');
  const [tradeSize, setTradeSize] = useState('5000');
  const [prices, setPrices] = useState('100,101,99,102,100');
  const [result, setResult] = useState<VolatilityResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async (): Promise<void> => {
    setLoading(true);
    try {
      const priceSeries = prices
        .split(',')
        .map((p) => parseFloat(p.trim()))
        .filter((n) => !isNaN(n));
      const res = await fetch(`${apiUrl}/api/volatility/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liquidityUsd: parseFloat(liquidity) || 0,
          tradeSizeUsd: parseFloat(tradeSize) || 0,
          priceSeries,
        }),
      });
      setResult((await res.json()) as VolatilityResult);
    } catch {
      // Ignored
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {result?.killSwitchActive && (
        <div style={alertBox} role="alert">
          <span>⚡</span>
          <span>EMERGENCY KILL SWITCH ENGAGED: Volatility limit breached. Execution halted.</span>
        </div>
      )}

      <LiveTokenChecker apiUrl={apiUrl} />

      <section style={cyberCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={cyberTitle}>VOLATILITY TEST SCENARIOS & SAFE-MATH ENGINE</div>
          <HonestBadge type="SIMULATED" source="Preset Scenarios" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {Object.entries(VOLATILITY_SCENARIOS).map(([name, s]) => (
            <button
              key={name}
              type="button"
              onClick={(): void => {
                setLiquidity(s.liquidity);
                setTradeSize(s.tradeSize);
                setPrices(s.prices);
              }}
              style={cyberSampleBtn}
            >
              {name} (SIMULATED)
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label
              htmlFor="liq-in"
              style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}
            >
              Pool Liquidity (USD)
            </label>
            <input
              id="liq-in"
              value={liquidity}
              onChange={(e): void => setLiquidity(e.target.value)}
              style={cyberInput}
            />
          </div>
          <div>
            <label
              htmlFor="ts-in"
              style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}
            >
              Trade Size (USD)
            </label>
            <input
              id="ts-in"
              value={tradeSize}
              onChange={(e): void => setTradeSize(e.target.value)}
              style={cyberInput}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label
              htmlFor="pr-in"
              style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}
            >
              Historical Price Series (CSV)
            </label>
            <input
              id="pr-in"
              value={prices}
              onChange={(e): void => setPrices(e.target.value)}
              style={cyberInput}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Btn onClick={runCheck} loading={loading} label="Evaluate Volatility Engine" />
        </div>
      </section>

      {result && (
        <section style={cyberCard}>
          <div style={cyberTitle}>CALCULATED METRICS & OUTLIER REPORT</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={statBox}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Price Impact</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
                {result.priceImpactPercent}%
              </span>
            </div>
            <div style={statBox}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Outlier</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: result.outlier.isOutlier ? '#f87171' : '#34d399',
                }}
              >
                {result.outlier.isOutlier ? 'DETECTED' : 'NORMAL'}
              </span>
            </div>
            <div style={statBox}>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Kill Switch</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: result.killSwitchActive ? '#f87171' : '#34d399',
                }}
              >
                {result.killSwitchActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>
        </section>
      )}

      <DegradedEventsFeed apiUrl={apiUrl} />
    </div>
  );
}
