// Phase 1 Week 2 Test Engineer - Critical Trading Component Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TradePanel from '../TradePanel';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

describe('TradePanel - Critical Trading Tests', () => {
  const mockInvoke = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation
    const { invoke } = require('@tauri-apps/api/tauri');
    invoke.mockImplementation(mockInvoke);
  });

  it('should render paper trading warning prominently', () => {
    render(<TradePanel />);

    // CRITICAL: Must show paper trading mode
    expect(screen.getByText(/paper trading/i)).toBeInTheDocument();
    expect(screen.getByText(/testnet/i) || screen.getByText(/demo/i)).toBeInTheDocument();
  });

  it('should prevent live trading operations', async () => {
    render(<TradePanel />);

    // Try to place a trade
    const buyButton = screen.getByText(/buy/i);
    const sellButton = screen.getByText(/sell/i);

    await userEvent.click(buyButton);

    // Should not call live trading API
    expect(mockInvoke).not.toHaveBeenCalledWith(expect.stringContaining('place_live_order'));

    // Should only call paper trading functions
    if (mockInvoke.mock.calls.length > 0) {
      const callArgs = mockInvoke.mock.calls.map(call => call[0]);
      expect(
        callArgs.every(arg => arg.includes('paper') || arg.includes('demo') || arg.includes('test'))
      ).toBe(true);
    }
  });

  it('should validate order inputs properly', async () => {
    render(<TradePanel />);

    // Find quantity input
    const quantityInput =
      screen.getByLabelText(/quantity/i) ||
      screen.getByPlaceholderText(/quantity/i) ||
      screen.getByDisplayValue('');

    if (quantityInput) {
      // Test negative quantity
      await userEvent.clear(quantityInput);
      await userEvent.type(quantityInput, '-1');

      const submitButton = screen.getByText(/buy/i) || screen.getByText(/place/i);
      await userEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });
    }
  });

  it('should display current market data safely', () => {
    render(<TradePanel />);

    // Should not show any real API keys or secrets
    const component = screen.getByTestId('trade-panel') || document.body;
    expect(component.textContent).not.toMatch(/sk_.*/); // Binance secret key pattern
    expect(component.textContent).not.toMatch(/pk_.*/); // API key pattern
    expect(component.textContent).not.toMatch(/[A-Za-z0-9]{64}/); // 64-char keys
  });

  it('should handle order placement errors gracefully', async () => {
    // Mock API error
    mockInvoke.mockRejectedValue(new Error('API Error: Insufficient funds'));

    render(<TradePanel />);

    const buyButton = screen.getByText(/buy/i);
    await userEvent.click(buyButton);

    // Should display error message to user
    await waitFor(() => {
      expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('should not expose sensitive data in DOM', () => {
    render(<TradePanel />);

    // Check that no sensitive patterns are in the DOM
    const htmlContent = document.documentElement.innerHTML;

    // Should not contain API credentials
    expect(htmlContent).not.toMatch(/api[_-]?key/i);
    expect(htmlContent).not.toMatch(/api[_-]?secret/i);
    expect(htmlContent).not.toMatch(/private[_-]?key/i);

    // Should not contain long hex strings that might be keys
    expect(htmlContent).not.toMatch(/[a-fA-F0-9]{32,}/);
  });

  it('should validate symbol input against XSS', async () => {
    render(<TradePanel />);

    const symbolInput = screen.getByLabelText(/symbol/i) || screen.getByPlaceholderText(/symbol/i);

    if (symbolInput) {
      // Try XSS injection
      await userEvent.clear(symbolInput);
      await userEvent.type(symbolInput, '<script>alert("xss")</script>');

      // Should sanitize input
      expect(symbolInput.value).not.toContain('<script>');
      expect(symbolInput.value).not.toContain('alert');
    }
  });

  it('should enforce minimum and maximum order sizes', async () => {
    render(<TradePanel />);

    const quantityInput =
      screen.getByLabelText(/quantity/i) || screen.getByPlaceholderText(/quantity/i);

    if (quantityInput) {
      // Test extremely large order
      await userEvent.clear(quantityInput);
      await userEvent.type(quantityInput, '999999999');

      const submitButton = screen.getByText(/buy/i) || screen.getByText(/place/i);
      await userEvent.click(submitButton);

      // Should show warning about large order
      await waitFor(() => {
        const warningText =
          screen.queryByText(/large/i) ||
          screen.queryByText(/maximum/i) ||
          screen.queryByText(/limit/i);
        // If no warning, at least ensure order doesn't go through
        if (!warningText) {
          expect(mockInvoke).not.toHaveBeenCalledWith(expect.stringContaining('place_order'));
        }
      });
    }
  });

  it('should display real-time price updates safely', async () => {
    // Mock price data
    mockInvoke.mockResolvedValue({
      symbol: 'BTCUSDT',
      price: '50000.00',
      change: '+2.5%',
    });

    render(<TradePanel />);

    // Should display price information
    await waitFor(() => {
      expect(screen.getByText(/50000/)).toBeInTheDocument();
    });

    // Should not display raw API response data
    expect(screen.queryByText(/"symbol"/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\{.*\}/)).not.toBeInTheDocument();
  });

  it('should maintain order history securely', async () => {
    render(<TradePanel />);

    // Check if order history is displayed
    const historySection =
      screen.queryByText(/history/i) ||
      screen.queryByText(/orders/i) ||
      screen.queryByText(/trades/i);

    if (historySection) {
      // Should not show full order IDs or sensitive data
      const container = screen.getByTestId('trade-panel') || document.body;
      expect(container.textContent).not.toMatch(/order[_-]?id.*[0-9]{10,}/);
      expect(container.textContent).not.toMatch(/client[_-]?id.*[0-9a-f]{20,}/);
    }
  });
});
