import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Zap, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BotStatus, PerformanceDataPoint } from '../../types/bot';

interface PerformanceMetricsProps {
  botStatus: BotStatus;
  performanceData: PerformanceDataPoint[];
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  botStatus,
  performanceData
}) => {
  return (
    <>
      {/* Performance Stats Card */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-morphic p-6 z-content"
      >
        <h3 className="text-xl font-bold text-white mb-4">Performance</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-white/80 text-sm">Total Trades</span>
            </div>
            <span className="text-xl font-bold text-white">{botStatus.performance.total_trades}</span>
          </div>
          
          <div className="glass-card p-3">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white/80 text-sm">Win Rate</span>
            </div>
            <span className="text-xl font-bold text-white">{(botStatus.performance.success_rate * 100).toFixed(1)}%</span>
          </div>
          
          <div className="glass-card p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-white/80 text-sm">Total P/L</span>
            </div>
            <span className={`text-xl font-bold ${
              botStatus.performance.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              ${botStatus.performance.total_pnl.toFixed(2)}
            </span>
          </div>
          
          <div className="glass-card p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-white/80 text-sm">Max Drawdown</span>
            </div>
            <span className="text-xl font-bold text-red-400">
              ${botStatus.performance.max_drawdown.toFixed(2)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-morphic p-6 z-content"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Performance Over Time</h3>
          <div className="flex space-x-2">
            <span className="text-xs text-white/60">Last 30 days</span>
          </div>
        </div>

        {performanceData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="time" 
                  stroke="rgba(255,255,255,0.6)"
                  fontSize={10}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.6)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'total_pnl') return [`$${value.toFixed(2)}`, 'Total P&L'];
                    if (name === 'cumulative_return') return [`${value.toFixed(2)}%`, 'Return %'];
                    if (name === 'win_rate') return [`${value.toFixed(1)}%`, 'Win Rate'];
                    return [value, name];
                  }}
                />
                <Legend />
                
                {/* Zero line for reference */}
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
                
                {/* Performance lines */}
                <Line 
                  type="monotone" 
                  dataKey="total_pnl" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Total P&L ($)"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative_return" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Return %"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="win_rate" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Win Rate %"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-white/60">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No performance data available</p>
              <p className="text-sm">Start trading to track performance</p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="glass-card p-3 text-center">
            <div className="text-white/60 text-sm">Total Return</div>
            <div className={`text-lg font-bold ${
              botStatus.performance.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {botStatus.performance.total_pnl >= 0 ? '+' : ''}
              {((botStatus.performance.total_pnl / 10000) * 100).toFixed(2)}%
            </div>
          </div>
          
          <div className="glass-card p-3 text-center">
            <div className="text-white/60 text-sm">Sharpe Ratio</div>
            <div className="text-lg font-bold text-white">
              {botStatus.performance.sharpe_ratio.toFixed(2)}
            </div>
          </div>
          
          <div className="glass-card p-3 text-center">
            <div className="text-white/60 text-sm">Avg Hold Time</div>
            <div className="text-lg font-bold text-white">
              {(botStatus.performance.avg_hold_time / 3600).toFixed(1)}h
            </div>
          </div>
          
          <div className="glass-card p-3 text-center">
            <div className="text-white/60 text-sm">Winning Trades</div>
            <div className="text-lg font-bold text-green-400">
              {botStatus.performance.winning_trades}/{botStatus.performance.total_trades}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};