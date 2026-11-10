import React from 'react';

export interface HealthData {
  status: string;
  environment: string;
  timestamp: string;
  uptime: number;
}

export interface HealthCardProps {
  health: HealthData | null;
  loading: boolean;
  error: string | null;
  apiUrl: string;
}

/**
 * HealthCard displays backend health check information including status,
 * environment, and uptime.
 *
 * @param props - Component configuration props
 * @returns React JSX element
 */
export const HealthCard: React.FC<HealthCardProps> = ({
  health,
  loading,
  error,
  apiUrl,
}) => {
  return (
    <section
      aria-label="Backend Health Status"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#111827' }}>
          Backend Health
        </h2>
        {health && (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: health.status === 'ok' ? '#dcfce7' : '#fee2e2',
              color: health.status === 'ok' ? '#15803d' : '#b91c1c',
              textTransform: 'uppercase',
            }}
          >
            {health.status}
          </span>
        )}
      </div>

      {loading && (
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          Connecting to backend at {apiUrl}...
        </p>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {health && !loading && (
        <div
          data-testid="health-info"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
          }}
        >
          <div style={{ backgroundColor: '#f9fafb', padding: '10px 14px', borderRadius: '6px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Status</span>
            <strong style={{ fontSize: '16px', color: '#111827' }}>{health.status}</strong>
          </div>
          <div style={{ backgroundColor: '#f9fafb', padding: '10px 14px', borderRadius: '6px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Environment</span>
            <strong style={{ fontSize: '16px', color: '#111827' }}>{health.environment}</strong>
          </div>
          <div style={{ backgroundColor: '#f9fafb', padding: '10px 14px', borderRadius: '6px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', display: 'block' }}>Uptime</span>
            <strong style={{ fontSize: '16px', color: '#111827' }}>
              {health.uptime.toFixed(1)}s
            </strong>
          </div>
        </div>
      )}
    </section>
  );
};

