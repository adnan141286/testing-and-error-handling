import React from 'react';
import { HonestLegend } from './HonestBadge';

export interface CyberHeaderProps {
  onToggleTerminal?: () => void;
  eventCount?: number;
  uptimeSeconds?: number;
  nodeStatus?: string;
}

/**
 * Main application Cyber-Violet terminal header.
 *
 * @param props - Header props
 * @returns React element
 */
export function CyberHeader({
  onToggleTerminal,
  eventCount = 0,
  uptimeSeconds = 0,
  nodeStatus = 'ok',
}: CyberHeaderProps): React.JSX.Element {
  const isHealthy = nodeStatus === 'ok';

  return (
    <header
      style={{
        background: '#120b22',
        borderBottom: '1px solid #261647',
        padding: '16px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      {/* Brand & Module Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 800,
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.45)',
            border: '1px solid #c084fc',
            flexShrink: 0,
          }}
        >
          $
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Testing and Error Handling Module
            </h1>
            <span
              style={{
                background: '#241348',
                color: '#d8b4fe',
                border: '1px solid #7e22ce',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              CYBER-VIOLET TERMINAL
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
            Intelligent Blockchain Trading and Wallet Analytics Platform
          </p>
        </div>
      </div>

      {/* Right Quick Badges & Terminal Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <HonestLegend />
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: isHealthy ? '#34d399' : '#f87171',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isHealthy ? '#10b981' : '#ef4444',
              boxShadow: isHealthy ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            }}
          />
          Node {isHealthy ? 'Active' : 'Degraded'} · up {Math.floor(uptimeSeconds)}s
        </div>

        <button
          type="button"
          onClick={onToggleTerminal}
          style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid #7c3aed',
            color: '#ddd6fe',
            borderRadius: 999,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
          aria-label="Toggle Live Event Terminal"
        >
          ⚡ Live Radar Stream
          {eventCount > 0 && (
            <span
              style={{
                background: '#a855f7',
                color: '#ffffff',
                borderRadius: 999,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {eventCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

