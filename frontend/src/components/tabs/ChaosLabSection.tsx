import React, { useState } from 'react';
import { Btn } from '../Btn';
import { cyberCard, cyberTitle, ScenarioAttempt } from '../cyberStyles';

export interface ChaosLabSectionProps {
  apiUrl: string;
}

/**
 * Chaos Upstream fault-injection testing sub-component.
 *
 * @param props - Component properties
 * @returns React element
 */
export function ChaosLabSection({ apiUrl }: ChaosLabSectionProps): React.JSX.Element {
  const [scenarioAttempts, setScenarioAttempts] = useState<ScenarioAttempt[] | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioLabel, setScenarioLabel] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const runScenario = async (type: 'rate_limit' | 'outage'): Promise<void> => {
    setScenarioLoading(true);
    setScenarioLabel(type === 'rate_limit' ? 'Chaos 429 Scenario' : 'Chaos Outage Scenario');
    setScenarioAttempts(null);
    try {
      const res = await fetch(`${apiUrl}/api/lab/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = (await res.json()) as {
        attempts?: ScenarioAttempt[];
        trace?: ScenarioAttempt[];
      };
      setScenarioAttempts(data.attempts ?? data.trace ?? []);
    } catch {
      // Ignored
    }
    setScenarioLoading(false);
  };

  const resetAll = async (): Promise<void> => {
    try {
      await fetch(`${apiUrl}/api/lab/reset`, { method: 'POST' });
      setResetMsg('Circuit breakers and caches reset successfully');
    } catch {
      setResetMsg('Reset request failed');
    }
  };

  return (
    <section style={cyberCard}>
      <div style={cyberTitle}>CHAOS UPSTREAM FAULT-INJECTION LAB</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Btn
          onClick={(): Promise<void> => runScenario('rate_limit')}
          loading={scenarioLoading}
          label="Simulate 429 Backoff"
        />
        <Btn
          onClick={(): Promise<void> => runScenario('outage')}
          loading={scenarioLoading}
          label="Simulate 503 Outage"
        />
        <Btn onClick={resetAll} label="Reset Breaker & Cache" variant="secondary" />
      </div>

      {resetMsg && <p style={{ color: '#34d399', fontSize: 13, marginTop: 8 }}>{resetMsg}</p>}
      {scenarioAttempts && (
        <div style={{ marginTop: 12, background: '#0a0614', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c084fc', marginBottom: 6 }}>
            {scenarioLabel} Execution Trace:
          </div>
          {scenarioAttempts.map((a, i) => {
            const breaker = a.circuitBreakerState ?? a.circuitStateAfter ?? 'CLOSED';
            return (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: a.status === 200 ? '#34d399' : '#f87171',
                  marginBottom: 4,
                }}
              >
                [Call #{a.callNumber ?? a.attempt ?? i + 1}] HTTP {a.status}
                {a.backoffDelayMs !== undefined && a.backoffDelayMs > 0
                  ? ` · Backoff: ${a.backoffDelayMs}ms`
                  : ''}
                {a.retryAfterSeconds !== undefined && a.retryAfterSeconds > 0
                  ? ` · Retry-After: ${a.retryAfterSeconds}s`
                  : ''}
                {` · Breaker: [${breaker}]`}
                {a.servedStale ? ' · [STALE SERVED]' : ''} — {a.message}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

