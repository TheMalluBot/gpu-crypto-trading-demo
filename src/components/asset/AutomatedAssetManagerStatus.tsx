import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Activity,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  Settings,
} from 'lucide-react';
import { AutomationConfigPanel } from './AutomationConfigPanel';

interface AutomatedAssetManagerStatusProps {
  assetManager: any; // From useAutomatedAssetManager hook
  className?: string;
}

export const AutomatedAssetManagerStatus: React.FC<AutomatedAssetManagerStatusProps> = ({
  assetManager,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const getStatusColor = () => {
    if (!assetManager.config.enabled) return 'text-gray-400';
    if (assetManager.isProcessing) return 'text-blue-400';
    if (assetManager.pendingActions.length > 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusIcon = () => {
    if (!assetManager.config.enabled) return <Pause className="w-4 h-4" />;
    if (assetManager.isProcessing) return <Activity className="w-4 h-4 animate-pulse" />;
    return <Bot className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!assetManager.config.enabled) return 'Disabled';
    if (assetManager.isProcessing) return 'Processing';
    if (assetManager.pendingActions.length > 0)
      return `${assetManager.pendingActions.length} Actions Pending`;
    return 'Active';
  };

  const recentActions = assetManager.executedActions.slice(-5).reverse();

  return (
    <div className={`glass-card ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-3">
          <div className={`${getStatusColor()}`}>{getStatusIcon()}</div>
          <div>
            <div className="text-white font-medium">Automated Asset Manager</div>
            <div className={`text-sm ${getStatusColor()}`}>{getStatusText()}</div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Quick Stats */}
          <div className="text-right hidden sm:block">
            <div className="text-xs text-white/60">Today</div>
            <div className="text-sm text-white">
              {assetManager.stats.profitActionsToday} profits,{' '}
              {assetManager.stats.rebalanceActionsToday} rebalances
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={e => {
                e.stopPropagation();
                setShowConfig(true);
              }}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              title="Configure Automation"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={e => {
                e.stopPropagation();
                if (assetManager.config.enabled) {
                  assetManager.disableAutomation();
                } else {
                  assetManager.enableAutomation();
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                assetManager.config.enabled
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
              }`}
              title={assetManager.config.enabled ? 'Disable Automation' : 'Enable Automation'}
            >
              {assetManager.config.enabled ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Detailed View */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10"
          >
            {/* Configuration Status */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp
                    className={`w-4 h-4 ${assetManager.config.auto_profit_taking ? 'text-green-400' : 'text-gray-400'}`}
                  />
                  <span className="text-sm text-white/80">Profit Taking</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      assetManager.config.auto_profit_taking
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {assetManager.config.auto_profit_taking ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Shield
                    className={`w-4 h-4 ${assetManager.config.auto_rebalance ? 'text-blue-400' : 'text-gray-400'}`}
                  />
                  <span className="text-sm text-white/80">Rebalancing</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      assetManager.config.auto_rebalance
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {assetManager.config.auto_rebalance ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-white/80">Monitoring</span>
                  <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                    {assetManager.config.monitoring_interval / 1000}s
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white/80">Actions</span>
                  <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                    {assetManager.stats.totalActionsExecuted}
                  </span>
                </div>
              </div>

              {/* Pending Actions */}
              {assetManager.pendingActions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Pending Actions</h4>
                  <div className="space-y-2 max-h-24 sm:max-h-32 lg:max-h-40 overflow-y-auto">
                    {assetManager.pendingActions.slice(0, 5).map((action: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white/5 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              action.priority === 'HIGH'
                                ? 'bg-red-400'
                                : action.priority === 'MEDIUM'
                                  ? 'bg-yellow-400'
                                  : 'bg-blue-400'
                            }`}
                          />
                          <span className="text-sm text-white">{action.symbol}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              action.action === 'BUY'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {action.action}
                          </span>
                        </div>
                        <div className="text-xs text-white/60">{action.type.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Actions */}
              {recentActions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Recent Actions</h4>
                  <div className="space-y-2 max-h-24 sm:max-h-32 lg:max-h-40 overflow-y-auto">
                    {recentActions.map((action: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white/5 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span className="text-sm text-white">{action.symbol}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              action.action === 'BUY'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {action.action}
                          </span>
                        </div>
                        <div className="text-xs text-white/60">
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => assetManager.monitorPortfolio()}
                    disabled={assetManager.isProcessing}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    Scan Now
                  </button>

                  {assetManager.pendingActions.length > 0 && (
                    <button
                      onClick={() => assetManager.cancelPendingActions()}
                      className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm transition-colors"
                    >
                      Cancel Pending
                    </button>
                  )}
                </div>

                <div className="text-xs text-white/60">
                  Last scan: {assetManager.stats.lastMonitoringTime.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configuration Panel */}
      <AutomationConfigPanel
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        assetManager={assetManager}
      />
    </div>
  );
};
