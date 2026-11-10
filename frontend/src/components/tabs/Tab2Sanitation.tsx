import React, { useState } from 'react';
import { Btn } from '../Btn';
import {
  cyberCard,
  cyberTitle,
  cyberSampleBtn,
  textareaStyle,
  greenBadge,
  redBadge,
  quarantineRow,
} from '../cyberStyles';
import { SANITATION_SAMPLES } from './sanitationSamples';
import { GoPlusSecuritySection } from './GoPlusSecuritySection';
import { EthBlockSanitizer } from './EthBlockSanitizer';
import { HonestBadge } from '../HonestBadge';

export interface Tab2Props {
  apiUrl: string;
}

interface SanitizeResponse {
  total: number;
  accepted: number;
  quarantined: number;
  quarantinedRecords: { reason?: string; source?: string }[];
}

interface QuarantineResponse {
  records: { reason?: string; source?: string }[];
  stats: { totalQuarantined: number };
}

/**
 * Tab 2 — Data Sanitation (Cyber-Violet Terminal Design).
 *
 * @param props - Component properties
 * @returns React element
 */
export function Tab2Sanitation({ apiUrl }: Tab2Props): React.JSX.Element {
  const [batchText, setBatchText] = useState<string>(
    JSON.stringify(SANITATION_SAMPLES['Valid Batch'], null, 2),
  );
  const [sanitizeResult, setSanitizeResult] = useState<SanitizeResponse | null>(null);
  const [sanitizeLoading, setSanitizeLoading] = useState(false);
  const [quarantine, setQuarantine] = useState<QuarantineResponse | null>(null);
  const [liveResult, setLiveResult] = useState<SanitizeResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const sanitizeBatch = async (): Promise<void> => {
    setSanitizeLoading(true);
    try {
      const records = JSON.parse(batchText) as unknown[];
      const res = await fetch(`${apiUrl}/api/sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, schemaType: 'tokenPair' }),
      });
      setSanitizeResult((await res.json()) as SanitizeResponse);
    } catch {
      // Ignored
    }
    setSanitizeLoading(false);
  };

  const fetchLiveAudit = async (): Promise<void> => {
    setLiveLoading(true);
    try {
      const priceRes = await fetch(`${apiUrl}/api/token/price?symbol=SOL`);
      const pair = await priceRes.json();
      const res = await fetch(`${apiUrl}/api/sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [pair], schemaType: 'tokenPair' }),
      });
      setLiveResult((await res.json()) as SanitizeResponse);
    } catch {
      // Ignored
    }
    setLiveLoading(false);
  };

  const viewQuarantine = async (): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/quarantine`);
      setQuarantine((await res.json()) as QuarantineResponse);
    } catch {
      // Ignored
    }
  };

  const clearQuarantine = async (): Promise<void> => {
    try {
      await fetch(`${apiUrl}/api/quarantine`, { method: 'DELETE' });
      setQuarantine(null);
    } catch {
      // Ignored
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <EthBlockSanitizer apiUrl={apiUrl} />

      <section style={cyberCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={cyberTitle}>PAYLOAD EDITOR & RESILIENT SCHEMA SANITIZER</div>
          <HonestBadge type="SIMULATED" source="Preset Scenarios" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {Object.entries(SANITATION_SAMPLES).map(([name, payload]) => (
            <button
              key={name}
              type="button"
              onClick={(): void => setBatchText(JSON.stringify(payload, null, 2))}
              style={cyberSampleBtn}
            >
              {name} (SIMULATED)
            </button>
          ))}
        </div>
        <textarea
          rows={6}
          value={batchText}
          onChange={(e): void => setBatchText(e.target.value)}
          aria-label="JSON Batch Payload"
          style={textareaStyle}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <Btn onClick={sanitizeBatch} loading={sanitizeLoading} label="Sanitize Batch" />
          <Btn
            onClick={fetchLiveAudit}
            loading={liveLoading}
            label="Fetch & Sanitize Live DEX Data"
            variant="secondary"
          />
          <Btn onClick={viewQuarantine} label="Inspect Quarantine Vault" variant="secondary" />
          <Btn onClick={clearQuarantine} label="Purge Vault" variant="secondary" />
        </div>
      </section>

      {sanitizeResult && (
        <section style={cyberCard}>
          <div style={cyberTitle}>SANITATION RUN REPORT</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <span style={greenBadge}>✓ {sanitizeResult.accepted} ACCEPTED</span>
            <span style={redBadge}>✕ {sanitizeResult.quarantined} QUARANTINED</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Total: {sanitizeResult.total} records
            </span>
          </div>
          {sanitizeResult.quarantinedRecords?.length > 0 && (
            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
              {sanitizeResult.quarantinedRecords.map((r, i) => (
                <div key={i} style={quarantineRow}>
                  <span style={{ color: '#f87171' }}>[QUARANTINE #{i + 1}]</span>{' '}
                  {r.reason ?? 'Failed schema check'}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {liveResult && (
        <section style={cyberCard}>
          <div style={cyberTitle}>LIVE DEX SCREENER SANITATION AUDIT</div>
          <p style={{ margin: 0, fontSize: 13, color: '#34d399' }}>
            ✓ {liveResult.accepted} valid pairs accepted, {liveResult.quarantined} malformed pairs
            quarantined.
          </p>
        </section>
      )}

      {quarantine && (
        <section style={cyberCard}>
          <div style={cyberTitle}>
            QUARANTINE VAULT ({quarantine.stats.totalQuarantined} TOTAL RECORDS)
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto' }}>
            {quarantine.records.map((r, i) => (
              <div key={i} style={quarantineRow}>
                <span style={{ color: '#c084fc' }}>[{r.source ?? 'quarantine'}]</span>{' '}
                {r.reason ?? 'Failed schema check'}
              </div>
            ))}
          </div>
        </section>
      )}

      <GoPlusSecuritySection apiUrl={apiUrl} />
    </div>
  );
}
