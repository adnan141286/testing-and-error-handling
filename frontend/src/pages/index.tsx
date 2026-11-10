import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { CyberMarketTicker } from '../components/CyberMarketTicker';
import { CyberHeader } from '../components/CyberHeader';
import { CyberMetricCards } from '../components/CyberMetricCards';
import { EventTerminal } from '../components/EventTerminal';
import { Tab1RateLimiting } from '../components/tabs/Tab1RateLimiting';
import { Tab2Sanitation } from '../components/tabs/Tab2Sanitation';
import { Tab3Volatility } from '../components/tabs/Tab3Volatility';
import { Tab4VerificationSuites } from '../components/tabs/Tab4VerificationSuites';
import { Tab5Usability } from '../components/tabs/Tab5Usability';

const TABS = [
  { id: 'tab1', label: 'API Rate Limiting' },
  { id: 'tab2', label: 'Data Sanitation' },
  { id: 'tab3', label: 'Volatility Handling' },
  { id: 'tab4', label: 'Verification Suites' },
  { id: 'tab5', label: 'Interface Usability' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface DiagnosticsSummary {
  uptime?: number;
  health?: { status?: string; environment?: string; uptime?: number };
  healthSummary?: {
    scorePercent?: number;
    passedChecks?: number;
    totalChecks?: number;
    checks?: { backend?: string; redis?: string; postgres?: string; providers?: string };
  };
  cache?: { backend?: string; hits?: number; misses?: number };
  quarantine?: { quarantinedCount?: number };
  providers?: { dexScreener?: { latencyMs?: number }; goPlus?: { latencyMs?: number } };
}

/**
 * Root Cyber-Violet Terminal page for Testing and Error Handling Module.
 * Full-width, edge-to-edge dark terminal layout with 4 core module tabs.
 *
 * @returns React element
 */
export function HomePage(): React.JSX.Element {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const [activeTab, setActiveTab] = useState<TabId>('tab1');
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSummary | null>(null);

  useEffect((): (() => void) => {
    let mounted = true;
    const fetchDiag = async (): Promise<void> => {
      try {
        const res = await fetch(`${apiUrl}/api/diagnostics`);
        if (!res.ok) return;
        const data = (await res.json()) as DiagnosticsSummary;
        if (mounted) setDiagnostics(data);
      } catch {
        // Handled silently
      }
    };
    void fetchDiag();
    const id = setInterval((): void => {
      void fetchDiag();
    }, 5000);
    return (): void => {
      mounted = false;
      clearInterval(id);
    };
  }, [apiUrl]);

  return (
    <>
      <Head>
        <title>Testing and Error Handling Module</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          background: '#090514',
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          padding: 0,
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Live Ticker - Edge-to-Edge */}
        <CyberMarketTicker apiUrl={apiUrl} />

        {/* Cyber Brand Header - Edge-to-Edge */}
        <CyberHeader
          nodeStatus={diagnostics?.health?.status ?? 'ok'}
          uptimeSeconds={diagnostics?.health?.uptime ?? diagnostics?.uptime ?? 0}
        />

        {/* 4 Summary Stat Cards - Edge-to-Edge Grid */}
        <CyberMetricCards
          status={diagnostics?.health?.status ?? 'ok'}
          uptime={diagnostics?.health?.uptime ?? diagnostics?.uptime ?? 0}
          environment={diagnostics?.health?.environment ?? 'production'}
          healthScore={diagnostics?.healthSummary?.scorePercent}
          passedChecks={diagnostics?.healthSummary?.passedChecks}
          totalChecks={diagnostics?.healthSummary?.totalChecks}
          healthChecks={diagnostics?.healthSummary?.checks}
          cacheBackend={diagnostics?.cache?.backend ?? 'Memory Fallback'}
          cacheHits={diagnostics?.cache?.hits ?? 0}
          cacheMisses={diagnostics?.cache?.misses ?? 0}
          quarantinedCount={diagnostics?.quarantine?.quarantinedCount ?? 0}
          dexLatencyMs={diagnostics?.providers?.dexScreener?.latencyMs ?? 0}
          goPlusLatencyMs={diagnostics?.providers?.goPlus?.latencyMs ?? 0}
        />

        {/* Tab Navigation Bar - Edge-to-Edge */}
        <nav
          aria-label="Module Tabs"
          style={{
            background: '#120b22',
            borderBottom: '1px solid #281a49',
            padding: '8px 24px',
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={(): void => setActiveTab(tab.id)}
                style={{
                  minHeight: 44,
                  padding: '10px 22px',
                  background: isActive
                    ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                    : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  border: isActive ? '1px solid #c084fc' : '1px solid transparent',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 0 16px rgba(139, 92, 246, 0.45)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Main Tab Workspace - Edge-to-Edge Responsive Container */}
        <main
          role="tabpanel"
          style={{
            flex: 1,
            padding: '24px',
            width: '100%',
            boxSizing: 'border-box',
            background: '#090514',
          }}
        >
          {activeTab === 'tab1' && <Tab1RateLimiting apiUrl={apiUrl} />}
          {activeTab === 'tab2' && <Tab2Sanitation apiUrl={apiUrl} />}
          {activeTab === 'tab3' && <Tab3Volatility apiUrl={apiUrl} />}
          {activeTab === 'tab4' && <Tab4VerificationSuites apiUrl={apiUrl} />}
          {activeTab === 'tab5' && <Tab5Usability apiUrl={apiUrl} />}
        </main>

        {/* Uncongested Live Event Terminal - Edge-to-Edge */}
        <EventTerminal apiUrl={apiUrl} />
      </div>
    </>
  );
}

export default HomePage;
