import React, { useEffect, useRef, useState } from 'react';

/** A single entry in the event log. */
export interface EventEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
}

export interface EventLogPanelProps {
  apiUrl: string;
}

/** Returns relative time string from an ISO timestamp. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

const LEVEL_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
};

/**
 * Always-visible event log panel polling /api/events every 3 seconds.
 * Shows last 50 events with timestamps, type badge and level colouring.
 *
 * @param props - Component properties
 * @returns React element
 */
export function EventLogPanel({ apiUrl }: EventLogPanelProps): React.JSX.Element {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect((): (() => void) => {
    let mounted = true;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`${apiUrl}/api/events?limit=50`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { events: EventEntry[] };
        if (mounted) { setEvents(json.events); setError(null); }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Error');
      }
    };
    void load();
    const id = setInterval((): void => { void load(); }, 3000);
    return (): void => { mounted = false; clearInterval(id); };
  }, [apiUrl]);

  return (
    <aside
      aria-label="Live Event Log"
      style={{
        background: '#0f172a',
        color: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        minWidth: 260,
        maxWidth: 340,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
        overflow: 'hidden',
      }}
    >
      <h2
        style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px 0', color: '#94a3b8', letterSpacing: 1 }}
      >
        LIVE EVENT LOG
      </h2>
      {error && (
        <p style={{ color: '#fca5a5', fontSize: 11, margin: '0 0 6px' }}>⚠ {error}</p>
      )}
      <ul
        ref={listRef}
        aria-live="polite"
        aria-label="Event entries"
        style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }}
      >
        {events.length === 0 && (
          <li style={{ fontSize: 11, color: '#475569' }}>No events yet…</li>
        )}
        {events.map((e) => (
          <li
            key={e.id}
            style={{
              borderLeft: `3px solid ${LEVEL_COLORS[e.level ?? 'info'] ?? '#3b82f6'}`,
              padding: '4px 6px',
              marginBottom: 4,
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: '#64748b', fontSize: 10 }}>{relativeTime(e.timestamp)}</span>
            {' '}
            <span
              style={{
                background: LEVEL_COLORS[e.level ?? 'info'] ?? '#3b82f6',
                color: '#fff',
                borderRadius: 2,
                padding: '0 4px',
                fontSize: 9,
                fontWeight: 700,
              }}
            >
              {e.type}
            </span>
            {' '}
            <span style={{ color: '#cbd5e1' }}>{e.message}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

