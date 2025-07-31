import React from 'react';
import { Target, Zap } from 'lucide-react';
import { LROConfig } from '../../../types/bot';
import ConfigurationSection from '../../common/ConfigurationSection';
import ConfigInput from '../../common/ConfigInput';
import Tooltip from '../../common/Tooltip';

interface BasicConfigSectionProps {
  config: LROConfig;
  onConfigChange: (key: keyof LROConfig, value: unknown) => void;
}

export const BasicConfigSection: React.FC<BasicConfigSectionProps> = ({
  config,
  onConfigChange,
}) => {
  return (
    <div className="space-y-6">
      <ConfigurationSection
        title="Market Analysis"
        description="Core settings for the LRO trading algorithm"
        icon={Target}
        iconColor="text-blue-400"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ConfigInput
            label="Timeframe"
            type="select"
            value={config.timeframe}
            onChange={value => onConfigChange('timeframe', value)}
            options={['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d']}
            tooltip="Chart timeframe for analysis. Lower timeframes = more signals, higher noise."
          />

          <ConfigInput
            label="Period"
            type="number"
            value={config.period}
            onChange={value => onConfigChange('period', Number(value))}
            min={5}
            max={200}
            tooltip="Number of bars to calculate LRO. Higher = smoother but slower signals."
          />

          <ConfigInput
            label="Signal Period"
            type="number"
            value={config.signal_period}
            onChange={value => onConfigChange('signal_period', Number(value))}
            min={3}
            max={50}
            tooltip="Smoothing period for signal line. Lower = more sensitive signals."
          />
        </div>
      </ConfigurationSection>

      <ConfigurationSection
        title="Signal Thresholds"
        description="Configure when buy/sell signals are generated"
        icon={Zap}
        iconColor="text-yellow-400"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <ConfigInput
              label="Overbought Level"
              type="number"
              value={config.overbought}
              onChange={value => onConfigChange('overbought', Number(value))}
              min={0.5}
              max={1.0}
              step={0.1}
              tooltip="LRO level above which market is considered overbought (sell signal)"
            />
            <div className="mt-2 text-xs text-theme-secondary">
              Current: {config.overbought} (Higher = less sensitive sells)
            </div>
          </div>

          <div>
            <ConfigInput
              label="Oversold Level"
              type="number"
              value={config.oversold}
              onChange={value => onConfigChange('oversold', Number(value))}
              min={-1.0}
              max={-0.5}
              step={0.1}
              tooltip="LRO level below which market is considered oversold (buy signal)"
            />
            <div className="mt-2 text-xs text-theme-secondary">
              Current: {config.oversold} (Lower = less sensitive buys)
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ConfigInput
            label="Minimum Swing Bars"
            type="number"
            value={config.min_swing_bars}
            onChange={value => onConfigChange('min_swing_bars', Number(value))}
            min={2}
            max={20}
            tooltip="Minimum bars between signals to avoid noise"
          />
        </div>
      </ConfigurationSection>
    </div>
  );
};
