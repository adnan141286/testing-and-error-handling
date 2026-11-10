import React, { useState } from 'react';
import { Btn } from '../Btn';
import { cyberCard, cyberTitle, cyberInput, cyberSelect, greenBadge, redBadge } from '../cyberStyles';

export interface GoPlusSecuritySectionProps {
  apiUrl: string;
}

const CHAIN_OPTIONS = [
  { value: '1', label: 'Ethereum' },
  { value: '56', label: 'BSC' },
  { value: 'solana', label: 'Solana' },
];
const DEFAULT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';

interface SecurityResult {
  success: boolean;
  address: string;
  chain: string;
  isHoneypot: boolean;
  buyTax: number;
  sellTax: number;
  isOpenSource: boolean;
  riskLevel: 'CRITICAL' | 'LOW';
  threatFlags: string[];
  source: string;
  timestamp: string;
}

const riskPill = (l: 'CRITICAL' | 'LOW'): React.CSSProperties => ({
  background: l === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
  color: l === 'CRITICAL' ? '#f87171' : '#34d399',
  border: `1px solid ${l === 'CRITICAL' ? '#ef4444' : '#10b981'}`,
  borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 800,
});

const sourcePill: React.CSSProperties = {
  background: '#1c1236', color: '#a78bfa', border: '1px solid #3d286d',
  borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700,
};

const statRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  fontSize: 13, color: '#cbd5e1', marginBottom: 6,
};

const resultBox: React.CSSProperties = {
  marginTop: 4, background: '#0c0717', border: '1px solid #261747',
  borderRadius: 8, padding: 14,
};

const errorBox: React.CSSProperties = {
  background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444',
  borderRadius: 8, padding: '10px 14px', color: '#f87171',
  fontSize: 13, fontWeight: 700,
};

/**
 * Live GoPlus Security Check panel for Tab 2 — Data Sanitation.
 * Calls /api/token/security and displays honeypot flag, taxes,
 * risk level, open-source status and threat flags for any EVM/Solana token.
 *
 * @param props - Component properties
 * @returns React element
 */
export function GoPlusSecuritySection({ apiUrl }: GoPlusSecuritySectionProps): React.JSX.Element {
  const [chain, setChain] = useState<string>('1');
  const [address, setAddress] = useState<string>(DEFAULT_ADDRESS);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SecurityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async (): Promise<void> => {
    if (!address.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch(
        `${apiUrl}/api/token/security?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address.trim())}`,
      );
      const data = (await res.json()) as SecurityResult & { error?: { message?: string } };
      if (!res.ok || !data.success) setError(data.error?.message ?? 'GoPlus check failed');
      else setResult(data);
    } catch {
      setError('Network error — backend unreachable');
    }
    setLoading(false);
  };

  return (
    <section style={cyberCard}>
      <div style={cyberTitle}>LIVE GOPLUS SECURITY CHECK</div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>CHAIN</label>
          <select value={chain} onChange={(e): void => setChain(e.target.value)}
            style={{ ...cyberSelect, minWidth: 130 }} aria-label="Select chain">
            {CHAIN_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 260 }}>
          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>TOKEN ADDRESS</label>
          <input type="text" value={address} onChange={(e): void => setAddress(e.target.value)}
            style={{ ...cyberInput, width: '100%', boxSizing: 'border-box' }}
            placeholder="0x... or Solana mint" aria-label="Token address" />
        </div>
        <Btn onClick={runCheck} loading={loading} label="Run GoPlus Security Check" />
      </div>

      {error && <div style={errorBox}>✕ {error}</div>}

      {result && (
        <div style={resultBox}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={result.isHoneypot ? redBadge : greenBadge}>
              {result.isHoneypot ? '🚨 HONEYPOT' : '✓ SAFE'}
            </span>
            <span style={riskPill(result.riskLevel)}>{result.riskLevel}</span>
            <span style={sourcePill}>{result.source}</span>
          </div>
          <div style={statRow}>
            <span style={{ color: '#94a3b8', minWidth: 110 }}>Buy Tax:</span>
            <span style={{ color: result.buyTax > 10 ? '#f87171' : '#34d399', fontWeight: 700 }}>
              {result.buyTax.toFixed(2)}%
            </span>
          </div>
          <div style={statRow}>
            <span style={{ color: '#94a3b8', minWidth: 110 }}>Sell Tax:</span>
            <span style={{ color: result.sellTax > 10 ? '#f87171' : '#34d399', fontWeight: 700 }}>
              {result.sellTax.toFixed(2)}%
            </span>
          </div>
          <div style={statRow}>
            <span style={{ color: '#94a3b8', minWidth: 110 }}>Open Source:</span>
            <span style={{ color: result.isOpenSource ? '#34d399' : '#f87171', fontWeight: 700 }}>
              {result.isOpenSource ? 'YES' : 'NO'}
            </span>
          </div>
          <div style={statRow}>
            <span style={{ color: '#94a3b8', minWidth: 110 }}>Chain:</span>
            <span style={{ fontWeight: 600 }}>{result.chain}</span>
          </div>
          {result.threatFlags.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>THREAT FLAGS</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {result.threatFlags.map((flag) => <span key={flag} style={redBadge}>{flag}</span>)}
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, color: '#475569', marginTop: 10 }}>
            Audited: {new Date(result.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </section>
  );
}
