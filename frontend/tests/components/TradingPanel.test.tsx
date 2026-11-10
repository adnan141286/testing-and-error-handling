import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradingPanel } from '../../src/components/TradingPanel';

describe('TradingPanel Component Unit Tests', (): void => {
  it('renders wallet paper balance and interactive trading controls', (): void => {
    render(<TradingPanel initialBalance={250000} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Paper Trading Panel (Preview)',
    );
    expect(screen.getByTestId('wallet-balance')).toHaveTextContent('$250,000 USD');
    expect(screen.getByLabelText(/select asset/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order amount/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /execute paper order/i }),
    ).toBeInTheDocument();
  });

  it('toggles trade direction between BUY and SELL correctly', async (): Promise<void> => {
    const user = userEvent.setup();
    render(<TradingPanel />);

    const buyButton = screen.getByRole('button', { name: /buy weth/i });
    const sellButton = screen.getByRole('button', { name: /sell weth/i });

    expect(buyButton).toHaveAttribute('aria-pressed', 'true');
    expect(sellButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(sellButton);
    expect(sellButton).toHaveAttribute('aria-pressed', 'true');
    expect(buyButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates asset and dispatches onPlaceOrder with valid parameters upon submission', async (): Promise<void> => {
    const user = userEvent.setup();
    const mockOrderHandler = jest.fn();

    render(<TradingPanel onPlaceOrder={mockOrderHandler} />);

    const select = screen.getByLabelText(/select asset/i);
    await user.selectOptions(select, 'SOL');

    const amountInput = screen.getByLabelText(/order amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '5000');

    const submitBtn = screen.getByRole('button', { name: /execute paper order/i });
    await user.click(submitBtn);

    expect(mockOrderHandler).toHaveBeenCalledTimes(1);
    expect(mockOrderHandler).toHaveBeenCalledWith({
      token: 'SOL',
      side: 'BUY',
      amount: 5000,
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Order submitted: BUY $5000 of SOL',
    );
  });

  it('prevents submission when input amount is non-positive or invalid', (): void => {
    const mockOrderHandler = jest.fn();
    render(<TradingPanel onPlaceOrder={mockOrderHandler} />);

    const amountInput = screen.getByLabelText(/order amount/i);
    fireEvent.change(amountInput, { target: { value: '-100' } });

    const submitBtn = screen.getByRole('button', { name: /execute paper order/i });
    fireEvent.click(submitBtn);

    expect(mockOrderHandler).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

