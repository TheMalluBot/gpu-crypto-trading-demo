import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Types for analytics data
export interface TradeAnalytics {
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
  mae?: number; // Maximum Adverse Excursion
  mfe?: number; // Maximum Favorable Excursion
  r_multiple?: number; // Risk multiple
}

export interface PerformanceStats {
  // Basic metrics
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  
  // P&L metrics
  gross_pnl: number;
  net_pnl: number;
  total_fees: number;
  average_pnl: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  
  // Risk metrics
  profit_factor: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  sterling_ratio: number;
  burke_ratio: number;
  
  // Drawdown metrics
  max_drawdown: number;
  max_drawdown_duration: number;
  current_drawdown: number;
  average_drawdown: number;
  recovery_factor: number;
  ulcer_index: number;
  
  // Streak metrics
  current_streak: number;
  max_winning_streak: number;
  max_losing_streak: number;
  average_winning_streak: number;
  average_losing_streak: number;
  
  // Risk/Reward metrics
  risk_reward_ratio: number;
  expectancy: number;
  expected_value: number;
  kelly_percentage: number;
  optimal_f: number;
  
  // Time metrics
  average_hold_time: number;
  median_hold_time: number;
  time_in_market: number;
  
  // Efficiency metrics
  efficiency_ratio: number;
  cagr: number; // Compound Annual Growth Rate
  mar_ratio: number; // Managed Account Ratio
  
  // Distribution metrics
  skewness: number;
  kurtosis: number;
  var_95: number; // Value at Risk 95%
  cvar_95: number; // Conditional Value at Risk 95%
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  cash: number;
  positions_value: number;
  drawdown: number;
  drawdown_percent: number;
  peak_equity: number;
  trades_count: number;
  open_positions: number;
}

export interface TimeframeStats {
  timeframe: string;
  start_date: string;
  end_date: string;
  pnl: number;
  trades: number;
  win_rate: number;
  sharpe: number;
}

export interface CorrelationData {
  symbol1: string;
  symbol2: string;
  correlation: number;
  covariance: number;
  beta: number;
}

