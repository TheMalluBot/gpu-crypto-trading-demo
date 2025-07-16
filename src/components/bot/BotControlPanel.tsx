import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, Play, Pause, Settings, BarChart3, Power, StopCircle, AlertTriangle 
} from 'lucide-react';
import { BotStatus, LROConfig } from '../../types/bot';

interface BotControlPanelProps {
  botStatus: BotStatus;
  config: LROConfig;
  loading: boolean;
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  toggleBot: () => void;
  simulateData: () => void;
  triggerEmergencyStop: (reason: string) => void;
  resetEmergencyStop: () => void;
  getSignalColor: (signalType: string) => string;
}

export const BotControlPanel: React.FC<BotControlPanelProps> = ({
  botStatus,
  config,
  loading,
  showConfig,
  setShowConfig,
  toggleBot,
  simulateData,
  triggerEmergencyStop,
  resetEmergencyStop,
  getSignalColor
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-morphic p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Bot className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Linear Regression Oscillator Bot</h2>
            <p className="text-white/60">Adaptive swing trading strategy</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 glass-card hover:bg-white/10 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-white/70" />
          </button>
          
          <button
            onClick={simulateData}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Simulate Data
          </button>
          
          <button
            onClick={toggleBot}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
              botStatus.is_active
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin inline mr-2"></div>
            ) : botStatus.is_active ? (
              <Pause className="w-4 h-4 inline mr-2" />
            ) : (
              <Play className="w-4 h-4 inline mr-2" />
            )}
            {botStatus.is_active ? 'Stop Bot' : 'Start Bot'}
          </button>
          
          {/* Emergency Stop Button */}
          {botStatus.emergency_stop_triggered ? (
            <button
              onClick={resetEmergencyStop}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <Power className="w-4 h-4 inline mr-2" />
              Reset Emergency Stop
            </button>
          ) : (
            <button
              onClick={() => triggerEmergencyStop("Manual trigger")}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <StopCircle className="w-4 h-4 inline mr-2" />
              Emergency Stop
            </button>
          )}
        </div>
      </div>

      {/* Safety Status Alert */}
      {(botStatus.emergency_stop_triggered || botStatus.circuit_breaker_active) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-4 border-l-4 border-red-500 bg-red-500/10"
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <div className="text-red-400 font-bold text-lg">
                {botStatus.emergency_stop_triggered ? 'EMERGENCY STOP ACTIVE' : 'CIRCUIT BREAKER ACTIVE'}
              </div>
              <div className="text-red-300 text-sm mt-1">
                {botStatus.emergency_stop_triggered 
                  ? 'All trading has been halted. Manual intervention required.'
                  : `Circuit breaker triggered ${botStatus.circuit_breaker_count} times. Trading paused for safety.`
                }
              </div>
              {botStatus.circuit_breaker_active && (
                <div className="text-red-300 text-xs mt-2">
                  Daily Loss: ${botStatus.current_daily_loss.toFixed(2)} • Auto-closed positions: {botStatus.positions_auto_closed}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced Bot Status */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Bot Activity Status */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Bot Status</span>
            <div className={`w-3 h-3 rounded-full ${
              botStatus.is_active ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
          </div>
          <div className={`text-lg font-bold ${
            botStatus.is_active ? 'text-green-400' : 'text-gray-400'
          }`}>
            {botStatus.is_active ? 'Active Trading' : 'Stopped'}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {botStatus.is_active ? 'Monitoring signals' : 'Not monitoring'}
          </div>
        </div>

        {/* Trading Mode */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Trading Mode</span>
            <div className={`w-2 h-2 rounded-full ${
              config.paper_trading_enabled ? 'bg-blue-400' : 'bg-orange-400'
            }`}></div>
          </div>
          <div className={`text-lg font-bold ${
            config.paper_trading_enabled ? 'text-blue-400' : 'text-orange-400'
          }`}>
            {config.paper_trading_enabled ? 'Paper Trading' : 'Live Trading'}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {config.paper_trading_enabled ? 'Virtual funds' : 'Real money'}
          </div>
        </div>

        {/* Current Signal */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Latest Signal</span>
            {botStatus.latest_signal && (
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                botStatus.latest_signal.signal_type.includes('Buy') ? 'bg-green-400' : 
                botStatus.latest_signal.signal_type.includes('Sell') ? 'bg-red-400' : 'bg-yellow-400'
              }`}></div>
            )}
          </div>
          {botStatus.latest_signal ? (
            <>
              <div className={`text-lg font-bold ${getSignalColor(botStatus.latest_signal.signal_type).split(' ')[0]}`}>
                {botStatus.latest_signal.signal_type}
              </div>
              <div className="text-xs text-white/40 mt-1">
                {new Date(botStatus.latest_signal.timestamp).toLocaleTimeString()}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-gray-400">No Signal</div>
              <div className="text-xs text-white/40 mt-1">Waiting for data</div>
            </>
          )}
        </div>

        {/* Position Status */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Position</span>
            {botStatus.current_position && (
              <div className={`w-2 h-2 rounded-full ${
                botStatus.current_position.side === 'Long' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            )}
          </div>
          {botStatus.current_position ? (
            <>
              <div className={`text-lg font-bold ${
                botStatus.current_position.side === 'Long' ? 'text-green-400' : 'text-red-400'
              }`}>
                {botStatus.current_position.side} {botStatus.current_position.symbol}
              </div>
              <div className="text-xs text-white/40 mt-1">
                ${botStatus.current_position.entry_price.toFixed(2)}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-gray-400">No Position</div>
              <div className="text-xs text-white/40 mt-1">Cash ready</div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};