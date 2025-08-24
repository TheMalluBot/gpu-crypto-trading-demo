import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/Card';
import { Tabs } from './ui/Tabs';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import { TradingTermTooltip } from './HelpTooltip';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, Treemap
} from 'recharts';
import { 
  TrendingUp, TrendingDown,  
  Award, Target, Download, RefreshCw,
  ChevronUp, ChevronDown, Info, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

// Types
interface TradeData {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  pnl?: number;
  pnl_percent?: number;
  entry_time: string;
  exit_time?: string;
  duration?: number;
  status: 'open' | 'closed' | 'cancelled';
  strategy?: string;
  fees?: number;
  slippage?: number;
}

interface PerformanceMetrics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  max_drawdown_duration: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  consecutive_wins: number;
  consecutive_losses: number;
  expectancy: number;
  kelly_percentage: number;
  risk_reward_ratio: number;
  total_pnl: number;
  total_fees: number;
  net_pnl: number;
  roi: number;
  average_hold_time: number;
  best_day: number;
  worst_day: number;
  recovery_factor: number;
  ulcer_index: number;
  calmar_ratio: number;
}

interface EquityCurvePoint {
  date: string;
  equity: number;
  drawdown: number;
  trades: number;
}

interface SymbolPerformance {
  symbol: string;
  trades: number;
  pnl: number;
  win_rate: number;
  avg_return: number;
}

interface TimeAnalysis {
  hour: number;
  trades: number;
  win_rate: number;
  avg_pnl: number;
}

interface DrawdownPeriod {
  start: string;
  end?: string;
  depth: number;
  duration: number;
  recovered: boolean;
}

