import React, { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { TrendingUp, TrendingDown, DollarSign, Activity, Percent, Clock, Award, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface DashboardStats {
  totalBalance: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  weeklyPnL: number;
  monthlyPnL: number;
  openPositions: number;
  totalTrades: number;
  winRate: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldTime: string;
  currentStreak: number;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant: 'primary' | 'success' | 'danger';
}

export const SimpleDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 10000,
    dailyPnL: 0,
    dailyPnLPercent: 0,
    weeklyPnL: 0,
    monthlyPnL: 0,
    openPositions: 0,
    totalTrades: 0,
    winRate: 0,
    bestTrade: 0,
    worstTrade: 0,
    avgHoldTime: '0h',
    currentStreak: 0,
  });

  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>('1D');

  useEffect(() => {
    loadDashboardStats();
    const interval = setInterval(loadDashboardStats, 5000);
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const loadDashboardStats = async () => {
    try {
      // Try to get real stats from backend
      const stats = await invoke<DashboardStats>('get_dashboard_stats', { timeframe: selectedTimeframe });
      setStats(stats);
    } catch (error) {
      // Use mock data for demonstration
      setStats({
        totalBalance: 10000 + Math.random() * 500 - 250,
        dailyPnL: Math.random() * 200 - 100,
        dailyPnLPercent: Math.random() * 4 - 2,
        weeklyPnL: Math.random() * 500 - 250,
        monthlyPnL: Math.random() * 1000 - 500,
        openPositions: Math.floor(Math.random() * 5),
        totalTrades: 42,
        winRate: 45 + Math.random() * 20,
        bestTrade: Math.random() * 500,
        worstTrade: -Math.random() * 300,
        avgHoldTime: '2h 15m',
        currentStreak: Math.floor(Math.random() * 10) - 5,
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      label: 'Quick Buy',
      icon: <TrendingUp className="w-4 h-4" />,
      action: () => console.log('Quick buy'),
      variant: 'success',
    },
    {
      label: 'Quick Sell',
      icon: <TrendingDown className="w-4 h-4" />,
      action: () => console.log('Quick sell'),
      variant: 'danger',
    },
    {
      label: 'Start Bot',
      icon: <Activity className="w-4 h-4" />,
      action: () => console.log('Start bot'),
      variant: 'primary',
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const formatted = value.toFixed(2);
    return value >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header with timeframe selector */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <div className="flex gap-2">
          {(['1D', '1W', '1M', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedTimeframe === tf
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</p>
                <p className="text-xs text-gray-500 mt-1">Paper Trading Account</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Daily P&L */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Today's P&L</p>
                <p className={`text-2xl font-bold ${stats.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(stats.dailyPnL)}
                </p>
                <p className={`text-xs mt-1 ${stats.dailyPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(stats.dailyPnLPercent)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stats.dailyPnL >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {stats.dailyPnL >= 0 ? 
                  <TrendingUp className="w-6 h-6 text-green-600" /> :
                  <TrendingDown className="w-6 h-6 text-red-600" />
                }
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Open Positions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Open Positions</p>
                <p className="text-2xl font-bold">{stats.openPositions}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.openPositions === 0 ? 'No active trades' : 'Active trades'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Win Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Win Rate</p>
                <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalTrades} total trades
                </p>
              </div>
              <div className="relative w-16 h-16">
                <svg className="transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke={stats.winRate >= 50 ? '#10b981' : '#ef4444'}
                    strokeWidth="2"
                    strokeDasharray={`${stats.winRate} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Percent className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Performance Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Performance Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Best Trade</span>
              <span className="text-sm font-semibold text-green-600">
                {formatCurrency(stats.bestTrade)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Worst Trade</span>
              <span className="text-sm font-semibold text-red-600">
                {formatCurrency(stats.worstTrade)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Hold Time</span>
              <span className="text-sm font-semibold">{stats.avgHoldTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Streak</span>
              <span className={`text-sm font-semibold ${stats.currentStreak >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak} trades
              </span>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                  ${action.variant === 'primary' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                  ${action.variant === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                  ${action.variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                `}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Recent Activity
          </h3>
          <div className="space-y-2">
            <div className="text-sm">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">BTC/USDT</span>
                <span className="text-green-600 font-medium">Buy +0.001</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">ETH/USDT</span>
                <span className="text-red-600 font-medium">Sell -0.5</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Bot Started</span>
                <span className="text-blue-600 font-medium">LRO Strategy</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Paper Trading Mode Active</p>
            <p className="text-sm text-blue-700 mt-1">
              You're practicing with virtual money. No real funds are at risk. This is a safe environment to learn and test strategies.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};