import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { invoke } from '@tauri-apps/api/core';
import { TrendingUp, DollarSign, Target, Shield } from 'lucide-react';
import { StatusBadge } from './common/StatusBadge';
import { PnLDisplay } from './common/PnLDisplay';

interface Trade {
  id: string;
  symbol: string;
  side: 'Long' | 'Short';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  status: 'Open' | 'Closed' | 'Cancelled';
  created_at: string;
  closed_at?: string;
  pnl?: number;
}

interface PnLDataPoint {
  timestamp: string;
  pnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

const PnLChart: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pnlData, setPnlData] = useState<PnLDataPoint[]>([]);
  const [stats, setStats] = useState({
    totalPnL: 0,
    realizedPnL: 0,
    unrealizedPnL: 0,
    winRate: 0,
    totalTrades: 0,
    winningTrades: 0,
  });

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTrades = async () => {
    try {
      const paperTrades = await invoke<Trade[]>('get_paper_trades');
      setTrades(paperTrades);
      calculateStats(paperTrades);
      generatePnLData(paperTrades);
    } catch (error) {
      console.error('Failed to load trades:', error);
    }
  };

  const calculateStats = (trades: Trade[]) => {
    const closedTrades = trades.filter(t => t.status === 'Closed');
    const openTrades = trades.filter(t => t.status === 'Open');
    
    const realizedPnL = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const unrealizedPnL = openTrades.reduce((sum, trade) => {
      return sum + (trade.entry_price * 0.01 * (trade.side === 'Long' ? 1 : -1));
    }, 0);
    
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

    setStats({
      totalPnL: realizedPnL + unrealizedPnL,
      realizedPnL,
      unrealizedPnL,
      winRate,
      totalTrades: trades.length,
      winningTrades,
    });
  };

  const generatePnLData = (trades: Trade[]) => {
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let cumulativePnL = 0;
    const data: PnLDataPoint[] = [];

    sortedTrades.forEach((trade) => {
      if (trade.status === 'Closed' && trade.pnl !== undefined) {
        cumulativePnL += trade.pnl;
      }
      
      // Mock unrealized PnL for open trades
      const unrealizedPnL = trade.status === 'Open' 
        ? trade.entry_price * 0.01 * (trade.side === 'Long' ? 1 : -1)
        : 0;

      data.push({
        timestamp: new Date(trade.created_at).toLocaleDateString(),
        pnl: cumulativePnL + unrealizedPnL,
        realizedPnl: cumulativePnL,
        unrealizedPnl: unrealizedPnL,
      });
    });

    setPnlData(data);
  };

  const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    change?: string; 
    icon: React.ReactNode; 
    positive?: boolean 
  }> = ({ title, value, change, icon, positive }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/5 rounded-2xl p-4 border border-white/10"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-white/10 rounded-lg">
          {icon}
        </div>
        {change && (
          <span className={`text-sm font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
            {change}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-white/60">{title}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Portfolio Analytics</h2>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total P/L"
            value={`$${stats.totalPnL.toFixed(2)}`}
            change={`${stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}`}
            icon={<DollarSign className="w-5 h-5 text-blue-400" />}
            positive={stats.totalPnL >= 0}
          />
          
          <StatCard
            title="Realized P/L"
            value={`$${stats.realizedPnL.toFixed(2)}`}
            icon={<Target className="w-5 h-5 text-green-400" />}
            positive={stats.realizedPnL >= 0}
          />
          
          <StatCard
            title="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            change={`${stats.winningTrades}/${stats.totalTrades}`}
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            positive={stats.winRate >= 50}
          />
          
          <StatCard
            title="Total Trades"
            value={stats.totalTrades.toString()}
            icon={<Shield className="w-5 h-5 text-yellow-400" />}
          />
        </div>

        {/* P/L Chart */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">P/L Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnlData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="rgba(255,255,255,0.6)" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.6)" 
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'white' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="realizedPnl" 
                  stroke="#10b981" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Recent Trades */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Recent Trades</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-white/60 text-sm">
                <th className="text-left py-2">Symbol</th>
                <th className="text-left py-2">Side</th>
                <th className="text-left py-2">Quantity</th>
                <th className="text-left py-2">Entry</th>
                <th className="text-left py-2">Exit</th>
                <th className="text-left py-2">P/L</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 10).map((trade) => (
                <tr key={trade.id} className="border-t border-white/10">
                  <td className="py-3 text-white font-medium">{trade.symbol}</td>
                  <td className="py-3">
                    <StatusBadge status={trade.side} variant="trade-side" />
                  </td>
                  <td className="py-3 text-white">{trade.quantity}</td>
                  <td className="py-3 text-white">${trade.entry_price.toFixed(2)}</td>
                  <td className="py-3 text-white">
                    {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3">
                    <PnLDisplay value={trade.pnl} />
                  </td>
                  <td className="py-3">
                    <StatusBadge status={trade.status} variant="trade-status" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default PnLChart;