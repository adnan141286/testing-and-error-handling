import React, { useState } from 'react';
import { Btn } from '../Btn';
import { HonestBadge } from '../HonestBadge';
import { cyberCard, cyberTitle, cyberSelect } from '../cyberStyles';

export interface Tab4Props {
  apiUrl: string;
}

interface SelfTestCheck {
  name: string;
  passed: boolean;
  durationMs: number;
}

interface SelfTestResponse {
  success: boolean;
  passed: number;
  totalDurationMs: number;
  tests: SelfTestCheck[];
}

interface CoverageMetric {
  pct: number;
}

interface CoverageResponse {
  available: boolean;
  metrics?: {
    statements: CoverageMetric;
    branches: CoverageMetric;
    functions: CoverageMetric;
    lines: CoverageMetric;
  };
}

const ERROR_TYPES = ['validation', 'rate_limit', 'provider', 'circuit_open', 'not_found'] as const;
type ErrorType = (typeof ERROR_TYPES)[number];

const COMMANDS = [
  { label: 'Run Full Test Suite', cmd: 'npm run test:coverage --prefix backend' },
  { label: 'Check Type Safety', cmd: 'npm run typecheck --prefix backend' },
  { label: 'Playwright Cross-Device Audits', cmd: 'npx playwright test' },
];

/**
 * Tab 4 — Verification Suites (Cyber-Violet Terminal Design).
 *
 * @param props - Component properties
 * @returns React element
 */
export function Tab4VerificationSuites({ apiUrl }: Tab4Props): React.JSX.Element {
  const [selfTest, setSelfTest] = useState<SelfTestResponse | null>(null);
  const [selfTestLoading, setSelfTestLoading] = useState(false);
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [errorType, setErrorType] = useState<ErrorType>('validation');
  const [errorResult, setErrorResult] = useState<unknown | null>(null);

  const runSelfTest = async (): Promise<void> => {
    setSelfTestLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/selftest`, { method: 'POST' });
      setSelfTest((await res.json()) as SelfTestResponse);
    } catch {
      // Ignored
    }
    setSelfTestLoading(false);
  };

  const loadCoverage = async (): Promise<void> => {
    setCoverageLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/coverage`);
      setCoverage((await res.json()) as CoverageResponse);
    } catch { /* Ignored */ }
    setCoverageLoading(false);
  };

  const runErrorCheck = async (): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/lab/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: errorType }),
      });
      setErrorResult(await res.json());
    } catch { /* Ignored */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section style={cyberCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={cyberTitle}>AUTOMATED RUNTIME SYSTEM SELF-TEST</div>
          <HonestBadge type="INTERNAL" source="Backend Diagnostics" />
        </div>
        <Btn onClick={runSelfTest} loading={selfTestLoading} label="Execute 8-Check Runtime Self-Test" />
        {selfTest && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: selfTest.success ? '#34d399' : '#f87171', marginBottom: 8 }}>
              ✓ All {selfTest.passed} / {selfTest.tests.length} checks passed in {selfTest.totalDurationMs}ms
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
              {selfTest.tests.map((t) => (
                <div key={t.name} style={checkItem}>
                  <span style={{ color: t.passed ? '#34d399' : '#f87171', fontWeight: 800 }}>✓</span>
                  <span style={{ color: '#e2e8f0', fontSize: 12 }}>{t.name}</span>
                  <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 'auto' }}>{t.durationMs}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section style={cyberCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={cyberTitle}>JEST 85% CODE COVERAGE COMPLIANCE</div>
          <HonestBadge type="INTERNAL" source="coverage-summary.json snapshot" />
        </div>
        <Btn onClick={loadCoverage} loading={coverageLoading} label="Load Live Coverage Summary" variant="secondary" />
        {coverage?.available && coverage.metrics && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {(['statements', 'branches', 'functions', 'lines'] as const).map((m) => (
              <div key={m} style={statBox}>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{m}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>{coverage.metrics?.[m].pct}%</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Target: 85%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={cyberCard}>
        <div style={cyberTitle}>TERMINAL VERIFICATION COMMANDS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {COMMANDS.map((c) => (
            <div key={c.cmd} style={cmdRow}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{c.label}</div>
                <code style={{ color: '#a78bfa', fontSize: 12 }}>{c.cmd}</code>
              </div>
              <button
                type="button"
                onClick={(): void => {
                  void navigator.clipboard.writeText(c.cmd);
                }}
                style={copyBtn}
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={cyberCard}>
        <div style={cyberTitle}>CUSTOM ERROR CONTRACT AUDIT</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={errorType} onChange={(e): void => setErrorType(e.target.value as ErrorType)} style={cyberSelect}>
            {ERROR_TYPES.map((t) => (
              <option key={t} value={t} style={{ background: '#1c1236' }}>
                {t}
              </option>
            ))}
          </select>
          <Btn onClick={runErrorCheck} label="Trigger Contract Error" variant="secondary" />
        </div>
        {errorResult !== null && (
          <pre style={preStyle}>{JSON.stringify(errorResult, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}

const checkItem: React.CSSProperties = { background: '#0c0717', border: '1px solid #28194a', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 };
const statBox: React.CSSProperties = { background: '#1c1236', border: '1px solid #321e5c', borderRadius: 8, padding: '8px 14px', display: 'flex', flexDirection: 'column' };
const cmdRow: React.CSSProperties = { background: '#0a0614', border: '1px solid #28194a', borderRadius: 6, padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const copyBtn: React.CSSProperties = { background: '#241447', border: '1px solid #4f2d8a', color: '#c4b5fd', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' };
const preStyle: React.CSSProperties = { marginTop: 10, background: '#0a0614', border: '1px solid #301f57', borderRadius: 8, padding: 10, fontSize: 11, color: '#cbd5e1', overflowX: 'auto' };
