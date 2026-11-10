import React from 'react';

export type HonestBadgeType = 'LIVE' | 'INTERNAL' | 'SIMULATED';

export interface HonestBadgeProps {
  type: HonestBadgeType;
  source?: string;
  timestamp?: string | number;
}

const BADGE_STYLES: Record<HonestBadgeType, { bg: string; text: string; border: string }> = {
  LIVE: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: '#10b981',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  INTERNAL: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: '#60a5fa',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  SIMULATED: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.35)',
  },
};

/**
 * Honest data origin badge component with source and optional timestamp display.
 *
 * @param props - Component props
 * @returns React element
 */
export function HonestBadge({ type, source, timestamp }: HonestBadgeProps): React.JSX.Element {
  const style = BADGE_STYLES[type];
  const timeStr = timestamp
    ? typeof timestamp === 'number'
      ? new Date(timestamp).toLocaleTimeString()
      : timestamp.includes('T')
        ? new Date(timestamp).toLocaleTimeString()
        : timestamp
    : null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 4,
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      <span>{type}</span>
      {source && <span style={{ opacity: 0.85, fontWeight: 600 }}>• {source}</span>}
      {timeStr && <span style={{ opacity: 0.65, fontWeight: 500 }}>[{timeStr}]</span>}
    </span>
  );
}

/**
 * Global Legend Bar explaining Honest Badges in the header.
 */
export function HonestLegend(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '4px 10px',
        background: '#150d28',
        border: '1px solid #281a49',
        borderRadius: 6,
        fontSize: 11,
      }}
    >
      <span style={{ color: '#94a3b8', fontWeight: 600 }}>Data Provenance:</span>
      <HonestBadge type="LIVE" source="External API" />
      <HonestBadge type="INTERNAL" source="Backend State" />
      <HonestBadge type="SIMULATED" source="Chaos/Preset" />
    </div>
  );
}

