import React, { useEffect, useState, useRef } from 'react';

export interface EventLogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
  details?: unknown;
}

export interface EventTerminalProps {
  apiUrl: string;
}

const LVL: Record<string, { bg: string; text: string; border: string }> = {
  info: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: '#3b82f6' },
  warn: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#f59e0b' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#ef4444' },
};

/**
 * Cyber-Violet Live Event Terminal.
 * Clean, spacious, non-congested event monitor with category filtering.
 *
 * @param props - Component properties
 * @returns React element
 */
export function EventTerminal({ apiUrl }: EventTerminalProps): React.JSX.Element {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [minimized, setMinimized] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) => {
    let mounted = true;
    const fetchEvents = async (): Promise<void> => {
      try {
        const res = await fetch(`${apiUrl}/api/events?limit=100`);
        if (!res.ok) return;
        const json = (await res.json()) as { events: EventLogEntry[] };
        if (mounted) setEvents(json.events ?? []);
      } catch { /* Ignored */ }
    };
    void fetchEvents();
    const interval = setInterval((): void => { void fetchEvents(); }, 3000);
    return (): void => { mounted = false; clearInterval(interval); };
  }, [apiUrl]);

  const filtered = events.filter((e) =>
    filter === 'ALL' ? true : e.type.toUpperCase().includes(filter),
  );

  return (
    <section
      aria-label="Cyber Event Terminal"
      style={{
        background: '#0d081b',
        borderTop: '2px solid #382463',
        marginTop: 24,
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
      }}
    >
      <div style={ctrlBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={beacon} />
          <h2 style={headText}>LIVE EVENT RADAR TERMINAL</h2>
          <span style={countPill}>{filtered.length} events</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {['ALL', 'PRICE', 'VOLATILITY', 'SANIT', 'LAB', 'SELF'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={(): void => setFilter(cat)}
              style={filter === cat ? activePill : pill}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={(): void => setMinimized(!minimized)}
            style={toggleBtn}
          >
            {minimized ? '▲ Expand' : '▼ Minimize'}
          </button>
        </div>
      </div>

      {!minimized && (
        <div ref={scrollRef} role="log" aria-live="polite" style={logContainer}>
          {filtered.length === 0 ? (
            <div style={{ color: '#64748b', padding: '14px 0', textAlign: 'center' }}>
              No live events matching the selected filter.
            </div>
          ) : (
            filtered.map((e, idx) => {
              const lvl = LVL[e.level ?? 'info'] ?? LVL.info!;
              const time = new Date(e.timestamp).toLocaleTimeString();
              return (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 12,
                    padding: '5px 8px',
                    borderRadius: 4,
                    background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    borderLeft: `3px solid ${lvl.border}`,
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: '#64748b', fontSize: 11 }}>[{time}]</span>
                  <span style={{ background: lvl.bg, color: lvl.text, ...typeBadge }}>
                    {e.type}
                  </span>
                  <span style={{ color: '#e2e8f0', wordBreak: 'break-word', flex: 1 }}>
                    {e.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

const ctrlBar: React.CSSProperties = {
  background: '#150d2c',
  padding: '8px 18px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #281a49',
  flexWrap: 'wrap',
  gap: 8,
};
const beacon: React.CSSProperties = { width: 8, height: 8, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px #a855f7' };
const headText: React.CSSProperties = { margin: 0, fontSize: 12, fontWeight: 800, color: '#ffffff', letterSpacing: '0.08em' };
const countPill: React.CSSProperties = {
  background: '#28174d',
  color: '#c084fc',
  border: '1px solid #6b21a8',
  borderRadius: 999,
  padding: '1px 8px',
  fontSize: 11,
  fontWeight: 700,
};
const pill: React.CSSProperties = {
  background: '#1e133c',
  color: '#94a3b8',
  border: '1px solid #31215a',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};
const activePill: React.CSSProperties = {
  background: '#7c3aed',
  color: '#ffffff',
  border: '1px solid #a855f7',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};
const toggleBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #3d296e',
  color: '#c4b5fd',
  borderRadius: 6,
  padding: '3px 8px',
  fontSize: 11,
  cursor: 'pointer',
};
const logContainer: React.CSSProperties = {
  maxHeight: 200,
  overflowY: 'auto',
  padding: '8px 14px',
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1.5,
};
const typeBadge: React.CSSProperties = {
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 10,
  fontWeight: 800,
  flexShrink: 0,
};
