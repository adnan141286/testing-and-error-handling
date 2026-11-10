import React, { useEffect, useState } from 'react';

/** Chip for a single provider's status. */
interface ProviderChipProps {
  name: string;
  configured: boolean;
  rateLimit?: string;
}

/** Provider information returned from /api/diagnostics. */
interface ProviderStatus {
  configured: boolean;
  rateLimit?: string;
  circuitState?: string;
}

/** Diagnostics payload from the backend. */
interface DiagnosticsData {
  cache?: { backend?: string };
  providers?: Record<string, ProviderStatus>;
  health?: { status?: string; environment?: string; uptime?: number };
}

/**
 * Renders a single provider chip showing configured/not-configured.
 *
 * @param props - Chip properties
 * @returns React element
 */
function ProviderChip({ name, configured, rateLimit }: ProviderChipProps): React.JSX.Element {
  const bg = configured ? '#d1fae5' : '#f3f4f6';
  const color = configured ? '#065f46' : '#6b7280';
  const label = configured ? `${rateLimit ?? ''} ✓`.trim() : 'not configured';
  return (
    <span
      aria-label={`${name}: ${configured ? 'configured' : 'not configured'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
        border: `1px solid ${configured ? '#6ee7b7' : '#e5e7eb'}`,
      }}
    >
      {name}: {label}
    </span>
  );
}

export interface StatusBarProps {
  apiUrl: string;
}

/**
 * Top status bar auto-refreshing every 5 seconds.
 * Shows backend health, Redis state, and provider chips.
 *
 * @param props - Component properties
 * @returns React element
 */
export function StatusBar({ apiUrl }: StatusBarProps): React.JSX.Element {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let mounted = true;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`${apiUrl}/api/diagnostics`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DiagnosticsData;
        if (mounted) { setData(json); setError(null); }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Error');
      }
    };
    void load();
    const id = setInterval((): void => { void load(); }, 5000);
    return (): void => { mounted = false; clearInterval(id); };
  }, [apiUrl]);

  const health = data?.health;
  const providers = data?.providers ?? {};
  const cacheBackend = data?.cache?.backend ?? '—';
  const statusColor = health?.status === 'ok' ? '#059669' : '#dc2626';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="System status bar"
      style={{
        background: '#1e293b',
        color: '#f1f5f9',
        padding: '10px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        fontSize: 13,
        minHeight: 44,
      }}
    >
      {error ? (
        <span style={{ color: '#fca5a5' }}>⚠ Backend unreachable: {error}</span>
      ) : (
        <>
          <span>
            Backend:{' '}
            <strong style={{ color: statusColor }}>
              {health?.status ?? '…'}
            </strong>
            {health?.environment ? ` · ${health.environment}` : ''}
            {health?.uptime != null
              ? ` · up ${Math.floor(health.uptime)}s`
              : ''}
          </span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span>
            Redis:{' '}
            <strong style={{ color: cacheBackend === 'redis' ? '#34d399' : '#fbbf24' }}>
              {cacheBackend === 'redis' ? 'connected' : 'memory fallback'}
            </strong>
          </span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['dexScreener', 'birdeye', 'goplus'] as const).map((p) => (
              <ProviderChip
                key={p}
                name={p === 'dexScreener' ? 'DEX Screener' : p === 'goplus' ? 'GoPlus' : 'Birdeye'}
                configured={(providers[p] as ProviderStatus | undefined)?.configured ?? false}
                rateLimit={(providers[p] as ProviderStatus | undefined)?.rateLimit}
              />
            ))}
          </span>
        </>
      )}
    </div>
  );
}

