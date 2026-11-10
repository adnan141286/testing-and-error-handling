import React, { useEffect, useState } from 'react';

export interface ProviderDiagnostic {
  name: string;
  status: string;
  configured: boolean;
  circuitBreakerState: string;
  failures: number;
}

export interface DiagnosticsData {
  timestamp: string;
  uptime: number;
  providers: {
    dexScreener: ProviderDiagnostic;
    goPlus: ProviderDiagnostic;
    birdeye: ProviderDiagnostic;
  };
  cache: {
    redisHealthy: boolean;
    hits: number;
    misses: number;
    hitRatio: number;
  };
  quarantine: {
    quarantinedCount: number;
    totalProcessed: number;
    totalValid: number;
    reasons: Record<string, number>;
  };
}

export interface DiagnosticsCardProps {
  apiUrl?: string;
  refreshIntervalMs?: number;
}

/**
 * DiagnosticsCard displays live provider health, circuit breaker state,
 * cache hit/miss statistics, and quarantine counters, refreshing every 5 seconds.
 *
 * @param props - Component configuration props
 * @returns React JSX element
 */
export const DiagnosticsCard: React.FC<DiagnosticsCardProps> = ({
  apiUrl = 'http://localhost:3000',
  refreshIntervalMs = 5000,
}) => {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDiagnostics = async (): Promise<void> => {
      try {
        const res = await fetch(`${apiUrl}/api/diagnostics`);
        if (!res.ok) {
          throw new Error(`Diagnostics HTTP error ${res.status}`);
        }
        const json = (await res.json()) as DiagnosticsData;
        if (isMounted) {
          setData(json);
          setLastRefreshed(new Date().toLocaleTimeString());
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error fetching diagnostics');
        }
      }
    };

    void fetchDiagnostics();
    const interval = setInterval(() => {
      void fetchDiagnostics();
    }, refreshIntervalMs);

    return (): void => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiUrl, refreshIntervalMs]);

  const getStatusBadge = (status: string, configured: boolean): React.JSX.Element => {
    if (!configured || status === 'not configured') {
      return (
        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e5e7eb', color: '#4b5563', fontWeight: 600 }}>
          Not Configured
        </span>
      );
    }
    const isOnline = status === 'online';
    return (
      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: isOnline ? '#dcfce7' : '#fee2e2', color: isOnline ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <section
      aria-label="System Diagnostics"
      data-testid="diagnostics-card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#111827' }}>
          Real-Time Diagnostics
        </h2>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {lastRefreshed ? `Refreshed: ${lastRefreshed} (5s auto)` : 'Polling 5s...'}
        </span>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 8px 0', letterSpacing: '0.05em' }}>
              Providers & Circuit Breakers
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              {Object.entries(data.providers).map(([key, provider]) => (
                <div key={key} style={{ backgroundColor: '#f9fafb', padding: '10px 12px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: '#111827' }}>{provider.name}</strong>
                    {getStatusBadge(provider.status, provider.configured)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Breaker: <span style={{ color: provider.circuitBreakerState === 'CLOSED' ? '#15803d' : '#b91c1c', fontWeight: 600 }}>{provider.circuitBreakerState}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div style={{ backgroundColor: '#f9fafb', padding: '10px 12px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Cache Hits / Misses</span>
              <strong style={{ fontSize: '15px', color: '#111827' }}>{data.cache.hits} / {data.cache.misses}</strong>
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '10px 12px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Cache Hit Ratio</span>
              <strong style={{ fontSize: '15px', color: '#111827' }}>{(data.cache.hitRatio * 100).toFixed(0)}%</strong>
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '10px 12px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Quarantined Records</span>
              <strong style={{ fontSize: '15px', color: '#111827' }}>{data.quarantine.quarantinedCount}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

