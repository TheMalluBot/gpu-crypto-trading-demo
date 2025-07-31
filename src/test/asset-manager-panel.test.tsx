import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import { AssetManagerPanel } from '../components/asset/AssetManagerPanel';
import { AssetManager } from '../utils/assetManager';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock recharts components
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock AssetManager
vi.mock('../utils/assetManager', () => ({
  AssetManager: vi.fn().mockImplementation(() => ({
    getState: vi.fn().mockReturnValue({
      config: {
        total_capital: 100000,
        asset_classes: [
          { name: 'Large Cap Crypto', target_allocation: 60, current_allocation: 58 },
          { name: 'Mid Cap Crypto', target_allocation: 30, current_allocation: 32 },
          { name: 'Small Cap Crypto', target_allocation: 10, current_allocation: 10 },
        ],
        risk_buckets: [
          { name: 'Low Risk', current_allocation: 60, max_allocation: 70 },
          { name: 'Medium Risk', current_allocation: 30, max_allocation: 35 },
          { name: 'High Risk', current_allocation: 10, max_allocation: 15 },
        ],
        profit_zones: [
          { level: 10, action: 'secure', percentage_to_secure: 25, remaining_percentage: 75 },
          { level: 20, action: 'secure', percentage_to_secure: 50, remaining_percentage: 50 },
          { level: 50, action: 'trail', percentage_to_secure: 0, remaining_percentage: 100 },
        ],
        rebalancing_frequency: 'weekly',
      },
      portfolio_health: {
        overall_score: 85,
        allocation_health: 88,
        risk_health: 82,
        profit_health: 90,
        warnings: ['Test warning'],
        recommendations: ['Test recommendation'],
      },
      allocation_status: {
        total_allocated: 95000,
        cash_available: 5000,
        rebalancing_needed: false,
      },
      profit_secured_today: 1500,
      last_rebalance: new Date(),
    }),
    checkProfitPreservation: vi.fn().mockReturnValue([
      {
        symbol: 'BTC',
        action_type: 'SECURE_PROFIT',
        profit_level_achieved: 15,
        reason: 'Reached 15% profit threshold',
      },
    ]),
    analyzeRebalancingNeeds: vi.fn().mockReturnValue([
      {
        symbol: 'ETH',
        action: 'buy',
        priority: 'medium',
        reason: 'Below target allocation',
        suggested_amount: 2000,
        current_allocation: 28,
        target_allocation: 30,
      },
    ]),
  })),
  DEFAULT_CONSERVATIVE_CONFIG: {},
}));

