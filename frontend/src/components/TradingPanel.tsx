import React, { useState, useEffect } from 'react';

export interface TradingPanelProps {
  initialBalance?: number;
  apiUrl?: string;
  onPlaceOrder?: (order: { token: string; side: 'BUY' | 'SELL'; amount: number }) => void;
}

interface PriceState {
  price: number | null;
  cached: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Paper trading panel with live token pricing from DEX Screener,
 * cache freshness badges, and accessible controls.
 *
 * @param props - Component configuration props
 * @returns React JSX element
 */
export const TradingPanel: React.FC<TradingPanelProps> = ({
  initialBalance = 100000,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  onPlaceOrder,
}) => {
  const [token, setToken] = useState('WETH');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('1000');
  const [submitted, setSubmitted] = useState(false);
  const [priceInfo, setPriceInfo] = useState<PriceState>({
    price: null,
    cached: false,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchPrice = async (): Promise<void> => {
      setPriceInfo((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const querySymbol = token === 'WETH' ? 'ETH' : token;
        const res = await fetch(`${apiUrl}/api/token/price?symbol=${querySymbol}`);
        if (!res.ok) {
          throw new Error(`Price unavailable (${res.status})`);
        }
        const data = (await res.json()) as { price: number; cached: boolean };
        if (isMounted) {
          setPriceInfo({ price: data.price, cached: data.cached, loading: false, error: null });
        }
      } catch (err) {
        if (isMounted) {
          setPriceInfo((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Error fetching price',
          }));
        }
      }
    };

    void fetchPrice();
    return (): void => {
      isMounted = false;
    };
  }, [apiUrl, token]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setSubmitted(true);
    onPlaceOrder?.({ token, side, amount: parsedAmount });
  };

  const getPriceBadge = (): React.JSX.Element | null => {
    if (priceInfo.loading) {
      return <span style={{ fontSize: '12px', color: '#6b7280' }}>Fetching live price...</span>;
    }
    if (priceInfo.error) {
      return <span style={{ fontSize: '12px', color: '#dc2626' }}>{priceInfo.error}</span>;
    }
    if (priceInfo.price === null) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
        <strong data-testid="live-price" style={{ fontSize: '15px', color: '#111827' }}>
          ${priceInfo.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD
        </strong>
        <span
          data-testid="price-freshness-badge"
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            textTransform: 'uppercase',
            backgroundColor: priceInfo.cached ? '#dbeafe' : '#dcfce7',
            color: priceInfo.cached ? '#1d4ed8' : '#15803d',
          }}
        >
          {priceInfo.cached ? 'cached' : 'fresh'}
        </span>
      </div>
    );
  };

  return (
    <main role="main" style={{ maxWidth: '100%', margin: '0 auto', padding: '16px', boxSizing: 'border-box', overflowX: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111827', backgroundColor: '#ffffff' }}>
      <header>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>Paper Trading Panel (Preview)</h1>
        <div data-testid="wallet-balance" style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', color: '#4b5563' }}>Available Paper Balance:</span>
          <strong style={{ display: 'block', fontSize: '20px' }}>${initialBalance.toLocaleString()} USD</strong>
        </div>
      </header>

      <form onSubmit={handleSubmit} aria-label="Paper Order Form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="token-select" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Select Asset</label>
          <select id="token-select" value={token} onChange={(e) => setToken(e.target.value)} style={{ width: '100%', minHeight: '44px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '16px' }}>
            <option value="WETH">WETH (Wrapped Ether)</option>
            <option value="USDC">USDC (USD Coin)</option>
            <option value="SOL">SOL (Solana)</option>
            <option value="BTC">BTC (Bitcoin)</option>
          </select>
          {getPriceBadge()}
        </div>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: '6px' }}>Trade Direction</legend>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setSide('BUY')} aria-pressed={side === 'BUY'} style={{ flex: 1, minHeight: '44px', minWidth: '44px', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: side === 'BUY' ? '#15803d' : '#e5e7eb', color: side === 'BUY' ? '#ffffff' : '#374151', fontWeight: 600 }}>
              Buy {token}
            </button>
            <button type="button" onClick={() => setSide('SELL')} aria-pressed={side === 'SELL'} style={{ flex: 1, minHeight: '44px', minWidth: '44px', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: side === 'SELL' ? '#dc2626' : '#e5e7eb', color: side === 'SELL' ? '#ffffff' : '#374151', fontWeight: 600 }}>
              Sell {token}
            </button>
          </div>
        </fieldset>

        <div>
          <label htmlFor="amount-input" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Order Amount ($ USD)</label>
          <input id="amount-input" type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', minHeight: '44px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '16px', boxSizing: 'border-box' }} />
        </div>

        <button type="submit" data-testid="submit-order-button" style={{ minHeight: '44px', minWidth: '44px', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
          Execute Paper Order
        </button>

        {submitted && (
          <div role="status" aria-live="polite" style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '6px', color: '#15803d' }}>
            Order submitted: {side} ${amount} of {token}
          </div>
        )}
      </form>
    </main>
  );
};
