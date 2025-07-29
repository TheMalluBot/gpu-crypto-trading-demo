import React, { useState } from 'react';
import { BotStatus } from '../../types/bot';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { PnLDisplay } from '../common/PnLDisplay';

interface BotStatusPanelProps {
  botStatus: BotStatus | null;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onEmergencyStop: () => void;
  loading: boolean;
}

export const BotStatusPanel: React.FC<BotStatusPanelProps> = ({
  botStatus,
  onStart,
  onStop,
  onPause,
  onResume,
  onEmergencyStop,
  loading
}) => {
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  const handleStartBot = () => {
    onStart();
    setShowStartConfirm(false);
  };

  const handleStopBot = () => {
    onStop();
    setShowStopConfirm(false);
  };

  const handleEmergencyStop = () => {
    onEmergencyStop();
    setShowEmergencyConfirm(false);
  };

  // Helper function to get readable pause reason text
  const getPauseReasonText = (reason: any): string => {
    if (!reason) return 'Unknown';
    
    if (reason.HighVolatility) {
      return `High volatility (${(reason.HighVolatility.volatility * 100).toFixed(1)}%)`;
    }
    if (reason.DataQuality) {
      return `Data quality issue: ${reason.DataQuality.issue}`;
    }
    if (reason.ConnectionIssue) {
      return `Connection issue: ${reason.ConnectionIssue.reason}`;
    }
    if (reason.FlashCrash) {
      return `Flash crash detected (${(reason.FlashCrash.movement_percent * 100).toFixed(1)}%)`;
    }
    if (reason.RiskManagement) {
      return `Risk management (loss: $${reason.RiskManagement.current_loss.toFixed(2)})`;
    }
    if (reason.CircuitBreaker) {
      return `Circuit breaker #${reason.CircuitBreaker.trigger_count}`;
    }
    if (reason.Manual !== undefined) {
      return 'Manual pause';
    }
    
    return 'Unknown reason';
  };

  // Determine status info using new state system
  const getStatusInfo = () => {
    if (!botStatus) {
      return {
        status: 'Loading...',
        icon: '🔄',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10 border-gray-500/20',
        description: 'Loading bot status...',
        canStart: false,
        canStop: false,
        canPause: false,
        canResume: false
      };
    }

    // Use new state system if available, fallback to legacy
    const state = (botStatus as any).state || (botStatus.is_active ? 'Running' : 'Stopped');
    const pauseInfo = (botStatus as any).pause_info;

    switch (state) {
      case 'Running':
        return {
          status: 'Running',
          icon: '🟢',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10 border-green-500/20',
          description: 'Bot is actively monitoring markets',
          canStart: false,
          canStop: true,
          canPause: true,
          canResume: false
        };

      case 'Paused':
        const pauseReason = pauseInfo ? getPauseReasonText(pauseInfo.reason) : 'Unknown';
        const autoResume = pauseInfo?.auto_resume_at ? new Date(pauseInfo.auto_resume_at) : null;
        const willAutoResume = autoResume && autoResume > new Date();
        
        return {
          status: 'Paused',
          icon: '⏸️',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10 border-yellow-500/20',
          description: `Bot paused: ${pauseReason}${willAutoResume ? ` (auto-resume in ${Math.ceil((autoResume.getTime() - Date.now()) / 60000)}m)` : ''}`,
          canStart: false,
          canStop: true,
          canPause: false,
          canResume: true
        };

      case 'Stopped':
      default:
        if (botStatus.emergency_stop_triggered) {
          return {
            status: 'Emergency Stop',
            icon: '🚨',
            color: 'text-red-400',
            bgColor: 'bg-red-500/10 border-red-500/20',
            description: 'Bot stopped due to emergency conditions',
            canStart: false,
            canStop: false,
            canPause: false,
            canResume: false
          };
        }
        
        return {
          status: 'Stopped',
          icon: '🔴',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10 border-gray-500/20',
          description: 'Bot is not running',
          canStart: true,
          canStop: false,
          canPause: false,
          canResume: false
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="glass-morphic overflow-x-hidden z-content">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{statusInfo.icon}</span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Trading Bot</h2>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.status}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
            {/* Paper Mode Indicator */}
            {botStatus?.config?.paper_trading_enabled && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-medium text-blue-400">PAPER</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {statusInfo.canStart && (
                <Button
                  onClick={() => setShowStartConfirm(true)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2"
                  size="sm"
                >
                  {loading ? 'Starting...' : 'Start Bot'}
                </Button>
              )}
              
              {(statusInfo as any).canPause && (
                <Button
                  onClick={onPause}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-2"
                  size="sm"
                >
                  ⏸️ Pause
                </Button>
              )}
              
              {(statusInfo as any).canResume && (
                <Button
                  onClick={onResume}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2"
                  size="sm"
                >
                  ▶️ Resume
                </Button>
              )}
              
              {statusInfo.canStop && (
                <Button
                  onClick={() => setShowStopConfirm(true)}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-2"
                  size="sm"
                >
                  {loading ? 'Stopping...' : 'Stop Bot'}
                </Button>
              )}
              
              <Button
                onClick={() => setShowEmergencyConfirm(true)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2"
                size="sm"
              >
                🚨 Emergency Stop
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/70">{statusInfo.description}</p>
      </div>

      {/* Status Details */}
      {botStatus && (
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Account Balance */}
            <div className="text-center p-3 glass-card">
              <div className="text-xs sm:text-sm text-white/70">Account Balance</div>
              <div className="text-base sm:text-lg font-bold text-blue-400">
                {formatCurrency(botStatus?.account_balance || 0)}
              </div>
            </div>

            {/* Daily P&L */}
            <div className="text-center p-3 glass-card">
              <div className="text-xs sm:text-sm text-white/70">Today's P&L</div>
              <PnLDisplay value={botStatus?.performance?.total_pnl || 0} size="lg" />
            </div>

            {/* Total Trades */}
            <div className="text-center p-3 glass-card">
              <div className="text-xs sm:text-sm text-white/70">Total Trades</div>
              <div className="text-base sm:text-lg font-bold text-purple-400">
                {botStatus?.performance?.total_trades || 0}
              </div>
            </div>

            {/* Success Rate */}
            <div className="text-center p-3 glass-card">
              <div className="text-xs sm:text-sm text-white/70">Success Rate</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400">
                {formatPercentage(botStatus?.performance?.success_rate || 0)}
              </div>
            </div>
          </div>

          {/* Current Position */}
          {botStatus?.current_position ? (
            <div className="p-3 sm:p-4 glass-card mb-4">
              <h3 className="font-semibold text-yellow-400 mb-2 text-sm sm:text-base">📈 Current Position</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
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
          ) : botStatus?.is_active ? (
            <div className="p-3 sm:p-4 glass-card mb-4">
              <h3 className="font-semibold text-blue-400 text-sm sm:text-base">📊 No Active Position</h3>
              <p className="text-white/70 text-xs sm:text-sm mt-1">Bot is monitoring markets for entry opportunities</p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 glass-card mb-4">
              <h3 className="font-semibold text-gray-400 text-sm sm:text-base">⏸️ Bot Inactive</h3>
              <p className="text-white/70 text-xs sm:text-sm mt-1">Start the bot to begin monitoring markets</p>
            </div>
          )}

          {/* Latest Signal */}
          {botStatus?.latest_signal && (
            <div className="p-3 sm:p-4 glass-card">
              <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">📡 Latest Signal</h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
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
          {(botStatus?.circuit_breaker_count > 0 || (botStatus?.current_daily_loss || 0) > 0) && (
            <div className="mt-4 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2 text-sm sm:text-base">⚠️ Safety Status</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Circuit Breakers:</span>
                  <span className="ml-1 font-medium text-orange-600">{botStatus?.circuit_breaker_count || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Daily Loss:</span>
                  <span className="ml-1 font-medium text-orange-600">
                    {formatCurrency(botStatus?.current_daily_loss || 0)}
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