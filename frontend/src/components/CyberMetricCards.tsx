import React from 'react';
import { HonestBadge } from './HonestBadge';

export interface DiagnosticsProps {
  status?: string;
  uptime?: number;
  environment?: string;
  healthScore?: number;
  passedChecks?: number;
  totalChecks?: number;
  healthChecks?: {
    backend?: string;
    redis?: string;
    postgres?: string;
    providers?: string;
  };
  cacheBackend?: string;
  cacheHits?: number;
  cacheMisses?: number;
  quarantinedCount?: number;
  circuitTrippedCount?: number;
  dexLatencyMs?: number;
  goPlusLatencyMs?: number;
}

interface StatCardProps {
  title: string;
  pillText: string;
  pillColor: string;
  topGradient: string;
  value: string;
  subtext: string;
}

function StatCard({
  title,
  pillText,
  pillColor,
  topGradient,
  value,
  subtext,
}: StatCardProps): React.JSX.Element {
  return (
    <div
      style={{
        flex: '1 1 240px',
        background: '#130c24',
        border: '1px solid #281a49',
        borderRadius: 12,
        padding: '16px 20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Top accent glow line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: topGradient,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#94a3b8',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 999,
            background: `${pillColor}22`,
            color: pillColor,
            border: `1px solid ${pillColor}66`,
            letterSpacing: '0.04em',
          }}
        >
          {pillText}
        </span>
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>{subtext}</div>
    </div>
  );
}

/**
 * 4 Top Metric Summary Cards matching the Cyber-Violet terminal dashboard.
 *
 * @param props - Diagnostics metrics
 * @returns React element
 */
export function CyberMetricCards(props: DiagnosticsProps): React.JSX.Element {
  const isHealthy = props.status === 'ok';
  const isRedis =
    props.cacheBackend?.toLowerCase().includes('redis') || props.cacheBackend === 'Redis';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        padding: '20px 24px',
        background: '#0c0717',
      }}
    >
      <StatCard
        title="SYSTEM HEALTH & UPTIME"
        pillText={isHealthy ? 'ACTIVE NODE ▲' : 'DEGRADED ▼'}
        pillColor={isHealthy ? '#10b981' : '#f43f5e'}
        topGradient="linear-gradient(90deg, #10b981, #06b6d4)"
        value={
          props.healthScore !== undefined
            ? `HEALTHY ${props.healthScore}% (${props.passedChecks ?? 4}/${props.totalChecks ?? 4} CHECKS)`
            : isHealthy
              ? 'HEALTHY 100%'
              : 'OFFLINE'
        }
        subtext={`Checks: Backend (${props.healthChecks?.backend ?? 'OK'}), Redis (${props.healthChecks?.redis ?? (isRedis ? 'OK' : 'Fallback')}), DB (${props.healthChecks?.postgres ?? 'OK'}), Providers (${props.healthChecks?.providers ?? 'OK'}) · up ${Math.floor(props.uptime ?? 0)}s`}
      />

      <StatCard
        title="RESILIENCE & RATE LIMITS"
        pillText="LIVE PROVIDERS"
        pillColor="#f59e0b"
        topGradient="linear-gradient(90deg, #f59e0b, #ef4444)"
        value="REAL LIMITS"
        subtext="DEX: 30 RPS · GoPlus: 30 RPS · CoinGecko: 10 RPM · Birdeye: 1 RPS"
      />

      <StatCard
        title="MULTI-TIER CACHE & HIT RATIO"
        pillText={isRedis ? 'REDIS TIER 2' : 'MEMORY TIER 1'}
        pillColor={isRedis ? '#10b981' : '#a855f7'}
        topGradient="linear-gradient(90deg, #a855f7, #ec4899)"
        value={`${props.cacheHits ?? 0} HITS / ${props.cacheMisses ?? 0} MISS`}
        subtext={`Active: ${props.cacheBackend ?? (isRedis ? 'Redis' : 'Memory Fallback')} · Quarantined: ${props.quarantinedCount ?? 0}`}
      />

      <StatCard
        title="FAIL-SAFE CIRCUITS"
        pillText="CIRCUIT CLOSED ★"
        pillColor="#3b82f6"
        topGradient="linear-gradient(90deg, #3b82f6, #06b6d4)"
        value={`${props.circuitTrippedCount ?? 0} TRIPPED`}
        subtext={`Auto 503/429 circuit trips · GoPlus: ${props.goPlusLatencyMs ?? 0}ms`}
      />
    </div>
  );
}

