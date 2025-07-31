import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { LROConfig } from '../../../types/bot';
import ConfigurationSection from '../../common/ConfigurationSection';
import ConfigInput from '../../common/ConfigInput';

interface RiskManagementSectionProps {
  config: LROConfig;
  onConfigChange: (key: keyof LROConfig, value: unknown) => void;
}

export const RiskManagementSection: React.FC<RiskManagementSectionProps> = ({
  config,
  onConfigChange,
}) => {
  return (
    <div className="space-y-6">
      <ConfigurationSection
        title="Position Management"
        description="Control position sizing and risk limits"
        icon={Shield}
        iconColor="text-green-400"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ConfigInput
            label="Stop Loss %"
            type="number"
            value={config.stop_loss_percent}
            onChange={value => onConfigChange('stop_loss_percent', Number(value))}
            min={0.1}
            max={10.0}
            step={0.1}
            tooltip="Maximum loss percentage before position is closed"
          />

          <ConfigInput
            label="Take Profit %"
            type="number"
            value={config.take_profit_percent}
            onChange={value => onConfigChange('take_profit_percent', Number(value))}
            min={0.1}
            max={20.0}
            step={0.1}
            tooltip="Target profit percentage to close position"
          />

          <ConfigInput
            label="Max Position Size ($)"
            type="number"
            value={config.max_position_size}
            onChange={value => onConfigChange('max_position_size', Number(value))}
            min={10}
            max={10000}
            tooltip="Maximum dollar amount per position"
          />

          <ConfigInput
            label="Max Daily Loss ($)"
            type="number"
            value={config.max_daily_loss}
            onChange={value => onConfigChange('max_daily_loss', Number(value))}
            min={10}
            max={1000}
            tooltip="Maximum total loss allowed per day before stopping"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="trailing_stop"
              checked={config.trailing_stop_enabled}
              onChange={e => onConfigChange('trailing_stop_enabled', e.target.checked)}
              className="form-checkbox h-4 w-4 text-primary-500 rounded focus:ring-primary-500 focus:ring-offset-2"
            />
            <label htmlFor="trailing_stop" className="text-sm font-medium text-theme-primary">
              Enable Trailing Stop
            </label>
          </div>

          {config.trailing_stop_enabled && (
            <ConfigInput
              label="Trailing Stop %"
              type="number"
              value={config.trailing_stop_percent}
              onChange={value => onConfigChange('trailing_stop_percent', Number(value))}
              min={0.1}
              max={5.0}
              step={0.1}
              tooltip="Percentage below peak price to trail stop loss"
            />
          )}
        </div>
      </ConfigurationSection>

      <ConfigurationSection
        title="Safety Controls"
        description="Emergency and circuit breaker settings"
        icon={AlertTriangle}
        iconColor="text-red-400"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="emergency_stop"
              checked={config.emergency_stop_enabled}
              onChange={e => onConfigChange('emergency_stop_enabled', e.target.checked)}
              className="form-checkbox h-4 w-4 text-red-500 rounded focus:ring-red-500 focus:ring-offset-2"
            />
            <label htmlFor="emergency_stop" className="text-sm font-medium text-theme-primary">
              Emergency Stop Protection
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="circuit_breaker"
              checked={config.circuit_breaker_enabled}
              onChange={e => onConfigChange('circuit_breaker_enabled', e.target.checked)}
              className="form-checkbox h-4 w-4 text-orange-500 rounded focus:ring-orange-500 focus:ring-offset-2"
            />
            <label htmlFor="circuit_breaker" className="text-sm font-medium text-theme-primary">
              Circuit Breaker
            </label>
          </div>

          <ConfigInput
            label="Max Position Hold (Hours)"
            type="number"
            value={config.max_position_hold_hours}
            onChange={value => onConfigChange('max_position_hold_hours', Number(value))}
            min={1}
            max={168}
            tooltip="Maximum hours to hold a position before auto-close"
          />

          <ConfigInput
            label="Signal Strength Threshold"
            type="number"
            value={config.signal_strength_threshold}
            onChange={value => onConfigChange('signal_strength_threshold', Number(value))}
            min={0.1}
            max={1.0}
            step={0.1}
            tooltip="Minimum signal strength required to open position"
          />
        </div>
      </ConfigurationSection>
    </div>
  );
};
