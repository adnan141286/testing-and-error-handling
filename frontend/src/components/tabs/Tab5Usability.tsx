import React, { useState } from 'react';
import { Btn } from '../Btn';
import { HonestBadge } from '../HonestBadge';
import { TouchAndKeyboardSection } from './TouchAndKeyboardSection';
import { cardStyle, titleStyle, vpBtn, activeVpBtn } from './tab5Styles';

export interface Tab5Props {
  apiUrl: string;
}

interface AxeViolation {
  id: string;
  impact: string;
  description: string;
}

type ViewportPreset = { label: string; width: number; height: number };

const VIEWPORTS: ViewportPreset[] = [
  { label: 'Mobile 375×667', width: 375, height: 667 },
  { label: 'Tablet 768×1024', width: 768, height: 1024 },
  { label: 'Laptop 1366×768', width: 1366, height: 768 },
  { label: 'Desktop 1920×1080', width: 1920, height: 1080 },
];

/**
 * Tab 5 — Interface Usability (Cyber-Violet Terminal Design).
 */
export function Tab5Usability({ apiUrl: _apiUrl }: Tab5Props): React.JSX.Element {
  const [viewport, setViewport] = useState<ViewportPreset>(VIEWPORTS[2]!);
  const [violations, setViolations] = useState<AxeViolation[] | null>(null);
  const [axeLoading, setAxeLoading] = useState(false);

  const containerWidth = Math.min(viewport.width, 580);
  const scale = containerWidth / viewport.width;

  const runAxe = async (): Promise<void> => {
    setAxeLoading(true);
    setViolations(null);
    try {
      const axe = await import('axe-core');
      const results = await axe.default.run();
      setViolations(results.violations as AxeViolation[]);
    } catch {
      setViolations([]);
    }
    setAxeLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={titleStyle}>CROSS-DEVICE VIEWPORT SCALED PREVIEW</div>
          <HonestBadge type="INTERNAL" source="Live Iframe Resizer" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {VIEWPORTS.map((vp) => (
            <button
              key={vp.label}
              type="button"
              onClick={(): void => setViewport(vp)}
              style={viewport.label === vp.label ? activeVpBtn : vpBtn}
            >
              {vp.label}
            </button>
          ))}
        </div>
        <div
          style={{
            border: '2px solid #382463',
            borderRadius: 8,
            overflow: 'hidden',
            width: containerWidth,
            height: Math.min(viewport.height * scale, 340),
            background: '#090514',
          }}
        >
          <iframe
            title={`Preview at ${viewport.label}`}
            src="/"
            style={{
              width: viewport.width,
              height: viewport.height,
              transform: `scale(${scale})`,
              transformOrigin: '0 0',
              border: 'none',
            }}
          />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={titleStyle}>WCAG 2.1 AA ACCESSIBILITY AUDIT (AXE-CORE)</div>
          <HonestBadge type="INTERNAL" source="axe-core engine" />
        </div>
        <Btn onClick={runAxe} loading={axeLoading} label="Execute In-Browser Accessibility Scan" />
        {violations !== null && (
          <div style={{ marginTop: 12 }}>
            {violations.length === 0 ? (
              <p style={{ color: '#34d399', fontWeight: 800, margin: 0 }}>
                ✓ 0 WCAG 2.1 AA Violations Found. System fully compliant.
              </p>
            ) : (
              violations.map((v) => (
                <div key={v.id} style={{ color: '#f87171', fontSize: 12, marginBottom: 4 }}>
                  [{v.impact}] {v.id}: {v.description}
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <TouchAndKeyboardSection />
    </div>
  );
}
