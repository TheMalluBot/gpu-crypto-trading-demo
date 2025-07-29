import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bot, TrendingUp, Shield, Clock, AlertTriangle, Save } from 'lucide-react';
import { Modal } from '../common/Modal';

interface AssetManagerInstance {
  config: Record<string, unknown>;
  updateConfig: (config: Record<string, unknown>) => void;
}

interface AutomationConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  assetManager: AssetManagerInstance;
}

export const AutomationConfigPanel: React.FC<AutomationConfigPanelProps> = ({
  isOpen,
  onClose,
  assetManager
}) => {
  const [config, setConfig] = useState(assetManager.config);
  const [activeSection, setActiveSection] = useState<'general' | 'profit' | 'rebalance' | 'risk'>('general');

  const handleSave = () => {
    assetManager.updateConfig(config);
    onClose();
  };

  const handleConfigChange = (key: string, value: unknown) => {
    setConfig((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <Bot className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Automation Configuration</h2>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/20 mb-6">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'profit', label: 'Profit Management', icon: TrendingUp },
            { id: 'rebalance', label: 'Rebalancing', icon: Shield },
            { id: 'risk', label: 'Risk Controls', icon: AlertTriangle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 transition-colors ${
                activeSection === id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* General Settings */}
          {activeSection === 'general' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">General Automation Settings</h3>
                
                <div className="space-y-4">
                  {/* Master Enable/Disable */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Enable Automation</div>
                      <div className="text-sm text-white/60">Master switch for all automated features</div>
                    </div>
                    <button
                      onClick={() => handleConfigChange('enabled', !config.enabled)}
                      className={`w-14 h-7 rounded-full p-1 transition-colors ${
                        config.enabled ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          config.enabled ? 'transform translate-x-7' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Monitoring Interval */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Monitoring Interval
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="5000"
                        max="300000"
                        step="5000"
                        value={config.monitoring_interval}
                        onChange={(e) => handleConfigChange('monitoring_interval', parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-white min-w-0 text-sm">
                        {config.monitoring_interval / 1000}s
                      </span>
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      How often the system checks for automation opportunities
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Profit Management Settings */}
          {activeSection === 'profit' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">Automated Profit Taking</h3>
                
                <div className="space-y-4">
                  {/* Enable Profit Taking */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Auto Profit Taking</div>
                      <div className="text-sm text-white/60">Automatically secure profits at predefined levels</div>
                    </div>
                    <button
                      onClick={() => handleConfigChange('auto_profit_taking', !config.auto_profit_taking)}
                      className={`w-14 h-7 rounded-full p-1 transition-colors ${
                        config.auto_profit_taking ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          config.auto_profit_taking ? 'transform translate-x-7' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Profit Taking Threshold */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Minimum Profit Threshold
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={config.profit_taking_threshold}
                        onChange={(e) => handleConfigChange('profit_taking_threshold', parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-white min-w-0 text-sm">
                        {config.profit_taking_threshold}%
                      </span>
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      Minimum profit percentage before considering automated profit taking
                    </div>
                  </div>

                  {/* Profit Zone Configuration */}
                  <div>
                    <div className="text-white font-medium mb-3">Profit Zones</div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="text-white/60">Profit Level</div>
                        <div className="text-white/60">Action</div>
                        <div className="text-white/60">Amount to Secure</div>
                      </div>
                      
                      {[
                        { level: 10, action: 'secure', amount: 25 },
                        { level: 20, action: 'secure', amount: 50 },
                        { level: 50, action: 'trail', amount: 0 }
                      ].map((zone, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-3 bg-white/5 rounded">
                          <div className="text-green-400 font-medium">{zone.level}%</div>
                          <div className="text-white capitalize">{zone.action}</div>
                          <div className="text-white">{zone.amount}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Rebalancing Settings */}
          {activeSection === 'rebalance' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">Automated Rebalancing</h3>
                
                <div className="space-y-4">
                  {/* Enable Rebalancing */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">Auto Rebalancing</div>
                      <div className="text-sm text-white/60">Automatically rebalance portfolio to target allocations</div>
                    </div>
                    <button
                      onClick={() => handleConfigChange('auto_rebalance', !config.auto_rebalance)}
                      className={`w-14 h-7 rounded-full p-1 transition-colors ${
                        config.auto_rebalance ? 'bg-blue-500' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          config.auto_rebalance ? 'transform translate-x-7' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Rebalance Threshold */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Rebalance Threshold
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={config.rebalance_threshold}
                        onChange={(e) => handleConfigChange('rebalance_threshold', parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-white min-w-0 text-sm">
                        {config.rebalance_threshold}%
                      </span>
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      Allocation deviation percentage that triggers rebalancing
                    </div>
                  </div>

                  {/* Current Allocations */}
                  <div>
                    <div className="text-white font-medium mb-3">Target Allocations</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                        <span className="text-white">Large Cap Crypto</span>
                        <span className="text-blue-400 font-medium">60%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                        <span className="text-white">Mid Cap Crypto</span>
                        <span className="text-yellow-400 font-medium">30%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                        <span className="text-white">Speculative</span>
                        <span className="text-red-400 font-medium">10%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Risk Controls */}
          {activeSection === 'risk' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">Risk Management Controls</h3>
                
                <div className="space-y-6">
                  {/* Emergency Controls */}
                  <div>
                    <div className="text-white font-medium mb-3">Emergency Controls</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded">
                        <div>
                          <div className="text-white font-medium">Flash Crash Protection</div>
                          <div className="text-sm text-red-300">Auto-reduce positions during rapid price movements</div>
                        </div>
                        <button className="w-12 h-6 bg-red-500 rounded-full p-1">
                          <div className="w-4 h-4 bg-white rounded-full transform translate-x-6" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                        <div>
                          <div className="text-white font-medium">High Volatility Scaling</div>
                          <div className="text-sm text-yellow-300">Reduce position sizes during high volatility</div>
                        </div>
                        <button className="w-12 h-6 bg-yellow-500 rounded-full p-1">
                          <div className="w-4 h-4 bg-white rounded-full transform translate-x-6" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Risk Thresholds */}
                  <div>
                    <div className="text-white font-medium mb-3">Risk Thresholds</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/60 text-sm mb-1">Portfolio Health Threshold</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="30"
                            max="80"
                            value="50"
                            className="flex-1"
                          />
                          <span className="text-white text-sm">50%</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-white/60 text-sm mb-1">Volatility Threshold</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="5"
                            max="20"
                            value="8"
                            className="flex-1"
                          />
                          <span className="text-white text-sm">8%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Bucket Limits */}
                  <div>
                    <div className="text-white font-medium mb-3">Risk Bucket Limits</div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-green-500/10 rounded">
                        <span className="text-white">Low Risk</span>
                        <span className="text-green-400 font-medium">Max 70%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded">
                        <span className="text-white">Medium Risk</span>
                        <span className="text-yellow-400 font-medium">Max 25%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-500/10 rounded">
                        <span className="text-white">High Risk</span>
                        <span className="text-red-400 font-medium">Max 5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-white/20 mt-6">
          <div className="text-sm text-white/60">
            Changes will take effect immediately after saving
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};