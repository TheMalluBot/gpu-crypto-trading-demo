import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Target, TrendingUp, Shield, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { AssetManager, DEFAULT_CONSERVATIVE_CONFIG } from '../../utils/assetManager';
import {
  AssetManagerState,
  AllocationStatus,
  PortfolioHealth,
  ProfitSecuringAction,
} from '../../types/assetManagement';

interface AssetManagerPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const AssetManagerPanel: React.FC<AssetManagerPanelProps> = ({ isVisible, onToggle }) => {
  const [assetManager] = useState(() => new AssetManager(DEFAULT_CONSERVATIVE_CONFIG));
  const [state, setState] = useState<AssetManagerState>(assetManager.getState());
  const [activeTab, setActiveTab] = useState<'overview' | 'allocations' | 'profit' | 'rebalance'>(
    'overview'
  );

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      // In real implementation, this would update from actual trading data
      const updatedState = assetManager.getState();
      setState(updatedState);
    }, 5000);

    return () => clearInterval(interval);
  }, [assetManager]);

  const allocationData = state.config.asset_classes.map((asset, index) => ({
    name: asset.name,
    target: asset.target_allocation,
    current: asset.current_allocation,
    color: COLORS[index % COLORS.length],
  }));

  const riskBucketData = state.config.risk_buckets.map((bucket, index) => ({
    name: bucket.name,
    allocation: bucket.current_allocation,
    max: bucket.max_allocation,
    color: COLORS[index % COLORS.length],
  }));

  const profitSecuringActions = assetManager.checkProfitPreservation();
  const rebalancingSuggestions = assetManager.analyzeRebalancingNeeds();

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  if (!isVisible) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 1000 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl h-full max-h-[90vh] bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/20 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Asset Management System</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-white/60">Portfolio Health:</span>
              <span className={`font-bold ${getHealthColor(state.portfolio_health.overall_score)}`}>
                {state.portfolio_health.overall_score.toFixed(0)}%
              </span>
            </div>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/20">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'allocations', label: 'Allocations', icon: Target },
            { id: 'profit', label: 'Profit Management', icon: DollarSign },
            { id: 'rebalance', label: 'Rebalancing', icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-3 sm:py-4 transition-colors ${
                activeTab === id
                  ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Portfolio Health Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Overall Health',
                    value: state.portfolio_health.overall_score,
                    icon: Target,
                  },
                  {
                    label: 'Allocation Health',
                    value: state.portfolio_health.allocation_health,
                    icon: TrendingUp,
                  },
                  { label: 'Risk Health', value: state.portfolio_health.risk_health, icon: Shield },
                  {
                    label: 'Profit Health',
                    value: state.portfolio_health.profit_health,
                    icon: DollarSign,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-5 h-5 text-white/60" />
                      <span className={`text-2xl font-bold ${getHealthColor(value)}`}>
                        {value.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-sm text-white/60">{label}</div>
                    <div className={`mt-2 h-2 rounded-full ${getHealthBg(value)}`}>
                      <div
                        className={`h-full rounded-full ${value >= 80 ? 'bg-green-400' : value >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(100, value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Capital Allocation Overview */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                <div className="glass-card p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Capital Allocation</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Total Capital</span>
                      <span className="text-white font-bold">
                        ${state.config.total_capital.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Currently Allocated</span>
                      <span className="text-green-400 font-bold">
                        ${state.allocation_status.total_allocated.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Available Cash</span>
                      <span className="text-blue-400 font-bold">
                        ${state.allocation_status.cash_available.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Profit Secured Today</span>
                      <span className="text-yellow-400 font-bold">
                        ${state.profit_secured_today.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Warnings & Recommendations</h3>
                  <div className="space-y-3">
                    {state.portfolio_health.warnings.map((warning, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-red-300 text-sm">{warning}</span>
                      </div>
                    ))}
                    {state.portfolio_health.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="text-blue-300 text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Allocations Tab */}
          {activeTab === 'allocations' && (
            <div className="space-y-4 lg:space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                {/* Asset Class Allocation Chart */}
                <div className="glass-card p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Asset Class Allocation</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        dataKey="current"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'white',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Risk Bucket Distribution */}
                <div className="glass-card p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={riskBucketData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                      <YAxis stroke="rgba(255,255,255,0.6)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'white',
                        }}
                      />
                      <Bar dataKey="allocation" fill="#3b82f6" />
                      <Bar dataKey="max" fill="rgba(59, 130, 246, 0.3)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Allocation Table */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Detailed Allocation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left text-white/60 pb-2">Asset Class</th>
                        <th className="text-right text-white/60 pb-2">Target %</th>
                        <th className="text-right text-white/60 pb-2">Current %</th>
                        <th className="text-right text-white/60 pb-2">Deviation</th>
                        <th className="text-right text-white/60 pb-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationData.map((asset, index) => {
                        const deviation = asset.current - asset.target;
                        return (
                          <tr key={index} className="border-b border-white/10">
                            <td className="py-3 text-white">{asset.name}</td>
                            <td className="py-3 text-right text-white">
                              {asset.target.toFixed(1)}%
                            </td>
                            <td className="py-3 text-right text-white">
                              {asset.current.toFixed(1)}%
                            </td>
                            <td
                              className={`py-3 text-right ${Math.abs(deviation) > 2 ? 'text-red-400' : 'text-green-400'}`}
                            >
                              {deviation > 0 ? '+' : ''}
                              {deviation.toFixed(1)}%
                            </td>
                            <td className="py-3 text-right text-white">
                              $
                              {(
                                (asset.current / 100) *
                                state.config.total_capital
                              ).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Profit Management Tab */}
          {activeTab === 'profit' && (
            <div className="space-y-6">
              {/* Profit Zones Configuration */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Profit Zones</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {state.config.profit_zones.map((zone, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-400 font-bold">{zone.level}% Profit</span>
                        <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                          {zone.action}
                        </span>
                      </div>
                      <div className="text-sm text-white/60">
                        Secure: {zone.percentage_to_secure}%
                      </div>
                      <div className="text-sm text-white/60">
                        Let ride: {zone.remaining_percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Profit Securing Actions */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Active Profit Actions</h3>
                {profitSecuringActions.length > 0 ? (
                  <div className="space-y-3">
                    {profitSecuringActions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                      >
                        <div>
                          <div className="text-white font-medium">{action.symbol}</div>
                          <div className="text-sm text-white/60">{action.reason}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-bold">{action.action_type}</div>
                          <div className="text-xs text-white/60">
                            {action.profit_level_achieved}% profit
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-white/60 py-8">
                    No active profit securing actions at this time
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rebalancing Tab */}
          {activeTab === 'rebalance' && (
            <div className="space-y-6">
              {/* Rebalancing Status */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Rebalancing Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {state.allocation_status.rebalancing_needed ? 'NEEDED' : 'NOT NEEDED'}
                    </div>
                    <div className="text-sm text-white/60">Rebalancing Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {state.config.rebalancing_frequency.toUpperCase()}
                    </div>
                    <div className="text-sm text-white/60">Frequency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {Math.floor(
                        (Date.now() - state.last_rebalance.getTime()) / (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </div>
                    <div className="text-sm text-white/60">Since Last Rebalance</div>
                  </div>
                </div>
              </div>

              {/* Rebalancing Suggestions */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Rebalancing Suggestions</h3>
                {rebalancingSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    {rebalancingSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border border-white/20 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                suggestion.action === 'buy'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {suggestion.action.toUpperCase()}
                            </span>
                            <span className="text-white font-medium">{suggestion.symbol}</span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                suggestion.priority === 'high'
                                  ? 'bg-red-500/20 text-red-400'
                                  : suggestion.priority === 'medium'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {suggestion.priority}
                            </span>
                          </div>
                          <div className="text-sm text-white/60 mt-1">{suggestion.reason}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">
                            ${suggestion.suggested_amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-white/60">
                            {suggestion.current_allocation.toFixed(1)}% →{' '}
                            {suggestion.target_allocation.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-white/60 py-8">
                    No rebalancing needed at this time
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
