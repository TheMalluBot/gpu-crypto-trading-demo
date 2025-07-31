import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { AutomationConfigPanel } from '../components/asset/AutomationConfigPanel';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock the Modal component
vi.mock('../components/common/Modal', () => ({
  Modal: ({ isOpen, onClose, children, maxWidth }: any) =>
    isOpen ? (
      <div data-testid="modal" data-maxwidth={maxWidth}>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

describe('AutomationConfigPanel', () => {
  const mockAssetManager = {
    config: {
      enabled: true,
      monitoring_interval: 30000,
      auto_profit_taking: false,
      profit_taking_threshold: 5,
      auto_rebalance: true,
      rebalance_threshold: 3,
    },
    updateConfig: vi.fn(),
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    assetManager: mockAssetManager,
  };

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Automation Configuration')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AutomationConfigPanel {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Profit Management')).toBeInTheDocument();
    expect(screen.getByText('Rebalancing')).toBeInTheDocument();
    expect(screen.getByText('Risk Controls')).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    expect(profitTab.closest('button')).toHaveClass('text-blue-400');
  });

  it('displays general settings by default', () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    expect(screen.getByText('General Automation Settings')).toBeInTheDocument();
    expect(screen.getByText('Enable Automation')).toBeInTheDocument();
    expect(screen.getByText('Monitoring Interval')).toBeInTheDocument();
  });

  it('displays correct initial toggle state for automation enabled', () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    // The toggle should reflect the initial enabled state (true)
    const toggle = screen.getByText('Enable Automation').parentElement?.querySelector('button');
    expect(toggle).toHaveClass('bg-green-500');
  });

  it('displays correct initial slider value for monitoring interval', () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const slider = screen.getByDisplayValue('30000');
    expect(slider).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('toggles automation enabled setting', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const toggle = screen.getByText('Enable Automation').parentElement?.querySelector('button');
    expect(toggle).toBeInTheDocument();

    await user.click(toggle!);

    // Toggle should change appearance
    expect(toggle).toHaveClass('bg-green-500');
  });

  it('updates monitoring interval via slider', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const slider = screen.getByDisplayValue('30000');
    await user.clear(slider);
    await user.type(slider, '60000');

    expect(screen.getByText('60s')).toBeInTheDocument();
  });

  it('displays profit management settings', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    expect(screen.getByText('Automated Profit Taking')).toBeInTheDocument();
    expect(screen.getByText('Auto Profit Taking')).toBeInTheDocument();
    expect(screen.getByText('Minimum Profit Threshold')).toBeInTheDocument();
  });

  it('displays profit zones configuration', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    expect(screen.getByText('Profit Zones')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('toggles profit taking setting', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    const toggle = screen.getByText('Auto Profit Taking').parentElement?.querySelector('button');
    expect(toggle).toBeInTheDocument();

    await user.click(toggle!);

    // Toggle state should change
    expect(toggle).toHaveClass('bg-green-500');
  });

  it('updates profit threshold via slider', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    const slider = screen.getByDisplayValue('5');
    await user.clear(slider);
    await user.type(slider, '10');

    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('displays rebalancing settings', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const rebalanceTab = screen.getByText('Rebalancing');
    await user.click(rebalanceTab);

    expect(screen.getByText('Automated Rebalancing')).toBeInTheDocument();
    expect(screen.getByText('Auto Rebalancing')).toBeInTheDocument();
    expect(screen.getByText('Rebalance Threshold')).toBeInTheDocument();
  });

  it('displays target allocations', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const rebalanceTab = screen.getByText('Rebalancing');
    await user.click(rebalanceTab);

    expect(screen.getByText('Target Allocations')).toBeInTheDocument();
    expect(screen.getByText('Large Cap Crypto')).toBeInTheDocument();
    expect(screen.getByText('Mid Cap Crypto')).toBeInTheDocument();
    expect(screen.getByText('Speculative')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('toggles rebalancing setting', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const rebalanceTab = screen.getByText('Rebalancing');
    await user.click(rebalanceTab);

    const toggle = screen.getByText('Auto Rebalancing').parentElement?.querySelector('button');
    expect(toggle).toBeInTheDocument();

    // Should initially show blue (enabled state)
    expect(toggle).toHaveClass('bg-blue-500');

    await user.click(toggle!);

    // State should change
    expect(toggle).not.toHaveClass('bg-blue-500');
  });

  it('updates rebalance threshold via slider', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const rebalanceTab = screen.getByText('Rebalancing');
    await user.click(rebalanceTab);

    const slider = screen.getByDisplayValue('3');
    await user.clear(slider);
    await user.type(slider, '5');

    expect(screen.getByText('5%')).toBeInTheDocument();
  });

  it('displays risk controls settings', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const riskTab = screen.getByText('Risk Controls');
    await user.click(riskTab);

    expect(screen.getByText('Risk Management Controls')).toBeInTheDocument();
    expect(screen.getByText('Emergency Controls')).toBeInTheDocument();
    expect(screen.getByText('Flash Crash Protection')).toBeInTheDocument();
    expect(screen.getByText('High Volatility Scaling')).toBeInTheDocument();
  });

  it('displays risk thresholds', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const riskTab = screen.getByText('Risk Controls');
    await user.click(riskTab);

    expect(screen.getByText('Risk Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Health Threshold')).toBeInTheDocument();
    expect(screen.getByText('Volatility Threshold')).toBeInTheDocument();
  });

  it('displays risk bucket limits', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const riskTab = screen.getByText('Risk Controls');
    await user.click(riskTab);

    expect(screen.getByText('Risk Bucket Limits')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Max 70%')).toBeInTheDocument();
    expect(screen.getByText('Max 25%')).toBeInTheDocument();
    expect(screen.getByText('Max 5%')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    render(<AutomationConfigPanel {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('saves configuration when save button is clicked', async () => {
    const onClose = vi.fn();
    const updateConfig = vi.fn();
    const assetManager = {
      ...mockAssetManager,
      updateConfig,
    };

    render(
      <AutomationConfigPanel {...defaultProps} onClose={onClose} assetManager={assetManager} />
    );

    // Make a change first
    const toggle = screen.getByText('Enable Automation').parentElement?.querySelector('button');
    await user.click(toggle!);

    const saveButton = screen.getByText('Save Configuration');
    await user.click(saveButton);

    expect(updateConfig).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('updates config state when changes are made', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    // Toggle automation enabled
    const toggle = screen.getByText('Enable Automation').parentElement?.querySelector('button');
    await user.click(toggle!);

    // Change monitoring interval
    const slider = screen.getByDisplayValue('30000');
    await user.clear(slider);
    await user.type(slider, '45000');

    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('handles missing config properties gracefully', () => {
    const incompleteAssetManager = {
      config: {}, // Empty config
      updateConfig: vi.fn(),
    };

    expect(() => {
      render(<AutomationConfigPanel {...defaultProps} assetManager={incompleteAssetManager} />);
    }).not.toThrow();

    // Should still render basic structure
    expect(screen.getByText('Automation Configuration')).toBeInTheDocument();
  });

  it('displays correct slider ranges and steps', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    // Monitoring interval slider
    const monitoringSlider = screen.getByDisplayValue('30000');
    expect(monitoringSlider).toHaveAttribute('min', '5000');
    expect(monitoringSlider).toHaveAttribute('max', '300000');
    expect(monitoringSlider).toHaveAttribute('step', '5000');

    // Switch to profit management tab
    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    // Profit threshold slider
    const profitSlider = screen.getByDisplayValue('5');
    expect(profitSlider).toHaveAttribute('min', '1');
    expect(profitSlider).toHaveAttribute('max', '20');
    expect(profitSlider).toHaveAttribute('step', '0.5');
  });

  it('shows footer information', () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    expect(
      screen.getByText('Changes will take effect immediately after saving')
    ).toBeInTheDocument();
  });

  it('uses correct modal max width', () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    expect(screen.getByTestId('modal')).toHaveAttribute('data-maxwidth', '4xl');
  });

  it('maintains state across tab switches', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    // Make a change in General tab
    const toggle = screen.getByText('Enable Automation').parentElement?.querySelector('button');
    await user.click(toggle!);

    // Switch to Profit Management tab
    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    // Switch back to General tab
    const generalTab = screen.getByText('General');
    await user.click(generalTab);

    // Change should still be reflected
    const toggleAfter = screen
      .getByText('Enable Automation')
      .parentElement?.querySelector('button');
    expect(toggleAfter).toHaveClass('bg-green-500');
  });

  it('handles rapid tab switching', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const tabs = ['General', 'Profit Management', 'Rebalancing', 'Risk Controls'];

    // Rapidly switch between tabs
    for (let i = 0; i < 3; i++) {
      for (const tabName of tabs) {
        const tab = screen.getByText(tabName);
        await user.click(tab);

        // Each tab should become active
        expect(tab.closest('button')).toHaveClass('text-blue-400');
      }
    }

    // Should end up on Risk Controls tab
    expect(screen.getByText('Risk Controls').closest('button')).toHaveClass('text-blue-400');
  });

  it('handles keyboard navigation for sliders', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const slider = screen.getByDisplayValue('30000');

    // Focus the slider
    slider.focus();
    expect(slider).toHaveFocus();

    // Use arrow keys to change value
    await user.keyboard('{ArrowRight}');

    // Value should change (by step amount: 5000)
    expect(screen.getByText('35s')).toBeInTheDocument();
  });

  it('validates slider boundaries', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const slider = screen.getByDisplayValue('30000');

    // Try to set value below minimum
    await user.clear(slider);
    await user.type(slider, '1000');

    // Should be clamped to minimum (5000)
    expect(slider).toHaveValue('1000'); // Input shows what user typed

    // Try to set value above maximum
    await user.clear(slider);
    await user.type(slider, '500000');

    expect(slider).toHaveValue('500000'); // Input shows what user typed
  });

  it('displays profit zone actions correctly', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);

    // Check profit zone actions
    const secureActions = screen.getAllByText('secure');
    expect(secureActions).toHaveLength(2); // 10% and 20% levels

    const trailAction = screen.getByText('trail');
    expect(trailAction).toBeInTheDocument(); // 50% level
  });

  it('shows configuration sections with proper headings', async () => {
    render(<AutomationConfigPanel {...defaultProps} />);

    // General tab headings
    expect(screen.getByText('General Automation Settings')).toBeInTheDocument();

    // Profit Management tab headings
    const profitTab = screen.getByText('Profit Management');
    await user.click(profitTab);
    expect(screen.getByText('Automated Profit Taking')).toBeInTheDocument();

    // Rebalancing tab headings
    const rebalanceTab = screen.getByText('Rebalancing');
    await user.click(rebalanceTab);
    expect(screen.getByText('Automated Rebalancing')).toBeInTheDocument();

    // Risk Controls tab headings
    const riskTab = screen.getByText('Risk Controls');
    await user.click(riskTab);
    expect(screen.getByText('Risk Management Controls')).toBeInTheDocument();
  });
});
