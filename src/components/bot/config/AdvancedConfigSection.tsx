import React from 'react';
import { Brain, Settings, Sparkles } from 'lucide-react';
import { LROConfig, BotStatus, MarketConditions } from '../../../types/bot';
import ConfigurationSection from '../../common/ConfigurationSection';
import ConfigInput from '../../common/ConfigInput';

interface AdvancedConfigSectionProps {
  config: LROConfig;
  onConfigChange: (key: keyof LROConfig, value: unknown) => void;
  botStatus: BotStatus;
  marketConditions: MarketConditions | null;
  updateAccountBalance: (balance: number) => void;
}

export const AdvancedConfigSection: React.FC<AdvancedConfigSectionProps> = ({
  config,
  onConfigChange,
  botStatus,
  marketConditions,
  updateAccountBalance,
}) => {
  return (
    <div className="space-y-6">
      <ConfigurationSection
        title="Intelligent Adaptation"
        description="AI-powered market adaptation settings"
        icon={Brain}
        iconColor="text-purple-400"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="adaptive_enabled"
              checked={config.adaptive_enabled}
              onChange={e => onConfigChange('adaptive_enabled', e.target.checked)}
              className="form-checkbox h-4 w-4 text-purple-500 rounded focus:ring-purple-500 focus:ring-offset-2"
            />
            <label htmlFor="adaptive_enabled" className="text-sm font-medium text-theme-primary">
              Enable Adaptive Parameters
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="auto_strategy"
              checked={config.auto_strategy_enabled}
              onChange={e => onConfigChange('auto_strategy_enabled', e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-2"
            />
            <label htmlFor="auto_strategy" className="text-sm font-medium text-theme-primary">
              Automatic Strategy Selection
            </label>
          </div>

          {config.auto_strategy_enabled && (
            <ConfigInput
              label="Market Adaptation Level"
              type="select"
              value={config.market_adaptation_level}
              onChange={value => onConfigChange('market_adaptation_level', value)}
              options={['Conservative', 'Moderate', 'Aggressive']}
              tooltip="How aggressively the bot adapts to market conditions"
            />
          )}

          {marketConditions && (
            <div className="mt-4 p-4 bg-theme-surface rounded-lg border border-theme-border">
              <h4 className="text-sm font-medium text-theme-primary mb-2">
                Current Market Analysis
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-theme-secondary">Volatility:</span>
                  <span className="ml-2 font-mono text-theme-primary">
                    {(marketConditions.volatility * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-theme-secondary">Trend:</span>
                  <span className="ml-2 font-mono text-theme-primary">
                    {(marketConditions.trend_strength * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-theme-secondary">Volume:</span>
                  <span className="ml-2 font-mono text-theme-primary">
                    {(marketConditions.volume_profile * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-theme-secondary">Regime:</span>
                  <span className="ml-2 font-semibold text-primary-400">
                    {marketConditions.market_regime}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ConfigurationSection>

      <ConfigurationSection
        title="Auto-Resume Settings"
        description="Configure automatic bot resumption after pauses"
        icon={Settings}
        iconColor="text-green-400"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="auto_resume"
              checked={config.auto_resume_enabled ?? true}
              onChange={e => onConfigChange('auto_resume_enabled', e.target.checked)}
              className="form-checkbox h-4 w-4 text-green-500 rounded focus:ring-green-500 focus:ring-offset-2"
            />
            <label htmlFor="auto_resume" className="text-sm font-medium text-theme-primary">
              Enable Auto-Resume
            </label>
          </div>

          {(config.auto_resume_enabled ?? true) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-7">
              <ConfigInput
                label="Volatility Threshold Multiplier"
                type="number"
                value={config.volatility_resume_threshold_multiplier ?? 0.8}
                onChange={value =>
                  onConfigChange('volatility_resume_threshold_multiplier', Number(value))
                }
                min={0.1}
                max={1.5}
                step={0.1}
                tooltip="Multiplier for volatility threshold (0.8 = resume at 80% of pause level)"
              />

              <ConfigInput
                label="Data Quality Resume Delay (min)"
                type="number"
                value={config.data_quality_resume_delay_minutes ?? 2}
                onChange={value =>
                  onConfigChange('data_quality_resume_delay_minutes', Number(value))
                }
                min={1}
                max={30}
                tooltip="Minutes to wait before resuming after data quality issues"
              />

              <ConfigInput
                label="Connection Resume Delay (min)"
                type="number"
                value={config.connection_resume_delay_minutes ?? 3}
                onChange={value => onConfigChange('connection_resume_delay_minutes', Number(value))}
                min={1}
                max={60}
                tooltip="Minutes to wait before resuming after connection issues"
              />

              <ConfigInput
                label="Flash Crash Resume Delay (min)"
                type="number"
                value={config.flash_crash_resume_delay_minutes ?? 10}
                onChange={value =>
                  onConfigChange('flash_crash_resume_delay_minutes', Number(value))
                }
                min={5}
                max={180}
                tooltip="Minutes to wait before resuming after flash crash detection"
              />

              <ConfigInput
                label="Max Auto-Pause Duration (hours)"
                type="number"
                value={config.max_auto_pause_duration_hours ?? 2}
                onChange={value => onConfigChange('max_auto_pause_duration_hours', Number(value))}
                min={1}
                max={24}
                tooltip="Maximum hours bot can be auto-paused before requiring manual intervention"
              />
            </div>
          )}
        </div>
      </ConfigurationSection>

      <ConfigurationSection
        title="Paper Trading"
        description="Virtual trading settings for testing"
        icon={Sparkles}
        iconColor="text-blue-400"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="paper_trading"
              checked={config.paper_trading_enabled}
              onChange={e => onConfigChange('paper_trading_enabled', e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-2"
            />
            <label htmlFor="paper_trading" className="text-sm font-medium text-theme-primary">
              Enable Paper Trading Mode
            </label>
          </div>

          {config.paper_trading_enabled && (
            <div className="ml-7">
              <ConfigInput
                label="Virtual Balance ($)"
                type="number"
                value={config.virtual_balance}
                onChange={value => {
                  const newBalance = Number(value);
                  onConfigChange('virtual_balance', newBalance);
                  updateAccountBalance(newBalance);
                }}
                min={100}
                max={100000}
                tooltip="Starting balance for paper trading"
              />

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-400 mb-1">Paper Trading Active</div>
                    <div className="text-theme-secondary">
                      Current Balance:{' '}
                      <span className="font-mono text-theme-primary">
                        ${botStatus?.account_balance?.toLocaleString() || 'Loading...'}
                      </span>
                    </div>
                    <div className="text-xs text-theme-muted mt-1">
                      No real money is being traded. All positions are simulated.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!config.paper_trading_enabled && (
            <div className="ml-7 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-red-400 mb-1">Live Trading Mode</div>
                  <div className="text-theme-secondary">
                    Real money trading is enabled. Ensure all settings are correct.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ConfigurationSection>
    </div>
  );
};