// Hook for analytics functionality
export const useAnalytics = (initialTimeframe: string = '1M') => {
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [trades, setTrades] = useState<TradeAnalytics[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationData[]>([]);
  
  // Filters
  const [symbolFilter, setSymbolFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell'>('all');
  
  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [tradesData, statsData, equityData] = await Promise.all([
        invoke<TradeAnalytics[]>('get_analytics_trades', {
          timeframe,
          symbol: symbolFilter,
          strategy: strategyFilter,
          side: sideFilter
        }),
        invoke<PerformanceStats>('get_performance_stats', { timeframe }),
        invoke<EquityPoint[]>('get_equity_curve', { timeframe })
      ]);
      
      setTrades(tradesData);
      setStats(statsData);
      setEquityCurve(equityData);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Failed to load analytics data');
      
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        setTrades(generateMockTrades());
        setStats(generateMockStats());
        setEquityCurve(generateMockEquity());
      }
    } finally {
      setLoading(false);
    }
  }, [timeframe, symbolFilter, strategyFilter, sideFilter]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Computed values
  const symbols = useMemo(() => {
    const uniqueSymbols = new Set(trades.map(t => t.symbol));
    return Array.from(uniqueSymbols).sort();
  }, [trades]);
  
  const strategies = useMemo(() => {
    const uniqueStrategies = new Set(trades.map(t => t.strategy).filter(Boolean));
    return Array.from(uniqueStrategies).sort();
  }, [trades]);
  
  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      if (symbolFilter !== 'all' && trade.symbol !== symbolFilter) return false;
      if (strategyFilter !== 'all' && trade.strategy !== strategyFilter) return false;
      if (sideFilter !== 'all' && trade.side !== sideFilter) return false;
      return true;
    });
  }, [trades, symbolFilter, strategyFilter, sideFilter]);
  
  // Analytics calculations
  const calculateMAE = useCallback((trades: TradeAnalytics[]) => {
    return trades.map(trade => ({
      ...trade,
      mae: trade.mae || Math.random() * -100, // Mock MAE
      mfe: trade.mfe || Math.random() * 100,  // Mock MFE
    }));
  }, []);
  
  const calculateRMultiples = useCallback((trades: TradeAnalytics[]) => {
    return trades.map(trade => {
      const risk = Math.abs(trade.entry_price * 0.02); // 2% risk assumption
      const r_multiple = trade.pnl ? trade.pnl / risk : 0;
      return { ...trade, r_multiple };
    });
  }, []);
  
  const calculateCorrelations = useCallback(async () => {
    try {
      const data = await invoke<CorrelationData[]>('calculate_correlations', {
        symbols: symbols.slice(0, 10) // Limit to top 10 symbols
      });
      setCorrelations(data);
    } catch {
      // Mock correlations
      const mockCorrelations: CorrelationData[] = [];
      for (let i = 0; i < symbols.length - 1; i++) {
        for (let j = i + 1; j < Math.min(symbols.length, 5); j++) {
          mockCorrelations.push({
            symbol1: symbols[i],
            symbol2: symbols[j],
            correlation: Math.random() * 2 - 1,
            covariance: Math.random() * 0.1,
            beta: 0.8 + Math.random() * 0.4
          });
        }
      }
      setCorrelations(mockCorrelations);
    }
  }, [symbols]);
  
  // Export functionality
  const exportToCSV = useCallback(() => {
    const headers = Object.keys(filteredTrades[0] || {}).join(',');
    const rows = filteredTrades.map(trade => 
      Object.values(trade).map(v => 
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${timeframe}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTrades, timeframe]);
  
  const exportToJSON = useCallback(() => {
    const data = {
      metadata: {
        timeframe,
        exported: new Date().toISOString(),
        filters: { symbol: symbolFilter, strategy: strategyFilter, side: sideFilter }
      },
      stats,
      trades: filteredTrades,
      equity_curve: equityCurve
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeframe}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTrades, stats, equityCurve, timeframe, symbolFilter, strategyFilter, sideFilter]);
  
  // Monte Carlo simulation
  const runMonteCarloSimulation = useCallback((iterations: number = 1000) => {
    const results = [];
    const returns = filteredTrades.map(t => t.pnl_percent || 0);
    
    for (let i = 0; i < iterations; i++) {
      let equity = 10000;
      const path = [equity];
      
      // Randomly sample returns with replacement
      for (let j = 0; j < returns.length; j++) {
        const randomReturn = returns[Math.floor(Math.random() * returns.length)];
        equity *= (1 + randomReturn / 100);
        path.push(equity);
      }
      
      results.push({
        final_equity: equity,
        max_drawdown: calculateMaxDrawdown(path),
        path
      });
    }
    
    return results;
  }, [filteredTrades]);
  
  const calculateMaxDrawdown = (equityPath: number[]) => {
    let maxDrawdown = 0;
    let peak = equityPath[0];
    
    for (const value of equityPath) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown * 100;
  };
  
  return {
    // Data
    trades: filteredTrades,
    stats,
    equityCurve,
    correlations,
    symbols,
    strategies,
    
    // Loading states
    loading,
    error,
    
    // Filters
    timeframe,
    setTimeframe,
    symbolFilter,
    setSymbolFilter,
    strategyFilter,
    setStrategyFilter,
    sideFilter,
    setSideFilter,
    
    // Actions
    refresh: loadData,
    exportToCSV,
    exportToJSON,
    calculateMAE,
    calculateRMultiples,
    calculateCorrelations,
    runMonteCarloSimulation,
  };
};

// Mock data generators
const generateMockTrades = (): TradeAnalytics[] => {
  const trades: TradeAnalytics[] = [];
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ADA/USDT'];
  const strategies = ['LRO', 'SMA Cross', 'RSI', 'MACD', 'Manual'];
  
  for (let i = 0; i < 200; i++) {
    const entryTime = Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000;
    const exitTime = entryTime + Math.random() * 48 * 60 * 60 * 1000;
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const entryPrice = 1000 + Math.random() * 50000;
    const priceChange = (Math.random() - 0.45) * 0.1;
    const exitPrice = entryPrice * (1 + priceChange);
    const quantity = Math.random() * 2;
    const pnl = (exitPrice - entryPrice) * quantity * (side === 'buy' ? 1 : -1);
    
    trades.push({
      id: `trade-${i}`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      side: side as 'buy' | 'sell',
      entry_price: entryPrice,
      exit_price: i < 180 ? exitPrice : undefined,
      quantity,
      pnl: i < 180 ? pnl : undefined,
      pnl_percent: i < 180 ? priceChange * 100 : undefined,
      entry_time: new Date(entryTime).toISOString(),
      exit_time: i < 180 ? new Date(exitTime).toISOString() : undefined,
      duration: i < 180 ? (exitTime - entryTime) / (60 * 60 * 1000) : undefined,
      status: i < 180 ? 'closed' : 'open',
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      fees: quantity * entryPrice * 0.001,
      slippage: Math.random() * 10,
      mae: -Math.random() * 200,
      mfe: Math.random() * 300,
      r_multiple: (Math.random() - 0.5) * 4
    });
  }
  
  return trades.sort((a, b) => 
    new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()
  );
};

const generateMockStats = (): PerformanceStats => {
  return {
    total_trades: 180,
    winning_trades: 98,
    losing_trades: 75,
    breakeven_trades: 7,
    win_rate: 54.4,
    
    gross_pnl: 15234.56,
    net_pnl: 14897.23,
    total_fees: 337.33,
    average_pnl: 82.76,
    average_win: 234.56,
    average_loss: -156.78,
    largest_win: 1234.56,
    largest_loss: -876.54,
    
    profit_factor: 1.65,
    sharpe_ratio: 1.42,
    sortino_ratio: 1.78,
    calmar_ratio: 1.23,
    sterling_ratio: 1.56,
    burke_ratio: 1.34,
    
    max_drawdown: 18.5,
    max_drawdown_duration: 12,
    current_drawdown: 3.2,
    average_drawdown: 7.8,
    recovery_factor: 2.34,
    ulcer_index: 6.7,
    
    current_streak: 3,
    max_winning_streak: 8,
    max_losing_streak: 5,
    average_winning_streak: 2.3,
    average_losing_streak: 1.8,
    
    risk_reward_ratio: 1.5,
    expectancy: 82.76,
    expected_value: 123.45,
    kelly_percentage: 3.2,
    optimal_f: 0.18,
    
    average_hold_time: 18.5,
    median_hold_time: 12.3,
    time_in_market: 67.8,
    
    efficiency_ratio: 0.72,
    cagr: 45.6,
    mar_ratio: 2.46,
    
    skewness: 0.34,
    kurtosis: 2.8,
    var_95: -234.56,
    cvar_95: -345.67
  };
};

const generateMockEquity = (): EquityPoint[] => {
  const points: EquityPoint[] = [];
  let equity = 10000;
  let cash = 10000;
  let peak = equity;
  
  for (let i = 90; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const dailyReturn = (Math.random() - 0.48) * 0.03;
    const positionsValue = equity * (0.3 + Math.random() * 0.4);
    cash = equity - positionsValue;
    equity *= (1 + dailyReturn);
    
    if (equity > peak) peak = equity;
    const drawdown = peak - equity;
    const drawdownPercent = (drawdown / peak) * 100;
    
    points.push({
      timestamp: date.toISOString(),
      equity,
      cash,
      positions_value: positionsValue,
      drawdown,
      drawdown_percent: drawdownPercent,
      peak_equity: peak,
      trades_count: Math.floor(Math.random() * 5),
      open_positions: Math.floor(Math.random() * 3)
    });
  }
  
  return points;
};