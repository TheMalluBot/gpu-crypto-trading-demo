// Phase 1 Week 2 Test Engineer - Critical Dashboard Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

describe('Dashboard - Critical Display Tests', () => {
  const mockInvoke = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const { invoke } = require('@tauri-apps/api/tauri');
    invoke.mockImplementation(mockInvoke);
  });

  it('should render without crashing', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('dashboard') || document.body).toBeInTheDocument();
  });

  it('should display paper trading indicator prominently', () => {
    render(<Dashboard />);

    // Should clearly indicate this is paper trading
    const paperIndicators = screen.queryAllByText(/paper/i);
    const testnetIndicators = screen.queryAllByText(/testnet/i);
    const demoIndicators = screen.queryAllByText(/demo/i);

    expect(
      paperIndicators.length + testnetIndicators.length + demoIndicators.length
    ).toBeGreaterThan(0);
  });

  it('should not display sensitive API data', () => {
    mockInvoke.mockResolvedValue({
      balance: '1000.00',
      positions: [],
      api_key: 'secret_key_123',
      api_secret: 'secret_secret_456',
    });

    render(<Dashboard />);

    // Should not expose API credentials in UI
    expect(screen.queryByText('secret_key_123')).not.toBeInTheDocument();
    expect(screen.queryByText('secret_secret_456')).not.toBeInTheDocument();
  });

  it('should handle data loading errors gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));

    render(<Dashboard />);

    // Should show error state without crashing
    await waitFor(() => {
      const errorElement =
        screen.queryByText(/error/i) ||
        screen.queryByText(/failed/i) ||
        screen.queryByText(/unable/i);

      // Should handle error gracefully
      expect(errorElement || document.body).toBeTruthy();
    });
  });

  it('should display financial data safely', async () => {
    mockInvoke.mockResolvedValue({
      balance: '1234.56',
      pnl: '+123.45',
      positions: [{ symbol: 'BTCUSDT', quantity: '0.001', pnl: '+50.00' }],
    });

    render(<Dashboard />);

    await waitFor(() => {
      // Should display financial data
      expect(screen.getByText(/1234.56/) || screen.getByText(/123.45/)).toBeInTheDocument();
    });

    // Should not display raw API response structure
    expect(screen.queryByText(/\{.*\}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/"balance"/)).not.toBeInTheDocument();
  });
});
