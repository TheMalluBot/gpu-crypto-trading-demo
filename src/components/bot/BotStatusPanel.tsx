import React, { useState } from 'react';
import { BotStatus } from '../../types/bot';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { PnLDisplay } from '../common/PnLDisplay';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface BotStatusPanelProps {
  botStatus: BotStatus | null;
  onStart: () => void;
  onStop: () => void;
  onEmergencyStop: () => void;
  loading: boolean;
}

export const BotStatusPanel: React.FC<BotStatusPanelProps> = ({
  botStatus,
  onStart,
  onStop,
  onEmergencyStop,
  loading
}) => {
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  const handleStartBot = () => {
    setShowStartConfirm(false);
    onStart();
  };

  const handleStopBot = () => {
    setShowStopConfirm(false);
    onStop();
  };

  const handleEmergencyStop = () => {
    setShowEmergencyConfirm(false);
    onEmergencyStop();
  };

  const getBotStatusInfo = () => {
    if (!botStatus) {
      return {
        status: 'Disconnected',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        icon: '🔌',
        description: 'Unable to connect to trading bot. Check your connection.',
        canStart: false,
        canStop: false
      };
    }

    if (botStatus.emergency_stop_triggered) {
      return {
        status: 'Emergency Stop',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        icon: '🚨',
        description: 'Bot has been emergency stopped. Reset the emergency stop to continue.',
        canStart: false,
        canStop: false
      };
    }

    if (botStatus.circuit_breaker_active) {
      return {
        status: 'Circuit Breaker Active',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        icon: '⚡',
        description: 'Trading halted due to circuit breaker activation. Wait for reset or manual intervention.',
        canStart: false,
        canStop: true
      };
    }

    if (botStatus.is_active) {
      return {
        status: 'Active & Trading',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        icon: '🟢',
        description: 'Bot is actively monitoring markets and executing trades according to your strategy.',
        canStart: false,
        canStop: true
      };
    }

    return {
      status: 'Stopped',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 border-gray-200',
      icon: '⏸️',
      description: 'Bot is ready to start trading. Click "Start Bot" to begin.',
      canStart: true,
      canStop: false
    };
  };

  const statusInfo = getBotStatusInfo();


  return (
    <div className="glass-morphic">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{statusInfo.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-white">Trading Bot</h2>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.status}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            {/* Paper Mode Indicator */}
            {botStatus?.config.paper_trading_enabled && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-blue-400">PAPER MODE</span>
                <span className="text-xs text-blue-300/70">Safe Trading</span>
              </div>
            )}
            
            <div className="flex space-x-2">
              {statusInfo.canStart && (
                <Button
                  onClick={() => setShowStartConfirm(true)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  {loading ? 'Starting...' : 'Start Bot'}
                </Button>
              )}
              {statusInfo.canStop && (
                <Button
                  onClick={() => setShowStopConfirm(true)}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                  size="sm"
                >
                  {loading ? 'Stopping...' : 'Stop Bot'}
                </Button>
              )}
              <Button
                onClick={() => setShowEmergencyConfirm(true)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                Emergency Stop
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/70">{statusInfo.description}</p>
      </div>

      {/* Status Details */}
      {botStatus && (
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Account Balance */}
            <div className="text-center p-3 glass-card">
              <div className="text-sm text-white/70">Account Balance</div>
              <div className="text-lg font-bold text-blue-400">
                {formatCurrency(botStatus.account_balance)}
              </div>
            </div>

            {/* Daily P&L */}
            <div className="text-center p-3 glass-card">
              <div className="text-sm text-white/70">Today's P&L</div>
              <PnLDisplay value={botStatus.performance.total_pnl} size="lg" />
            </div>

            {/* Total Trades */}
            <div className="text-center p-3 glass-card">
              <div className="text-sm text-white/70">Total Trades</div>
              <div className="text-lg font-bold text-purple-400">
                {botStatus.performance.total_trades}
              </div>
            </div>

            {/* Success Rate */}
            <div className="text-center p-3 glass-card">
              <div className="text-sm text-white/70">Success Rate</div>
              <div className="text-lg font-bold text-emerald-400">
                {formatPercentage(botStatus.performance.success_rate)}
              </div>
            </div>
          </div>

          {/* Current Position */}
          {botStatus.current_position ? (
            <div className="p-4 glass-card mb-4">
              <h3 className="font-semibold text-yellow-400 mb-2">📈 Current Position</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-white/70">Symbol:</span>
                  <span className="ml-1 font-medium text-white">{botStatus.current_position.symbol}</span>
                </div>
                <div>
                  <span className="text-white/70">Side:</span>
                  <span className={`ml-1 font-medium ${
                    botStatus.current_position.side === 'Long' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {botStatus.current_position.side}
                  </span>
                </div>
                <div>
                  <span className="text-white/70">Entry:</span>
                  <span className="ml-1 font-medium text-white">{formatCurrency(botStatus.current_position.entry_price)}</span>
                </div>
                <div>
                  <span className="text-white/70">Quantity:</span>
                  <span className="ml-1 font-medium text-white">{botStatus.current_position.quantity}</span>
                </div>
              </div>
            </div>
          ) : botStatus.is_active ? (
            <div className="p-4 glass-card mb-4">
              <h3 className="font-semibold text-blue-400">📊 No Active Position</h3>
              <p className="text-white/70 text-sm mt-1">Bot is monitoring markets for entry opportunities</p>
            </div>
          ) : (
            <div className="p-4 glass-card mb-4">
              <h3 className="font-semibold text-gray-400">⏸️ Bot Inactive</h3>
              <p className="text-white/70 text-sm mt-1">Start the bot to begin monitoring markets</p>
            </div>
          )}

          {/* Latest Signal */}
          {botStatus.latest_signal && (
            <div className="p-4 glass-card">
              <h3 className="font-semibold text-white mb-2">📡 Latest Signal</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-white/70">Type:</span>
                  <span className="ml-1">
                    <StatusBadge status={botStatus.latest_signal.signal_type} variant="signal-type" />
                  </span>
                </div>
                <div>
                  <span className="text-white/70">LRO:</span>
                  <span className="ml-1 font-medium text-white">{botStatus.latest_signal.lro_value.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-white/70">Strength:</span>
                  <span className="ml-1 font-medium text-white">{formatPercentage(botStatus.latest_signal.strength)}</span>
                </div>
                <div>
                  <span className="text-white/70">Time:</span>
                  <span className="ml-1 font-medium text-white">
                    {new Date(botStatus.latest_signal.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Safety Status */}
          {(botStatus.circuit_breaker_count > 0 || botStatus.current_daily_loss > 0) && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">⚠️ Safety Status</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Circuit Breakers:</span>
                  <span className="ml-1 font-medium text-orange-600">{botStatus.circuit_breaker_count}</span>
                </div>
                <div>
                  <span className="text-gray-600">Daily Loss:</span>
                  <span className="ml-1 font-medium text-orange-600">
                    {formatCurrency(botStatus.current_daily_loss)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modals */}
      <Modal
        isOpen={showStartConfirm}
        onClose={() => setShowStartConfirm(false)}
        title="Start Trading Bot"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800">Ready to Start Trading</h3>
              <p className="text-blue-700 text-sm">The bot will begin monitoring markets and executing trades according to your strategy.</p>
            </div>
            {botStatus?.config.paper_trading_enabled && (
              <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-bold text-green-700">PAPER MODE</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Paper trading mode: {botStatus?.config.paper_trading_enabled ? 'Enabled (Safe)' : 'Disabled (Live trading)'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Emergency stop: Available at any time</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Maximum daily loss: {formatCurrency(botStatus?.config.max_daily_loss || 0)}</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button onClick={() => setShowStartConfirm(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleStartBot} className="flex-1 bg-green-600 hover:bg-green-700">
              Start Bot
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showStopConfirm}
        onClose={() => setShowStopConfirm(false)}
        title="Stop Trading Bot"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
            <span className="text-2xl">⏸️</span>
            <div>
              <h3 className="font-semibold text-orange-800">Stop Trading Activity</h3>
              <p className="text-orange-700 text-sm">The bot will stop monitoring markets and won't open new positions.</p>
            </div>
          </div>
          
          {botStatus?.current_position && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> You have an open position. Consider closing it manually or using Emergency Stop to close all positions.
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            <Button onClick={() => setShowStopConfirm(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleStopBot} className="flex-1 bg-orange-600 hover:bg-orange-700">
              Stop Bot
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEmergencyConfirm}
        onClose={() => setShowEmergencyConfirm(false)}
        title="Emergency Stop"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
            <span className="text-2xl">🚨</span>
            <div>
              <h3 className="font-semibold text-red-800">Emergency Stop</h3>
              <p className="text-red-700 text-sm">This will immediately stop all trading activity and close any open positions.</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <span>All open positions will be closed immediately</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <span>Bot will be completely stopped</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <span>Manual reset required to restart</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button onClick={() => setShowEmergencyConfirm(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleEmergencyStop} className="flex-1 bg-red-600 hover:bg-red-700">
              Emergency Stop
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};