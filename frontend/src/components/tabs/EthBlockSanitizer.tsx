import React, { useState } from 'react';
import { Btn } from '../Btn';
import { HonestBadge } from '../HonestBadge';
import { cyberCard, cyberTitle } from '../cyberStyles';

export interface EthBlockSanitizerProps {
  apiUrl: string;
}

interface BlockSanitizeResponse {
  blockNumber: string;
  blockHash: string;
  total: number;
  accepted: number;
  quarantined: number;
  quarantinedRecords: { reason?: string; source?: string }[];
}

/**
 * Live Ethereum Block and Birdeye Wallet Sanitation component.
 *
 * @param props - Component props
 * @returns React element
 */
export function EthBlockSanitizer({ apiUrl }: EthBlockSanitizerProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BlockSanitizeResponse | null>(null);
  const [wallet, setWallet] = useState('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  const [walletReport, setWalletReport] = useState<string | null>(null);

  const sanitizeLatestBlock = async (): Promise<void> => {
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch(`${apiUrl}/api/sanitize/eth-block`, { method: 'POST' });
      const data = (await res.json()) as BlockSanitizeResponse;
      setReport(data);
    } catch {
      // Ignored
    }
    setLoading(false);
  };

  const sanitizeWallet = async (): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/sanitize/birdeye-wallet?wallet=${encodeURIComponent(wallet)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.configured) {
        setWalletReport('Birdeye: not configured');
      } else {
        setWalletReport(`Wallet history sanitized: ${data.data?.length ?? 0} txs processed`);
      }
    } catch {
      setWalletReport('Birdeye: not configured');
    }
  };

  return (
    <section style={cyberCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={cyberTitle}>LIVE ETHEREUM BLOCK & WALLET SANITATION</div>
        <HonestBadge type="LIVE" source="Ethereum RPC" />
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Btn
          onClick={sanitizeLatestBlock}
          loading={loading}
          label="Sanitize Latest Ethereum Block"
        />
      </div>

      {report && (
        <div style={{ marginBottom: 16, background: '#190f30', padding: 12, borderRadius: 8, fontSize: 12 }}>
          <div style={{ color: '#c4b5fd', fontWeight: 700, marginBottom: 4 }}>
            Block {report.blockNumber} ({report.total} txs)
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#34d399', fontWeight: 800 }}>✓ {report.accepted} Accepted</span>
            <span style={{ color: '#f87171', fontWeight: 800 }}>✕ {report.quarantined} Quarantined</span>
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid #281a49', paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd' }}>
            Sanitize Wallet History (Birdeye)
          </span>
          <HonestBadge type="LIVE" source="Birdeye" />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            style={{
              flex: '1 1 260px',
              background: '#0a0515',
              border: '1px solid #36225e',
              borderRadius: 6,
              color: '#ffffff',
              padding: '8px 12px',
              fontSize: 12,
            }}
          />
          <Btn onClick={sanitizeWallet} label="Sanitize Wallet" variant="secondary" />
        </div>
        {walletReport && (
          <div style={{ marginTop: 8, fontSize: 12, color: walletReport.includes('not configured') ? '#fbbf24' : '#34d399' }}>
            {walletReport}
          </div>
        )}
      </div>
    </section>
  );
}

