import React from 'react';

export interface PriceResult {
  symbol: string;
  price: number;
  liquidity: number;
  source: string;
  cached: boolean;
  cacheTier?: 'L1' | 'L2' | null;
  latencyMs: number;
  apiLatencyMs?: number;
  cacheReadLatencyMs?: number;
}

export interface ScenarioAttempt {
  attempt?: number;
  callNumber?: number;
  status: number;
  backoffDelayMs?: number;
  retryAfterSeconds?: number;
  circuitBreakerState?: string;
  circuitStateAfter?: string;
  circuitStateBefore?: string;
  servedStale?: boolean;
  message?: string;
}

export const cyberCard: React.CSSProperties = {
  background: '#130c24',
  border: '1px solid #281a49',
  borderRadius: 12,
  padding: 20,
};

export const cyberTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: '#c4b5fd',
  letterSpacing: '0.06em',
  marginBottom: 12,
};

export const cyberInput: React.CSSProperties = {
  background: '#0a0614',
  color: '#ffffff',
  border: '1px solid #301f57',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  minHeight: 44,
};

export const cyberSelect: React.CSSProperties = {
  background: '#1c1236',
  color: '#ffffff',
  border: '1px solid #3d286d',
  borderRadius: 8,
  padding: '8px 14px',
  minHeight: 44,
  fontSize: 13,
};

export const cyberSampleBtn: React.CSSProperties = {
  background: '#1c1236',
  color: '#c4b5fd',
  border: '1px solid #36225e',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};

export const resBox: React.CSSProperties = {
  marginTop: 12,
  background: '#0c0717',
  border: '1px solid #261747',
  borderRadius: 8,
  padding: 12,
};

export const statBox: React.CSSProperties = {
  background: '#1c1236',
  border: '1px solid #321e5c',
  borderRadius: 8,
  padding: '8px 14px',
  display: 'flex',
  flexDirection: 'column',
};

export const pillSuccess: React.CSSProperties = {
  background: 'rgba(16, 185, 129, 0.15)',
  color: '#34d399',
  border: '1px solid #10b981',
  borderRadius: 999,
  padding: '1px 8px',
  fontSize: 10,
  fontWeight: 800,
};

export const pillWarn: React.CSSProperties = {
  background: 'rgba(245, 158, 11, 0.15)',
  color: '#fbbf24',
  border: '1px solid #f59e0b',
  borderRadius: 999,
  padding: '1px 8px',
  fontSize: 10,
  fontWeight: 800,
};

export const textareaStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'monospace',
  fontSize: 12,
  background: '#0a0614',
  color: '#e2e8f0',
  border: '1px solid #301f57',
  borderRadius: 8,
  padding: 8,
  boxSizing: 'border-box',
};

export const greenBadge: React.CSSProperties = {
  background: 'rgba(16, 185, 129, 0.15)',
  color: '#34d399',
  border: '1px solid #10b981',
  borderRadius: 999,
  padding: '1px 8px',
  fontSize: 11,
  fontWeight: 800,
};

export const redBadge: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.15)',
  color: '#f87171',
  border: '1px solid #ef4444',
  borderRadius: 999,
  padding: '1px 8px',
  fontSize: 11,
  fontWeight: 800,
};

export const quarantineRow: React.CSSProperties = {
  background: '#0c0717',
  borderLeft: '3px solid #ef4444',
  padding: '5px 10px',
  fontSize: 12,
  fontFamily: 'monospace',
  color: '#cbd5e1',
  marginBottom: 3,
  borderRadius: '0 4px 4px 0',
};

export const alertBox: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.15)',
  border: '2px solid #ef4444',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#f87171',
  fontWeight: 800,
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

export const eventRow: React.CSSProperties = {
  background: '#0c0717',
  borderLeft: '3px solid #f59e0b',
  padding: '5px 10px',
  fontSize: 12,
  fontFamily: 'monospace',
  color: '#cbd5e1',
  marginBottom: 3,
  borderRadius: '0 4px 4px 0',
};