export const AdvancedAnalytics: React.FC = () => {
  // State
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [selectedStrategy] = useState<string>('all');
  const [selectedSymbol] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityCurvePoint[]>([]);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [compareMode] = useState(false);
  const [selectedMetric] = useState<'pnl' | 'win_rate' | 'sharpe'>('pnl');

  // Load data
  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe, selectedStrategy, selectedSymbol]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Load real data from backend
      const [tradesData, metricsData, equityData] = await Promise.all([
        invoke<TradeData[]>('get_trades', { timeframe, strategy: selectedStrategy, symbol: selectedSymbol }),
        invoke<PerformanceMetrics>('get_performance_metrics', { timeframe }),
        invoke<EquityCurvePoint[]>('get_equity_curve', { timeframe })
      ]);
      
      setTrades(tradesData);
      setMetrics(metricsData);
      setEquityCurve(equityData);
    } catch (error) {
      // Use mock data for demonstration
      setTrades(generateMockTrades());
      setMetrics(generateMockMetrics());
      setEquityCurve(generateMockEquityCurve());
    } finally {
      setLoading(false);
    }
  };

  // Calculate derived metrics
  const symbolPerformance = useMemo(() => {
    const perfBySymbol = new Map<string, SymbolPerformance>();
    
    trades.forEach(trade => {
      if (trade.status !== 'closed') return;
      
      const existing = perfBySymbol.get(trade.symbol) || {
        symbol: trade.symbol,
        trades: 0,
        pnl: 0,
        win_rate: 0,
        avg_return: 0
      };
      
      existing.trades++;
      existing.pnl += trade.pnl || 0;
      perfBySymbol.set(trade.symbol, existing);
    });
    
    // Calculate win rates
    perfBySymbol.forEach((perf, symbol) => {
      const symbolTrades = trades.filter(t => t.symbol === symbol && t.status === 'closed');
      const wins = symbolTrades.filter(t => (t.pnl || 0) > 0).length;
      perf.win_rate = (wins / symbolTrades.length) * 100;
      perf.avg_return = perf.pnl / perf.trades;
    });
    
    return Array.from(perfBySymbol.values()).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const hourlyPerformance = useMemo(() => {
    const perfByHour = new Map<number, TimeAnalysis>();
    
    for (let hour = 0; hour < 24; hour++) {
      perfByHour.set(hour, { hour, trades: 0, win_rate: 0, avg_pnl: 0 });
    }
    
    trades.forEach(trade => {
      if (trade.status !== 'closed') return;
      const hour = new Date(trade.entry_time).getHours();
      const hourData = perfByHour.get(hour)!;
      hourData.trades++;
      hourData.avg_pnl += (trade.pnl || 0);
    });
    
    perfByHour.forEach(data => {
      if (data.trades > 0) {
        data.avg_pnl /= data.trades;
        const wins = trades.filter(t => 
          new Date(t.entry_time).getHours() === data.hour && 
          t.status === 'closed' && 
          (t.pnl || 0) > 0
        ).length;
        data.win_rate = (wins / data.trades) * 100;
      }
    });
    
    return Array.from(perfByHour.values());
  }, [trades]);

  const drawdownPeriods = useMemo(() => {
    const periods: DrawdownPeriod[] = [];
    let currentDrawdown: DrawdownPeriod | null = null;
    
    equityCurve.forEach((point, index) => {
      if (point.drawdown < 0) {
        if (!currentDrawdown) {
          currentDrawdown = {
            start: point.date,
            depth: point.drawdown,
            duration: 1,
            recovered: false
          };
        } else {
          currentDrawdown.depth = Math.min(currentDrawdown.depth, point.drawdown);
          currentDrawdown.duration++;
        }
      } else if (currentDrawdown) {
        currentDrawdown.end = equityCurve[index - 1]?.date;
        currentDrawdown.recovered = true;
        periods.push(currentDrawdown);
        currentDrawdown = null;
      }
    });
    
    if (currentDrawdown) {
      periods.push(currentDrawdown);
    }
    
    return periods.sort((a, b) => a.depth - b.depth).slice(0, 5);
  }, [equityCurve]);

  // Export functionality
  const exportData = (format: 'csv' | 'json') => {
    const data = {
      metrics,
      trades,
      equityCurve,
      symbolPerformance,
      generated: new Date().toISOString()
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadFile(blob, `trading-analytics-${timeframe}.json`);
    } else {
      // Convert to CSV
      const csv = convertToCSV(trades);
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadFile(blob, `trading-analytics-${timeframe}.csv`);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="text-sm font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? 
              entry.value.toFixed(2) : entry.value}
          </p>
        ))}
      </div>
    );
  };

  // Chart colors
  // const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Advanced Analytics
            <Badge variant="info">Pro</Badge>
          </h1>
          <p className="text-gray-600 mt-1">Deep insights into your trading performance</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Timeframe selector */}
          <Select
            value={timeframe}
            onChange={(value) => setTimeframe(value as any)}
            options={[
              { value: '1D', label: 'Today' },
              { value: '1W', label: 'Week' },
              { value: '1M', label: 'Month' },
              { value: '3M', label: '3 Months' },
              { value: '1Y', label: 'Year' },
              { value: 'ALL', label: 'All Time' }
            ]}
          />
          
          {/* Export button */}
          <Button
            onClick={() => exportData('csv')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          
          {/* Refresh button */}
          <Button
            onClick={loadAnalyticsData}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total P&L */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Net P&L</p>
                  <p className={`text-2xl font-bold ${metrics.net_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${Math.abs(metrics.net_pnl).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.roi.toFixed(2)}% ROI
                  </p>
                </div>
                {metrics.net_pnl >= 0 ? 
                  <TrendingUp className="w-8 h-8 text-green-500" /> :
                  <TrendingDown className="w-8 h-8 text-red-500" />
                }
              </div>
            </Card>
          </motion.div>

          {/* Win Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Win Rate</p>
                  <p className="text-2xl font-bold">{metrics.win_rate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.winning_trades}/{metrics.total_trades} trades
                  </p>
                </div>
                <div className="relative w-12 h-12">
                  <svg className="transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="16"
                      fill="none" stroke="#e5e7eb" strokeWidth="2"
                    />
                    <circle
                      cx="18" cy="18" r="16"
                      fill="none"
                      stroke={metrics.win_rate >= 50 ? '#10b981' : '#ef4444'}
                      strokeWidth="2"
                      strokeDasharray={`${metrics.win_rate} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Profit Factor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-gray-600">Profit Factor</p>
                    <TradingTermTooltip term="profit-factor">
                      <Info className="w-3 h-3 text-gray-400" />
                    </TradingTermTooltip>
                  </div>
                  <p className={`text-2xl font-bold ${metrics.profit_factor >= 1.5 ? 'text-green-500' : metrics.profit_factor >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {metrics.profit_factor.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Target: &gt;1.5
                  </p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </Card>
          </motion.div>

          {/* Sharpe Ratio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-gray-600">Sharpe Ratio</p>
                    <TradingTermTooltip term="sharpe-ratio">
                      <Info className="w-3 h-3 text-gray-400" />
                    </TradingTermTooltip>
                  </div>
                  <p className={`text-2xl font-bold ${metrics.sharpe_ratio >= 2 ? 'text-green-500' : metrics.sharpe_ratio >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {metrics.sharpe_ratio.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Risk-adjusted returns
                  </p>
                </div>
                <Award className="w-8 h-8 text-purple-500" />
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="symbols">By Symbol</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
          <TabsTrigger value="trades">Trade Log</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Equity Curve */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={equityCurve}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorEquity)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* P&L Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">P&L Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={generatePnLDistribution(trades)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Win/Loss Analysis</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Wins', value: metrics?.winning_trades || 0 },
                        { name: 'Losses', value: metrics?.losing_trades || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'performance' && metrics && (
          <>
            {/* Advanced Metrics Grid */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Performance Metrics</h3>
                <Button
                  onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                  variant="outline"
                  size="sm"
                >
                  {showAdvancedMetrics ? 'Show Less' : 'Show More'}
                  {showAdvancedMetrics ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <MetricCard label="Total Trades" value={metrics.total_trades} />
                <MetricCard label="Avg Win" value={`$${metrics.average_win.toFixed(2)}`} color="green" />
                <MetricCard label="Avg Loss" value={`$${Math.abs(metrics.average_loss).toFixed(2)}`} color="red" />
                <MetricCard label="Expectancy" value={`$${metrics.expectancy.toFixed(2)}`} />
                <MetricCard label="Risk/Reward" value={metrics.risk_reward_ratio.toFixed(2)} />
                <MetricCard label="Max Consecutive Wins" value={metrics.consecutive_wins} color="green" />
                <MetricCard label="Max Consecutive Losses" value={metrics.consecutive_losses} color="red" />
                <MetricCard label="Avg Hold Time" value={`${metrics.average_hold_time.toFixed(0)}h`} />
                
                {showAdvancedMetrics && (
                  <>
                    <MetricCard label="Sortino Ratio" value={metrics.sortino_ratio.toFixed(2)} />
                    <MetricCard label="Calmar Ratio" value={metrics.calmar_ratio.toFixed(2)} />
                    <MetricCard label="Recovery Factor" value={metrics.recovery_factor.toFixed(2)} />
                    <MetricCard label="Ulcer Index" value={metrics.ulcer_index.toFixed(2)} />
                    <MetricCard label="Kelly %" value={`${metrics.kelly_percentage.toFixed(1)}%`} />
                    <MetricCard label="Best Day" value={`$${metrics.best_day.toFixed(2)}`} color="green" />
                    <MetricCard label="Worst Day" value={`$${Math.abs(metrics.worst_day).toFixed(2)}`} color="red" />
                    <MetricCard label="Total Fees" value={`$${metrics.total_fees.toFixed(2)}`} />
                  </>
                )}
              </div>
            </Card>

            {/* Monthly Returns Heatmap */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Returns</h3>
              <MonthlyReturnsHeatmap trades={trades} />
            </Card>
          </>
        )}

        {activeTab === 'risk' && (
          <>
            {/* Drawdown Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Drawdown Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Risk Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Risk Metrics</h3>
                <div className="space-y-3">
                  <RiskMetricRow 
                    label="Max Drawdown" 
                    value={`${metrics?.max_drawdown.toFixed(2)}%`}
                    status={metrics?.max_drawdown! > 20 ? 'danger' : metrics?.max_drawdown! > 10 ? 'warning' : 'success'}
                  />
                  <RiskMetricRow 
                    label="Max Drawdown Duration" 
                    value={`${metrics?.max_drawdown_duration} days`}
                    status={metrics?.max_drawdown_duration! > 30 ? 'danger' : 'warning'}
                  />
                  <RiskMetricRow 
                    label="Profit Factor" 
                    value={metrics?.profit_factor.toFixed(2) || '0'}
                    status={metrics?.profit_factor! >= 1.5 ? 'success' : metrics?.profit_factor! >= 1 ? 'warning' : 'danger'}
                  />
                  <RiskMetricRow 
                    label="Sharpe Ratio" 
                    value={metrics?.sharpe_ratio.toFixed(2) || '0'}
                    status={metrics?.sharpe_ratio! >= 2 ? 'success' : metrics?.sharpe_ratio! >= 1 ? 'warning' : 'danger'}
                  />
                  <RiskMetricRow 
                    label="Risk/Reward Ratio" 
                    value={metrics?.risk_reward_ratio.toFixed(2) || '0'}
                    status={metrics?.risk_reward_ratio! >= 2 ? 'success' : metrics?.risk_reward_ratio! >= 1.5 ? 'warning' : 'danger'}
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Worst Drawdown Periods</h3>
                <div className="space-y-2">
                  {drawdownPeriods.map((period, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <div>
                        <p className="text-sm font-medium">
                          {period.depth.toFixed(2)}% depth
                        </p>
                        <p className="text-xs text-gray-600">
                          {period.duration} days ({period.start} - {period.end || 'ongoing'})
                        </p>
                      </div>
                      <Badge variant={period.recovered ? 'success' : 'danger'}>
                        {period.recovered ? 'Recovered' : 'Active'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'symbols' && (
          <>
            {/* Symbol Performance Table */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance by Symbol</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-right py-2">Trades</th>
                      <th className="text-right py-2">P&L</th>
                      <th className="text-right py-2">Win Rate</th>
                      <th className="text-right py-2">Avg Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolPerformance.map((perf, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 font-medium">{perf.symbol}</td>
                        <td className="text-right py-2">{perf.trades}</td>
                        <td className={`text-right py-2 font-semibold ${perf.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${perf.pnl.toFixed(2)}
                        </td>
                        <td className="text-right py-2">{perf.win_rate.toFixed(1)}%</td>
                        <td className={`text-right py-2 ${perf.avg_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${perf.avg_return.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Symbol Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Trading Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <Treemap
                  data={symbolPerformance.map(p => ({
                    name: p.symbol,
                    size: p.trades,
                    value: p.pnl
                  }))}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  fill="#3b82f6"
                />
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {activeTab === 'time' && (
          <>
            {/* Hourly Performance */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance by Hour</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={hourlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="trades" fill="#3b82f6" name="Trades" />
                  <Line yAxisId="right" type="monotone" dataKey="win_rate" stroke="#10b981" name="Win Rate %" />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Day of Week Analysis */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Day of Week Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={generateDayOfWeekData(trades)}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="day" />
                  <PolarRadiusAxis />
                  <Radar name="Trades" dataKey="trades" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Radar name="Avg P&L" dataKey="avgPnl" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {activeTab === 'trades' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-left py-2">Side</th>
                    <th className="text-right py-2">Entry</th>
                    <th className="text-right py-2">Exit</th>
                    <th className="text-right py-2">Quantity</th>
                    <th className="text-right py-2">P&L</th>
                    <th className="text-right py-2">%</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 20).map((trade) => (
                    <tr key={trade.id} className="border-b hover:bg-gray-50 text-sm">
                      <td className="py-2">{new Date(trade.entry_time).toLocaleDateString()}</td>
                      <td className="py-2 font-medium">{trade.symbol}</td>
                      <td className="py-2">
                        <Badge variant={trade.side === 'buy' ? 'success' : 'danger'}>
                          {trade.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="text-right py-2">${trade.entry_price.toFixed(2)}</td>
                      <td className="text-right py-2">
                        {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
                      </td>
                      <td className="text-right py-2">{trade.quantity.toFixed(4)}</td>
                      <td className={`text-right py-2 font-semibold ${(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                      </td>
                      <td className={`text-right py-2 ${(trade.pnl_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.pnl_percent ? `${trade.pnl_percent.toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-2">
                        <Badge variant={
                          trade.status === 'open' ? 'info' : 
                          trade.status === 'closed' ? 'default' : 'warning'
                        }>
                          {trade.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{ label: string; value: string | number; color?: 'green' | 'red' | 'blue' }> = ({ 
  label, value, color 
}) => {
  const colorClass = color === 'green' ? 'text-green-600' : 
                     color === 'red' ? 'text-red-600' : 
                     color === 'blue' ? 'text-blue-600' : '';
  
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
};

const RiskMetricRow: React.FC<{ 
  label: string; 
  value: string; 
  status: 'success' | 'warning' | 'danger' 
}> = ({ label, value, status }) => {
  const statusColors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  };
  
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
      <span className="text-sm font-medium">{label}</span>
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[status]}`}>
        {value}
      </span>
    </div>
  );
};

const MonthlyReturnsHeatmap: React.FC<{ trades: TradeData[] }> = ({ trades }) => {
  // Generate monthly returns data
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    
    return years.map(year => ({
      year,
      ...months.reduce((acc, month, index) => {
        const monthTrades = trades.filter(t => {
          const date = new Date(t.entry_time);
          return date.getFullYear() === year && date.getMonth() === index;
        });
        const pnl = monthTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        acc[month] = pnl;
        return acc;
      }, {} as Record<string, number>)
    }));
  }, [trades]);
  
  const getColor = (value: number) => {
    if (value > 1000) return '#10b981';
    if (value > 0) return '#86efac';
    if (value === 0) return '#e5e7eb';
    if (value > -1000) return '#fca5a5';
    return '#ef4444';
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-2">Year</th>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
              <th key={month} className="text-center py-2 px-1 text-xs">{month}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthlyData.map(yearData => (
            <tr key={yearData.year}>
              <td className="py-2 font-medium">{yearData.year}</td>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                <td key={month} className="p-1">
                  <div
                    className="w-full h-8 rounded flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: getColor(yearData[month]) }}
                  >
                    {yearData[month] !== 0 && (
                      <span className={yearData[month] > 0 ? 'text-white' : 'text-white'}>
                        ${Math.abs(yearData[month]).toFixed(0)}
                      </span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Mock data generators
const generateMockTrades = (): TradeData[] => {
  const trades: TradeData[] = [];
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ADA/USDT'];
  const now = Date.now();
  
  for (let i = 0; i < 100; i++) {
    const entryTime = now - Math.random() * 90 * 24 * 60 * 60 * 1000; // Last 90 days
    const exitTime = entryTime + Math.random() * 24 * 60 * 60 * 1000; // Up to 24 hours later
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const entryPrice = 30000 + Math.random() * 20000;
    const priceChange = (Math.random() - 0.45) * 0.05; // Slight positive bias
    const exitPrice = entryPrice * (1 + (side === 'buy' ? priceChange : -priceChange));
    const quantity = Math.random() * 0.1;
    const pnl = (exitPrice - entryPrice) * quantity * (side === 'buy' ? 1 : -1);
    
    trades.push({
      id: `trade-${i}`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      side: side as 'buy' | 'sell',
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      pnl,
      pnl_percent: (priceChange * 100),
      entry_time: new Date(entryTime).toISOString(),
      exit_time: new Date(exitTime).toISOString(),
      duration: (exitTime - entryTime) / (60 * 60 * 1000),
      status: 'closed',
      strategy: 'LRO',
      fees: quantity * entryPrice * 0.001,
      slippage: Math.random() * 10
    });
  }
  
  return trades.sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime());
};

const generateMockMetrics = (): PerformanceMetrics => {
  const trades = generateMockTrades();
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalFees = trades.reduce((sum, t) => sum + (t.fees || 0), 0);
  
  return {
    total_trades: trades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: (winningTrades.length / trades.length) * 100,
    profit_factor: Math.abs(winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / 
                          losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)),
    sharpe_ratio: 1.5 + Math.random(),
    sortino_ratio: 1.8 + Math.random(),
    max_drawdown: 15 + Math.random() * 10,
    max_drawdown_duration: Math.floor(10 + Math.random() * 20),
    average_win: winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length,
    average_loss: losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length,
    largest_win: Math.max(...winningTrades.map(t => t.pnl || 0)),
    largest_loss: Math.min(...losingTrades.map(t => t.pnl || 0)),
    consecutive_wins: 5 + Math.floor(Math.random() * 5),
    consecutive_losses: 2 + Math.floor(Math.random() * 3),
    expectancy: totalPnl / trades.length,
    kelly_percentage: 2 + Math.random() * 3,
    risk_reward_ratio: 1.5 + Math.random(),
    total_pnl: totalPnl,
    total_fees: totalFees,
    net_pnl: totalPnl - totalFees,
    roi: ((totalPnl - totalFees) / 10000) * 100,
    average_hold_time: trades.reduce((sum, t) => sum + (t.duration || 0), 0) / trades.length,
    best_day: Math.max(...trades.map(t => t.pnl || 0)),
    worst_day: Math.min(...trades.map(t => t.pnl || 0)),
    recovery_factor: 2.5 + Math.random(),
    ulcer_index: 5 + Math.random() * 5,
    calmar_ratio: 1.2 + Math.random()
  };
};

const generateMockEquityCurve = (): EquityCurvePoint[] => {
  const points: EquityCurvePoint[] = [];
  let equity = 10000;
  let maxEquity = equity;
  
  for (let i = 90; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const dailyReturn = (Math.random() - 0.45) * 0.02; // Slight positive bias
    equity *= (1 + dailyReturn);
    maxEquity = Math.max(maxEquity, equity);
    const drawdown = ((equity - maxEquity) / maxEquity) * 100;
    
    points.push({
      date: date.toISOString().split('T')[0],
      equity: Math.round(equity),
      drawdown,
      trades: Math.floor(Math.random() * 5)
    });
  }
  
  return points;
};

const generatePnLDistribution = (trades: TradeData[]) => {
  const ranges = [
    { range: '<-$500', min: -Infinity, max: -500, count: 0 },
    { range: '-$500 to -$200', min: -500, max: -200, count: 0 },
    { range: '-$200 to -$50', min: -200, max: -50, count: 0 },
    { range: '-$50 to $0', min: -50, max: 0, count: 0 },
    { range: '$0 to $50', min: 0, max: 50, count: 0 },
    { range: '$50 to $200', min: 50, max: 200, count: 0 },
    { range: '$200 to $500', min: 200, max: 500, count: 0 },
    { range: '>$500', min: 500, max: Infinity, count: 0 }
  ];
  
  trades.forEach(trade => {
    const pnl = trade.pnl || 0;
    const range = ranges.find(r => pnl >= r.min && pnl < r.max);
    if (range) range.count++;
  });
  
  return ranges;
};

const generateDayOfWeekData = (trades: TradeData[]) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map(day => {
    const dayIndex = days.indexOf(day);
    const dayTrades = trades.filter(t => new Date(t.entry_time).getDay() === dayIndex);
    return {
      day,
      trades: dayTrades.length,
      avgPnl: dayTrades.length > 0 ? 
        dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / dayTrades.length : 0
    };
  });
};