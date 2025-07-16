import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { LROConfig, BotStatus, MarketConditions } from '../../types/bot';

interface BotConfigFormProps {
  config: LROConfig;
  setConfig: (config: LROConfig) => void;
  botStatus: BotStatus;
  marketConditions: MarketConditions | null;
  updateAccountBalance: (balance: number) => void;
  applyStrategyPreset: (preset: 'scalping' | 'swing' | 'trend' | 'range') => void;
}

export const BotConfigForm: React.FC<BotConfigFormProps> = ({
  config,
  setConfig,
  botStatus,
  marketConditions,
  updateAccountBalance,
  applyStrategyPreset
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-morphic p-6"
    >
      <h3 className="text-xl font-bold text-white mb-4">Strategy Configuration</h3>
      
      {/* Basic Strategy Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">LRO Period</label>
          <input
            type="number"
            value={config.period}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 5 && value <= 100) {
                setConfig({...config, period: value});
              }
            }}
            className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            min="5"
            max="100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Signal Period</label>
          <input
            type="number"
            value={config.signal_period}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 3 && value <= 50) {
                setConfig({...config, signal_period: value});
              }
            }}
            className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            min="3"
            max="50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Overbought Level</label>
          <input
            type="number"
            step="0.1"
            value={config.overbought}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0.1 && value <= 1.0) {
                setConfig({...config, overbought: value});
              }
            }}
            className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            min="0.1"
            max="1.0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Oversold Level</label>
          <input
            type="number"
            step="0.1"
            value={config.oversold}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= -1.0 && value <= -0.1) {
                setConfig({...config, oversold: value});
              }
            }}
            className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            min="-1.0"
            max="-0.1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Min Swing Bars</label>
          <input
            type="number"
            value={config.min_swing_bars}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 1 && value <= 20) {
                setConfig({...config, min_swing_bars: value});
              }
            }}
            className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            min="1"
            max="20"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-white/80">Adaptive Thresholds</label>
          <button
            onClick={() => setConfig({...config, adaptive_enabled: !config.adaptive_enabled})}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              config.adaptive_enabled ? 'bg-blue-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transition-transform ${
                config.adaptive_enabled ? 'transform translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Risk Management Section */}
      <div className="mt-8">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-purple-400" />
          <h4 className="text-lg font-bold text-white">Risk Management</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Stop Loss %</label>
            <input
              type="number"
              step="0.1"
              value={config.stop_loss_percent}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.1 && value <= 10.0) {
                  setConfig({...config, stop_loss_percent: value});
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg"
              min="0.1"
              max="10.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Take Profit %</label>
            <input
              type="number"
              step="0.1"
              value={config.take_profit_percent}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.1 && value <= 20.0) {
                  setConfig({...config, take_profit_percent: value});
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg"
              min="0.1"
              max="20.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Max Position Size ($)</label>
            <input
              type="number"
              value={config.max_position_size}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 100 && value <= 10000) {
                  setConfig({...config, max_position_size: value});
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg"
              min="100"
              max="10000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Max Daily Loss ($)</label>
            <input
              type="number"
              value={config.max_daily_loss}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 10 && value <= 1000) {
                  setConfig({...config, max_daily_loss: value});
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg"
              min="10"
              max="1000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Trailing Stop %</label>
            <input
              type="number"
              step="0.1"
              value={config.trailing_stop_percent}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.1 && value <= 5.0) {
                  setConfig({...config, trailing_stop_percent: value});
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg"
              min="0.1"
              max="5.0"
              disabled={!config.trailing_stop_enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white/80">Trailing Stop</label>
            <button
              onClick={() => setConfig({...config, trailing_stop_enabled: !config.trailing_stop_enabled})}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                config.trailing_stop_enabled ? 'bg-purple-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  config.trailing_stop_enabled ? 'transform translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Paper Trading Section */}
      <div className="mt-8">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="w-5 h-5 text-blue-400" />
          <h4 className="text-lg font-bold text-white">Paper Trading</h4>
        </div>
        
        <div className="space-y-4">
          {/* Paper Trading Toggle */}
          <div className="flex items-center justify-between p-4 glass-card rounded-lg">
            <div>
              <div className="text-white font-medium">Enable Paper Trading</div>
              <div className="text-white/60 text-sm mt-1">
                Trade with virtual money to test strategies safely
              </div>
            </div>
            <button
              onClick={() => setConfig({...config, paper_trading_enabled: !config.paper_trading_enabled})}
              className={`w-14 h-7 rounded-full p-1 transition-colors ${
                config.paper_trading_enabled ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.paper_trading_enabled ? 'transform translate-x-7' : ''
                }`}
              />
            </button>
          </div>

          {/* Virtual Balance */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Virtual Balance ($)</label>
            <input
              type="number"
              value={config.virtual_balance}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1000 && value <= 1000000) {
                  setConfig({...config, virtual_balance: value});
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
              min="1000"
              max="1000000"
              disabled={!config.paper_trading_enabled}
            />
            <div className="text-xs text-white/40 mt-1">
              Starting balance for paper trading simulation
            </div>
          </div>

          {/* Paper Trading Warning */}
          {!config.paper_trading_enabled && (
            <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-orange-400 font-medium text-sm">Live Trading Mode</div>
                  <div className="text-orange-300/80 text-xs mt-1">
                    Bot will execute trades with real money. Ensure proper risk management settings.
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.paper_trading_enabled && (
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <Target className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-blue-400 font-medium text-sm">Paper Trading Mode</div>
                  <div className="text-blue-300/80 text-xs mt-1">
                    All trades are simulated. Perfect for testing strategies without financial risk.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automatic Strategy Section */}
      <div className="mt-8">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-blue-400" />
          <h4 className="text-lg font-bold text-white">Automatic Strategy</h4>
        </div>
        
        <div className="space-y-4">
          {/* Auto Strategy Toggle */}
          <div className="flex items-center justify-between p-4 glass-card rounded-lg">
            <div>
              <div className="text-white font-medium">Enable Auto-Strategy</div>
              <div className="text-white/60 text-sm mt-1">
                Automatically adapts bot parameters based on real-time market conditions
              </div>
            </div>
            <button
              onClick={() => {
                const newConfig = {...config, auto_strategy_enabled: !config.auto_strategy_enabled};
                setConfig(newConfig);
                // Immediately sync to backend to prevent reversion
                invoke('update_bot_config', { config: newConfig }).catch(console.error);
              }}
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

          {/* Adaptation Level */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['Conservative', 'Moderate', 'Aggressive'].map((level) => (
              <button
                key={level}
                onClick={() => {
                  const newConfig = {...config, market_adaptation_level: level as any};
                  setConfig(newConfig);
                  // Immediately sync to backend to prevent reversion
                  invoke('update_bot_config', { config: newConfig }).catch(console.error);
                }}
                disabled={!config.auto_strategy_enabled}
                className={`p-3 rounded-lg border transition-colors ${
                  config.market_adaptation_level === level && config.auto_strategy_enabled
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : config.auto_strategy_enabled
                    ? 'border-white/20 text-white hover:bg-white/5'
                    : 'border-white/10 text-white/40 cursor-not-allowed'
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

          {/* Market Conditions Display */}
          {config.auto_strategy_enabled && marketConditions && (
            <div className="mt-4 p-4 glass-card rounded-lg">
              <div className="text-white/80 text-sm mb-3">Current Market Conditions</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-xs text-white/60 mb-1">Volatility</div>
                  <div className="text-lg font-bold text-white">{(marketConditions.volatility * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-white/60 mb-1">Trend Strength</div>
                  <div className="text-lg font-bold text-white">{(marketConditions.trend_strength * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-white/60 mb-1">Volume</div>
                  <div className="text-lg font-bold text-white">{(marketConditions.volume_profile * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-white/60 mb-1">Regime</div>
                  <div className={`text-sm font-bold px-2 py-1 rounded ${
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

          {/* Strategy Presets */}
          {config.auto_strategy_enabled && (
            <div className="mt-4">
              <div className="text-white/80 text-sm mb-3">Quick Presets</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => applyStrategyPreset('scalping')}
                  className="px-3 py-2 glass-card hover:bg-white/10 rounded-lg text-sm transition-colors"
                >
                  Scalping
                </button>
                <button
                  onClick={() => applyStrategyPreset('swing')}
                  className="px-3 py-2 glass-card hover:bg-white/10 rounded-lg text-sm transition-colors"
                >
                  Swing Trading
                </button>
                <button
                  onClick={() => applyStrategyPreset('trend')}
                  className="px-3 py-2 glass-card hover:bg-white/10 rounded-lg text-sm transition-colors"
                >
                  Trend Following
                </button>
                <button
                  onClick={() => applyStrategyPreset('range')}
                  className="px-3 py-2 glass-card hover:bg-white/10 rounded-lg text-sm transition-colors"
                >
                  Range Trading
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Safety Configuration Section */}
      <div className="mt-8">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-red-400" />
          <h4 className="text-lg font-bold text-white">Safety Configuration</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Account Balance ($)</label>
            <input
              type="number"
              value={botStatus?.account_balance || 10000}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 100 && value <= 1000000) {
                  updateAccountBalance(value);
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg"
              min="100"
              max="1000000"
            />
            <div className="text-xs text-white/40 mt-1">
              Used for position sizing calculations
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Max Position Hold (hours)</label>
            <input
              type="number"
              value={config.max_position_hold_hours}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1 && value <= 168) {
                  setConfig({...config, max_position_hold_hours: value});
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg"
              min="1"
              max="168"
            />
            <div className="text-xs text-white/40 mt-1">
              Auto-close positions after this time
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Signal Strength Threshold</label>
            <input
              type="number"
              step="0.1"
              value={config.signal_strength_threshold}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.1 && value <= 1.0) {
                  setConfig({...config, signal_strength_threshold: value});
                }
              }}
              className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg"
              min="0.1"
              max="1.0"
            />
            <div className="text-xs text-white/40 mt-1">
              Minimum signal strength to place trades
            </div>
          </div>
        </div>

        {/* Safety Toggles */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 glass-card rounded-lg">
            <div>
              <div className="text-white font-medium">Emergency Stop</div>
              <div className="text-white/60 text-sm mt-1">
                Manual emergency stop capability
              </div>
            </div>
            <button
              onClick={() => setConfig({...config, emergency_stop_enabled: !config.emergency_stop_enabled})}
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
              onClick={() => setConfig({...config, circuit_breaker_enabled: !config.circuit_breaker_enabled})}
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

        {/* Safety Status */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-3 text-center">
            <div className="text-white/60 text-sm">Daily Loss</div>
            <div className={`text-lg font-bold ${
              botStatus.current_daily_loss > config.max_daily_loss * 0.8 ? 'text-red-400' : 'text-white'
            }`}>
              ${botStatus.current_daily_loss.toFixed(2)}
            </div>
          </div>
          
          <div className="glass-card p-3 text-center">
            <div className="text-white/60 text-sm">Daily Limit</div>
            <div className="text-lg font-bold text-white">
              ${config.max_daily_loss}
            </div>
          </div>
          
          <div className="glass-card p-3 text-center">
            <div className="text-white/60 text-sm">Circuit Breaks</div>
            <div className={`text-lg font-bold ${
              botStatus.circuit_breaker_count > 0 ? 'text-orange-400' : 'text-white'
            }`}>
              {botStatus.circuit_breaker_count}
            </div>
          </div>
          
          <div className="glass-card p-3 text-center">
            <div className="text-white/60 text-sm">Auto-Closed</div>
            <div className={`text-lg font-bold ${
              botStatus.positions_auto_closed > 0 ? 'text-blue-400' : 'text-white'
            }`}>
              {botStatus.positions_auto_closed}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};