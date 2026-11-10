/**
 * Generates an accessible, responsive HTML page template representing the Whalepath UI.
 * Used by Playwright for cross-device viewport and accessibility audits.
 *
 * @returns Fully structured HTML document string
 */
export function getWhalepathPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Testing and Error Handling Module</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f9fafb;
      color: #111827;
      overflow-x: hidden;
      width: 100%;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      padding: 24px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    h1 {
      font-size: 1.5rem;
      margin-top: 0;
      margin-bottom: 1rem;
    }
    .wallet-card {
      background: #f3f4f6;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
    }
    input, select {
      width: 100%;
      min-height: 44px;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
    }
    .btn-group {
      display: flex;
      gap: 12px;
    }
    button {
      min-height: 44px;
      min-width: 44px;
      padding: 12px 16px;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:focus-visible, input:focus-visible, select:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
    .btn-buy {
      flex: 1;
      background-color: #15803d;
      color: #ffffff;
    }
    .btn-sell {
      flex: 1;
      background-color: #e5e7eb;
      color: #1f2937;
    }
    .btn-submit {
      width: 100%;
      background-color: #2563eb;
      color: #ffffff;
      margin-top: 8px;
    }
    .success-alert {
      display: none;
      margin-top: 16px;
      padding: 12px;
      background-color: #dcfce7;
      color: #15803d;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <main class="container">
    <header>
      <h1>Paper Trading Panel (Preview)</h1>
      <div class="wallet-card" data-testid="wallet-balance">
        <div>Available Paper Balance:</div>
        <strong style="font-size: 1.25rem;">$100,000 USD</strong>
      </div>
    </header>

    <form id="order-form" aria-label="Paper Order Form">
      <div class="form-group">
        <label for="token-select">Select Asset</label>
        <select id="token-select">
          <option value="WETH">WETH (Wrapped Ether)</option>
          <option value="USDC">USDC (USD Coin)</option>
          <option value="SOL">SOL (Solana)</option>
        </select>
      </div>

      <div class="form-group">
        <label id="direction-label">Trade Direction</label>
        <div class="btn-group" role="group" aria-labelledby="direction-label">
          <button type="button" class="btn-buy" id="btn-buy" aria-pressed="true">Buy WETH</button>
          <button type="button" class="btn-sell" id="btn-sell" aria-pressed="false">Sell WETH</button>
        </div>
      </div>

      <div class="form-group">
        <label for="amount-input">Order Amount ($ USD)</label>
        <input id="amount-input" type="number" min="1" value="1000" />
      </div>

      <button type="submit" class="btn-submit" id="btn-submit" data-testid="submit-order-button">
        Execute Paper Order
      </button>

      <div id="status-message" class="success-alert" role="status" aria-live="polite">
        Order executed successfully: Buy $1000 WETH
      </div>
    </form>
  </main>

  <script>
    document.getElementById('order-form').addEventListener('submit', function(e) {
      e.preventDefault();
      document.getElementById('status-message').style.display = 'block';
    });
  </script>
</body>
</html>`;
}

