import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, Zap, Brain, Settings, Sparkles, AlertTriangle } from 'lucide-react';
import { safeInvoke } from '../../utils/tauri';
import { LROConfig, BotStatus, MarketConditions } from '../../types/bot';
import ConfigurationSection from '../common/ConfigurationSection';
import ConfigInput from '../common/ConfigInput';
import Tooltip from '../common/Tooltip';
import PresetSelector from './PresetSelector';

interface ImprovedBotConfigFormProps {
  config: LROConfig;
  setConfig: (config: LROConfig) => void;
  botStatus: BotStatus;
  marketConditions: MarketConditions | null;
  updateAccountBalance: (balance: number) => void;
}

const ImprovedBotConfigForm: React.FC<ImprovedBotConfigFormProps> = ({
  config,
  setConfig,
  botStatus,
  marketConditions,
  updateAccountBalance
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'safety'>('basic');

  const handleConfigChange = (key: keyof LROConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    // Auto-save to backend
    safeInvoke('update_bot_config', { config: newConfig }).catch(console.error);
  };

  const handlePresetSelect = (presetConfig: Partial<LROConfig>) => {
    const newConfig = { ...config, ...presetConfig };
    setConfig(newConfig);
    safeInvoke('update_bot_config', { config: newConfig }).catch(console.error);
  };

  const calculateRiskScore = (): { score: number; level: string; color: string } => {
    let score = 0;
    
    // Risk factors
    if (config.stop_loss_percent < 2) score += 30;
    else if (config.stop_loss_percent < 3) score += 20;
    else if (config.stop_loss_percent < 5) score += 10;
    
    if (config.max_position_size > 2000) score += 25;
    else if (config.max_position_size > 1000) score += 15;
    else if (config.max_position_size > 500) score += 5;
    
    if (config.max_daily_loss > 200) score += 20;
    else if (config.max_daily_loss > 100) score += 10;
    
    if (!config.paper_trading_enabled) score += 15;
    if (!config.circuit_breaker_enabled) score += 10;
    if (config.signal_strength_threshold < 0.5) score += 10;
    
    let level = 'Low';
    let color = 'text-green-400';
    
    if (score > 60) {
      level = 'High';
      color = 'text-red-400';
    } else if (score > 30) {
      level = 'Medium';
      color = 'text-yellow-400';
    }
    
    return { score, level, color };
  };

  const riskAssessment = calculateRiskScore();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-morphic p-6 space-y-6"
    >
      {/* Header with Preset Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Strategy Configuration</h3>
          <p className="text-white/60 text-sm">
            Configure your trading bot's behavior and risk management settings
          </p>
        </div>
        <button
          onClick={() => setShowPresets(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>Use Preset</span>
        </button>
      </div>

      {/* Risk Assessment */}
      <div className="p-4 glass-card rounded-lg border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">Current Risk Level</h4>
            <p className="text-white/60 text-sm">Based on your configuration settings</p>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${riskAssessment.color}`}>
              {riskAssessment.level}
            </div>
            <div className="text-white/40 text-sm">Risk Score: {riskAssessment.score}</div>
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      <div className="border-b border-white/20">
        <nav className="flex space-x-8">
          {[
            { id: 'basic', label: 'Basic Settings', icon: Settings },
            { id: 'advanced', label: 'Advanced', icon: Brain },
            { id: 'safety', label: 'Safety & Risk', icon: Shield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-white/60 hover:text-white/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Basic Settings Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <ConfigurationSection
            title="Trading Strategy"
            description="Core parameters that define how your bot identifies trading opportunities"
            icon={Target}
            iconColor="text-blue-400"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ConfigInput
                label="Analysis Period"
                value={config.period}
                onChange={(value) => handleConfigChange('period', value)}
                type="number"
                min={5}
                max={100}
                tooltip="Number of price bars to analyze for trend detection. Lower values = more sensitive to short-term changes."
                description="How many candles to look back for analysis"
                recommendation="20-30 for swing trading, 10-15 for scalping"
                validation={{ min: 5, max: 100, required: true }}
              />

              <ConfigInput
                label="Signal Period"
                value={config.signal_period}
                onChange={(value) => handleConfigChange('signal_period', value)}
                type="number"
                min={3}
                max={50}
                tooltip="Smoothing period for trading signals. Lower values generate more signals but with more noise."
                description="Signal smoothing period"
                recommendation="Half of your analysis period works well"
                validation={{ min: 3, max: 50, required: true }}
              />

              <ConfigInput
                label="Take Profit"
                value={config.take_profit_percent}
                onChange={(value) => handleConfigChange('take_profit_percent', value)}
                type="number"
                step={0.1}
                min={0.1}
                max={20}
                unit="%"
                tooltip="Percentage profit target before automatically closing profitable positions."
                description="Target profit percentage per trade"
                recommendation="2-3x your stop loss for good risk/reward ratio"
                validation={{ min: 0.1, max: 20, required: true }}
              />

              <ConfigInput
                label="Stop Loss"
                value={config.stop_loss_percent}
                onChange={(value) => handleConfigChange('stop_loss_percent', value)}
                type="number"
                step={0.1}
                min={0.1}
                max={10}
                unit="%"
                tooltip="Maximum loss percentage before automatically closing losing positions."
                description="Maximum loss per trade"
                recommendation="2-5% for most strategies"
                validation={{ min: 0.1, max: 10, required: true }}
              />

              <ConfigInput
                label="Position Size"
                value={config.max_position_size}
                onChange={(value) => handleConfigChange('max_position_size', value)}
                type="number"
                min={100}
                max={10000}
                unit="$"
                tooltip="Maximum dollar amount to risk per trade. This helps limit exposure on any single position."
                description="Max investment per trade"
                recommendation="5-10% of your total trading capital"
                validation={{ min: 100, max: 10000, required: true }}
              />

              <ConfigInput
                label="Daily Loss Limit"
                value={config.max_daily_loss}
                onChange={(value) => handleConfigChange('max_daily_loss', value)}
                type="number"
                min={10}
                max={1000}
                unit="$"
                tooltip="Bot will stop trading for the day if this loss amount is reached."
                description="Maximum daily loss before stopping"
                recommendation="1-3% of your total account balance"
                validation={{ min: 10, max: 1000, required: true }}
              />
            </div>
          </ConfigurationSection>

          {/* Paper Trading Section */}
          <ConfigurationSection
            title="Paper Trading Mode"
            description="Test your strategy with virtual money before risking real capital"
            icon={Target}
            iconColor="text-green-400"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                <div>
                  <div className="text-white font-medium">Enable Paper Trading</div>
                  <div className="text-white/60 text-sm mt-1">
                    Highly recommended for testing new strategies safely
                  </div>
                </div>
                <button
                  onClick={() => handleConfigChange('paper_trading_enabled', !config.paper_trading_enabled)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors ${
                    config.paper_trading_enabled ? 'bg-green-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      config.paper_trading_enabled ? 'transform translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>

              {config.paper_trading_enabled && (
                <ConfigInput
                  label="Virtual Balance"
                  value={config.virtual_balance}
                  onChange={(value) => handleConfigChange('virtual_balance', value)}
                  type="number"
                  min={1000}
                  max={1000000}
                  unit="$"
                  description="Starting balance for paper trading simulation"
                  recommendation="Use an amount similar to your real trading capital"
                  validation={{ min: 1000, max: 1000000, required: true }}
                />
              )}

              {!config.paper_trading_enabled && (
                <div className="p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-orange-400 font-medium">Live Trading Mode Active</div>
                      <div className="text-orange-300/80 text-sm mt-1">
                        Bot will execute trades with real money. Make sure you've tested your strategy thoroughly in paper trading mode first.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ConfigurationSection>
        </div>
      )}

      {/* Advanced Settings Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <ConfigurationSection
            title="Advanced Signal Parameters"
            description="Fine-tune signal detection and filtering"
            icon={Brain}
            iconColor="text-purple-400"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ConfigInput
                label="Overbought Level"
                value={config.overbought}
                onChange={(value) => handleConfigChange('overbought', value)}
                type="number"
                step={0.1}
                min={0.1}
                max={1.0}
                tooltip="Threshold for identifying overbought conditions. Higher values = less sensitive."
                description="Upper signal threshold"
                validation={{ min: 0.1, max: 1.0, required: true }}
              />

              <ConfigInput
                label="Oversold Level"
                value={config.oversold}
                onChange={(value) => handleConfigChange('oversold', value)}
                type="number"
                step={0.1}
                min={-1.0}
                max={-0.1}
                tooltip="Threshold for identifying oversold conditions. More negative values = less sensitive."
                description="Lower signal threshold"
                validation={{ min: -1.0, max: -0.1, required: true }}
              />

              <ConfigInput
                label="Minimum Swing Bars"
                value={config.min_swing_bars}
                onChange={(value) => handleConfigChange('min_swing_bars', value)}
                type="number"
                min={1}
                max={20}
                tooltip="Minimum number of bars required to confirm a swing high/low."
                description="Swing confirmation period"
                validation={{ min: 1, max: 20, required: true }}
              />

              <ConfigInput
                label="Signal Strength Threshold"
                value={config.signal_strength_threshold}
                onChange={(value) => handleConfigChange('signal_strength_threshold', value)}
                type="number"
                step={0.1}
                min={0.1}
                max={1.0}
                tooltip="Minimum signal strength required to place trades. Higher values = fewer but higher quality trades."
                description="Quality filter for signals"
                recommendation="0.6-0.7 for balanced approach"
                validation={{ min: 0.1, max: 1.0, required: true }}
              />

              <ConfigInput
                label="Max Position Hold"
                value={config.max_position_hold_hours}
                onChange={(value) => handleConfigChange('max_position_hold_hours', value)}
                type="number"
                min={1}
                max={168}
                unit="hours"
                tooltip="Automatically close positions after this time to limit exposure."
                description="Maximum time to hold positions"
                validation={{ min: 1, max: 168, required: true }}
              />
            </div>
          </ConfigurationSection>

          {/* Adaptive Settings */}
          <ConfigurationSection
            title="Adaptive Strategy"
            description="Automatically adjust parameters based on market conditions"
            icon={Zap}
            iconColor="text-blue-400"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                <div>
                  <div className="text-white font-medium flex items-center space-x-2">
                    <span>Enable Auto-Strategy</span>
                    <Tooltip content="Automatically adapts bot parameters based on real-time market conditions like volatility and trend strength." />
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    Dynamically optimize settings for current market conditions
                  </div>
                </div>
                <button
                  onClick={() => handleConfigChange('auto_strategy_enabled', !config.auto_strategy_enabled)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors ${
                    config.auto_strategy_enabled ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      config.auto_strategy_enabled ? 'transform translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>

              {config.auto_strategy_enabled && (
                <>
                  {/* Market Conditions Display */}
                  {marketConditions && (
                    <div className="mb-4 p-4 glass-card rounded-lg">
                      <div className="text-white/80 text-sm mb-3">Current Market Conditions</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center">
                          <div className="text-xs text-white/60 mb-1">Volatility</div>
                          <div className="text-sm font-bold text-white">{(marketConditions.volatility * 100).toFixed(1)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-white/60 mb-1">Trend</div>
                          <div className="text-sm font-bold text-white">{(marketConditions.trend_strength * 100).toFixed(1)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-white/60 mb-1">Volume</div>
                          <div className="text-sm font-bold text-white">{(marketConditions.volume_profile * 100).toFixed(1)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-white/60 mb-1">Regime</div>
                          <div className={`text-xs font-bold px-2 py-1 rounded ${
                            marketConditions.market_regime === 'Bull' ? 'bg-green-500/20 text-green-400' :
                            marketConditions.market_regime === 'Bear' ? 'bg-red-500/20 text-red-400' :
                            marketConditions.market_regime === 'Volatile' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {marketConditions.market_regime}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['Conservative', 'Moderate', 'Aggressive'].map((level) => (
                    <button
                      key={level}
                      onClick={() => handleConfigChange('market_adaptation_level', level)}
                      className={`p-4 rounded-lg border transition-colors ${
                        config.market_adaptation_level === level
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'border-white/20 text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="text-sm font-medium">{level}</div>
                      <div className="text-xs mt-1 opacity-80">
                        {level === 'Conservative' && 'Small, careful adjustments'}
                        {level === 'Moderate' && 'Balanced adaptation'}
                        {level === 'Aggressive' && 'Large, rapid adjustments'}
                      </div>
                    </button>
                  ))}
                  </div>
                </>
              )}

              {/* Trailing Stop */}
              <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                <div>
                  <div className="text-white font-medium flex items-center space-x-2">
                    <span>Trailing Stop Loss</span>
                    <Tooltip content="Automatically adjusts stop loss upward as position becomes profitable, locking in gains while allowing for further upside." />
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    Lock in profits as trades move in your favor
                  </div>
                </div>
                <button
                  onClick={() => handleConfigChange('trailing_stop_enabled', !config.trailing_stop_enabled)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors ${
                    config.trailing_stop_enabled ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      config.trailing_stop_enabled ? 'transform translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>

              {config.trailing_stop_enabled && (
                <ConfigInput
                  label="Trailing Stop Distance"
                  value={config.trailing_stop_percent}
                  onChange={(value) => handleConfigChange('trailing_stop_percent', value)}
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={5.0}
                  unit="%"
                  tooltip="How far below the highest profit point to set the trailing stop."
                  description="Distance for trailing stop"
                  validation={{ min: 0.1, max: 5.0, required: true }}
                />
              )}
            </div>
          </ConfigurationSection>
        </div>
      )}

      {/* Safety & Risk Tab */}
      {activeTab === 'safety' && (
        <div className="space-y-6">
          <ConfigurationSection
            title="Safety Controls"
            description="Emergency stops and risk management tools"
            icon={Shield}
            iconColor="text-red-400"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                  <div>
                    <div className="text-white font-medium">Emergency Stop</div>
                    <div className="text-white/60 text-sm mt-1">
                      Manual emergency stop capability
                    </div>
                  </div>
                  <button
                    onClick={() => handleConfigChange('emergency_stop_enabled', !config.emergency_stop_enabled)}
                    className={`w-14 h-7 rounded-full p-1 transition-colors ${
                      config.emergency_stop_enabled ? 'bg-red-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        config.emergency_stop_enabled ? 'transform translate-x-7' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                  <div>
                    <div className="text-white font-medium">Circuit Breaker</div>
                    <div className="text-white/60 text-sm mt-1">
                      Auto-halt on loss thresholds
                    </div>
                  </div>
                  <button
                    onClick={() => handleConfigChange('circuit_breaker_enabled', !config.circuit_breaker_enabled)}
                    className={`w-14 h-7 rounded-full p-1 transition-colors ${
                      config.circuit_breaker_enabled ? 'bg-red-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        config.circuit_breaker_enabled ? 'transform translate-x-7' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              <ConfigInput
                label="Account Balance"
                value={botStatus?.account_balance || 10000}
                onChange={(value) => updateAccountBalance(value as number)}
                type="number"
                min={100}
                max={1000000}
                unit="$"
                tooltip="Your total trading account balance used for position sizing calculations."
                description="Total account balance for calculations"
                validation={{ min: 100, max: 1000000, required: true }}
              />
            </div>
          </ConfigurationSection>

          {/* Safety Status */}
          <ConfigurationSection
            title="Current Safety Status"
            description="Monitor your risk exposure and safety metrics"
            icon={Target}
            iconColor="text-green-400"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 text-center">
                <div className="text-white/60 text-sm mb-1">Daily Loss</div>
                <div className={`text-lg font-bold ${
                  botStatus.current_daily_loss > config.max_daily_loss * 0.8 ? 'text-red-400' : 'text-white'
                }`}>
                  ${botStatus.current_daily_loss.toFixed(2)}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Limit: ${config.max_daily_loss}
                </div>
              </div>
              
              <div className="glass-card p-4 text-center">
                <div className="text-white/60 text-sm mb-1">Risk Exposure</div>
                <div className="text-lg font-bold text-white">
                  {((config.max_position_size / (botStatus?.account_balance || 10000)) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Per trade
                </div>
              </div>
              
              <div className="glass-card p-4 text-center">
                <div className="text-white/60 text-sm mb-1">Circuit Breaks</div>
                <div className={`text-lg font-bold ${
                  botStatus.circuit_breaker_count > 0 ? 'text-orange-400' : 'text-white'
                }`}>
                  {botStatus.circuit_breaker_count}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Today
                </div>
              </div>
              
              <div className="glass-card p-4 text-center">
                <div className="text-white/60 text-sm mb-1">Auto-Closed</div>
                <div className={`text-lg font-bold ${
                  botStatus.positions_auto_closed > 0 ? 'text-blue-400' : 'text-white'
                }`}>
                  {botStatus.positions_auto_closed}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Positions
                </div>
              </div>
            </div>
          </ConfigurationSection>
        </div>
      )}

      {/* Preset Selector Modal */}
      <PresetSelector
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
        onSelectPreset={handlePresetSelect}
      />
    </motion.div>
  );
};

export default ImprovedBotConfigForm;