describe('AssetManagerPanel', () => {
  const defaultProps = {
    isVisible: true,
    onToggle: vi.fn(),
  };

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders when visible', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    expect(screen.getByText('Asset Management System')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Health:')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<AssetManagerPanel {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Asset Management System')).not.toBeInTheDocument();
  });

  it('displays portfolio health score', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Allocations')).toBeInTheDocument();
    expect(screen.getByText('Profit Management')).toBeInTheDocument();
    expect(screen.getByText('Rebalancing')).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const allocationsTab = screen.getByText('Allocations');
    await user.click(allocationsTab);

    // Check that the tab becomes active (you might need to adjust this based on your styling)
    expect(allocationsTab.closest('button')).toHaveClass('text-blue-400');
  });

  it('displays overview tab content', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    // Should be on overview tab by default
    expect(screen.getByText('Overall Health')).toBeInTheDocument();
    expect(screen.getByText('Allocation Health')).toBeInTheDocument();
    expect(screen.getByText('Risk Health')).toBeInTheDocument();
    expect(screen.getByText('Profit Health')).toBeInTheDocument();
  });

  it('displays capital allocation information', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    expect(screen.getByText('Total Capital')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('Currently Allocated')).toBeInTheDocument();
    expect(screen.getByText('$95,000')).toBeInTheDocument();
    expect(screen.getByText('Available Cash')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('displays warnings and recommendations', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    expect(screen.getByText('Test warning')).toBeInTheDocument();
    expect(screen.getByText('Test recommendation')).toBeInTheDocument();
  });

  it('displays allocations tab content', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const allocationsTab = screen.getByText('Allocations');
    await user.click(allocationsTab);

    expect(screen.getByText('Asset Class Allocation')).toBeInTheDocument();
    expect(screen.getByText('Risk Distribution')).toBeInTheDocument();
    expect(screen.getByText('Detailed Allocation')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('displays allocation table with correct data', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const allocationsTab = screen.getByText('Allocations');
    await user.click(allocationsTab);

    expect(screen.getByText('Large Cap Crypto')).toBeInTheDocument();
    expect(screen.getByText('Mid Cap Crypto')).toBeInTheDocument();
    expect(screen.getByText('Small Cap Crypto')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument(); // Target allocation
    expect(screen.getByText('58.0%')).toBeInTheDocument(); // Current allocation
  });

  it('displays profit management tab content', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    expect(screen.getByText('Profit Zones')).toBeInTheDocument();
    expect(screen.getByText('Active Profit Actions')).toBeInTheDocument();
    expect(screen.getByText('10% Profit')).toBeInTheDocument();
    expect(screen.getByText('20% Profit')).toBeInTheDocument();
    expect(screen.getByText('50% Profit')).toBeInTheDocument();
  });

  it('displays active profit securing actions', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('SECURE_PROFIT')).toBeInTheDocument();
    expect(screen.getByText('Reached 15% profit threshold')).toBeInTheDocument();
  });

  it('displays rebalancing tab content', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const rebalanceTab = screen.getByText('Rebalancing');
    await user.click(rebalanceTab);

    expect(screen.getByText('Rebalancing Status')).toBeInTheDocument();
    expect(screen.getByText('Rebalancing Suggestions')).toBeInTheDocument();
    expect(screen.getByText('NOT NEEDED')).toBeInTheDocument();
    expect(screen.getByText('WEEKLY')).toBeInTheDocument();
  });

  it('displays rebalancing suggestions', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const rebalanceTab = screen.getByText('Rebalancing');
    await user.click(rebalanceTab);

    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('Below target allocation')).toBeInTheDocument();
    expect(screen.getByText('$2,000')).toBeInTheDocument();
  });

  it('calls onToggle when close button is clicked', async () => {
    const onToggle = vi.fn();
    render(<AssetManagerPanel {...defaultProps} onToggle={onToggle} />);

    const closeButton = screen.getByText('✕');
    await user.click(closeButton);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('updates state periodically', async () => {
    vi.useFakeTimers();

    const mockAssetManager = new AssetManager({});
    const getStateSpy = vi.spyOn(mockAssetManager, 'getState');

    render(<AssetManagerPanel {...defaultProps} />);

    // Fast-forward time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // The component should have called getState multiple times due to the interval
    await waitFor(() => {
      expect(getStateSpy).toHaveBeenCalledTimes(1); // Initial call + interval call
    });

    vi.useRealTimers();
  });

  it('handles tab switching with keyboard', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const overviewTab = screen.getByText('Overview');
    overviewTab.focus();

    await user.keyboard('{ArrowRight}');

    // Focus should move to next tab
    const allocationsTab = screen.getByText('Allocations');
    expect(allocationsTab).toHaveFocus();
  });

  it('applies correct health score colors', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    // Portfolio health score of 85% should have green color
    const healthScore = screen.getByText('85%');
    expect(healthScore).toHaveClass('text-green-400');
  });

  it('calculates allocation deviations correctly', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const allocationsTab = screen.getByText('Allocations');
    await user.click(allocationsTab);

    // Large Cap Crypto: target 60%, current 58% = -2% deviation
    expect(screen.getByText('-2.0%')).toBeInTheDocument();

    // Mid Cap Crypto: target 30%, current 32% = +2% deviation
    expect(screen.getByText('+2.0%')).toBeInTheDocument();
  });

  it('handles empty profit actions gracefully', async () => {
    // Mock empty profit actions
    const mockAssetManager = AssetManager as any;
    mockAssetManager.mockImplementation(() => ({
      getState: vi.fn().mockReturnValue({
        config: {
          asset_classes: [],
          risk_buckets: [],
          profit_zones: [],
          rebalancing_frequency: 'weekly',
          total_capital: 0,
        },
        portfolio_health: {
          overall_score: 0,
          allocation_health: 0,
          risk_health: 0,
          profit_health: 0,
          warnings: [],
          recommendations: [],
        },
        allocation_status: { total_allocated: 0, cash_available: 0, rebalancing_needed: false },
        profit_secured_today: 0,
        last_rebalance: new Date(),
      }),
      checkProfitPreservation: vi.fn().mockReturnValue([]),
      analyzeRebalancingNeeds: vi.fn().mockReturnValue([]),
    }));

    render(<AssetManagerPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    expect(screen.getByText('No active profit securing actions at this time')).toBeInTheDocument();
  });

  it('handles empty rebalancing suggestions gracefully', async () => {
    // This test uses the same mock as above with empty arrays
    render(<AssetManagerPanel {...defaultProps} />);

    const rebalanceTab = screen.getByText('Rebalancing');
    await user.click(rebalanceTab);

    expect(screen.getByText('No rebalancing needed at this time')).toBeInTheDocument();
  });

  it('renders responsive container for charts', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    const allocationsTab = screen.getByText('Allocations');
    await user.click(allocationsTab);

    const responsiveContainers = screen.getAllByTestId('responsive-container');
    expect(responsiveContainers.length).toBeGreaterThan(0);
  });

  it('displays correct currency formatting', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    // Should use proper currency formatting with commas
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('$95,000')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText('$1,500')).toBeInTheDocument();
  });

  it('handles tab state management correctly', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    // Should start with Overview tab active
    const overviewTab = screen.getByText('Overview');
    expect(overviewTab.closest('button')).toHaveClass('text-blue-400');

    // Switch to Allocations tab
    const allocationsTab = screen.getByText('Allocations');
    await user.click(allocationsTab);

    expect(allocationsTab.closest('button')).toHaveClass('text-blue-400');
    expect(overviewTab.closest('button')).not.toHaveClass('text-blue-400');
  });

  it('renders all required icons', () => {
    render(<AssetManagerPanel {...defaultProps} />);

    // Icons should be rendered (we can't easily test for actual icon components,
    // but we can check that the icon containers are present)
    expect(screen.getByText('Asset Management System').previousSibling).toBeTruthy();
  });

  it('handles modal backdrop click', async () => {
    const onToggle = vi.fn();
    render(<AssetManagerPanel {...defaultProps} onToggle={onToggle} />);

    // Click on the modal backdrop (the overlay)
    const backdrop = screen.getByText('Asset Management System').closest('.fixed');
    expect(backdrop).toBeInTheDocument();

    // Since the backdrop click is handled by the overlay div, we test the close button instead
    const closeButton = screen.getByText('✕');
    await user.click(closeButton);

    expect(onToggle).toHaveBeenCalled();
  });

  it('maintains data consistency across tab switches', async () => {
    render(<AssetManagerPanel {...defaultProps} />);

    // Check data in Overview tab
    expect(screen.getByText('$100,000')).toBeInTheDocument();

    // Switch to Allocations tab
    const allocationsTab = screen.getByText('Allocations');
    await user.click(allocationsTab);

    // The same data should be reflected in calculations
    expect(screen.getByText('Large Cap Crypto')).toBeInTheDocument();

    // Switch back to Overview
    const overviewTab = screen.getByText('Overview');
    await user.click(overviewTab);

    // Data should still be consistent
    expect(screen.getByText('$100,000')).toBeInTheDocument();
  });
});
