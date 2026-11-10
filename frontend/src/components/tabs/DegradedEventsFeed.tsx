import React, { useEffect, useState } from 'react';
import { Btn } from '../Btn';
import { cyberCard, cyberTitle, eventRow } from '../cyberStyles';

export interface DegradedEventsFeedProps {
  apiUrl: string;
}

interface IncidentRecord {
  type: string;
  token: string;
  timestamp: string;
}

/**
 * Degraded Mode Event Feed sub-component.
 *
 * @param props - Component properties
 * @returns React element
 */
export function DegradedEventsFeed({ apiUrl }: DegradedEventsFeedProps): React.JSX.Element {
  const [events, setEvents] = useState<IncidentRecord[]>([]);

  useEffect((): (() => void) => {
    let active = true;
    const fetchEvents = async (): Promise<void> => {
      try {
        const res = await fetch(`${apiUrl}/api/volatility/events`);
        const json = (await res.json()) as { events: IncidentRecord[] };
        if (active) setEvents(json.events ?? []);
      } catch {
        // Ignored
      }
    };
    void fetchEvents();
    const interval = setInterval((): void => {
      void fetchEvents();
    }, 4000);
    return (): void => {
      active = false;
      clearInterval(interval);
    };
  }, [apiUrl]);

  const clearEvents = async (): Promise<void> => {
    try {
      await fetch(`${apiUrl}/api/volatility/events`, { method: 'DELETE' });
      setEvents([]);
    } catch {
      // Ignored
    }
  };

  return (
    <section style={cyberCard}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div style={cyberTitle}>DEGRADED-MODE EVENT FEED ({events.length} LOGGED)</div>
        <Btn onClick={clearEvents} label="Clear Feed" variant="secondary" />
      </div>
      <div style={{ maxHeight: 120, overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 12 }}>No degraded mode incidents recorded.</div>
        ) : (
          events.map((ev, i) => (
            <div key={i} style={eventRow}>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>[{ev.type}]</span> {ev.token} ·{' '}
              {ev.timestamp}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

