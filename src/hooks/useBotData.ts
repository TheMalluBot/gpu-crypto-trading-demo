import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  BotStatus,
  LROSignal,
  ChartDataPoint,
  PerformanceDataPoint,
  MarketConditions,
  VirtualPortfolio,
  LROConfig,
  PaperTrade
} from '../types/bot';

const defaultConfig: LROConfig = {
  period: 25,
  signal_period: 9,
  overbought: 0.8,
  oversold: -0.8,
  min_swing_bars: 5,
  adaptive_enabled: true,
  stop_loss_percent: 2.0,
  take_profit_percent: 4.0,
  max_position_size: 1000,
  max_daily_loss: 100,
  trailing_stop_enabled: false,
  trailing_stop_percent: 1.0,
  auto_strategy_enabled: false,
  market_adaptation_level: 'Moderate',
  paper_trading_enabled: true,
  virtual_balance: 10000,
  emergency_stop_enabled: true,
  circuit_breaker_enabled: true,
  max_position_hold_hours: 24,
  signal_strength_threshold: 0.6,
};

export const useBotData = () => {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [signals, setSignals] = useState<LROSignal[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [marketConditions, setMarketConditions] = useState<MarketConditions | null>(null);
  const [virtualPortfolio, setVirtualPortfolio] = useState<VirtualPortfolio | null>(null);
  const [config, setConfig] = useState<LROConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  
  // Performance optimization refs
  const lastDataHash = useRef<{ [key: string]: string }>({});
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const dataCache = useRef<{ [key: string]: { data: any; timestamp: number } }>({});

  const generateMockBotStatus = useCallback(() => {
    const mockStatus: BotStatus = {
      is_active: Math.random() > 0.5,
      current_position: Math.random() > 0.6 ? {
        symbol: 'BTCUSDT',
        side: Math.random() > 0.5 ? 'Long' : 'Short',
        entry_price: 45000 + Math.random() * 10000,
        quantity: 0.1 + Math.random() * 0.5,
        entry_time: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        stop_loss: 44000 + Math.random() * 8000,
        take_profit: 48000 + Math.random() * 12000,
      } : undefined,
      latest_signal: {
        timestamp: new Date().toISOString(),
        lro_value: (Math.random() - 0.5) * 1.8,
        signal_line: (Math.random() - 0.5) * 1.6,
        signal_type: ['Buy', 'Sell', 'StrongBuy', 'StrongSell', 'Hold'][Math.floor(Math.random() * 5)] as any,
        strength: Math.random(),
        market_condition: {
          trend_strength: Math.random(),
          volatility: Math.random(),
          volume_profile: Math.random(),
          market_phase: ['Trending', 'Ranging', 'Breakout', 'Reversal'][Math.floor(Math.random() * 4)] as any,
        }
      },
      performance: {
        total_trades: 45 + Math.floor(Math.random() * 50),
        winning_trades: 28 + Math.floor(Math.random() * 25),
        total_pnl: (Math.random() - 0.3) * 500,
        max_drawdown: -Math.random() * 150,
        sharpe_ratio: 0.5 + Math.random() * 1.5,
        avg_hold_time: 2 + Math.random() * 10,
        success_rate: 0.5 + Math.random() * 0.3,
      },
      config: config,
      emergency_stop_triggered: false,
      circuit_breaker_count: Math.floor(Math.random() * 3),
      circuit_breaker_active: Math.random() > 0.8,
      account_balance: 10000 + Math.random() * 5000,
      daily_loss_tracker: Math.random() * 50,
      max_position_hold_hours: config.max_position_hold_hours,
      current_daily_loss: Math.random() * 25,
      positions_auto_closed: Math.floor(Math.random() * 5),
      daily_reset_time: new Date().toISOString(),
      last_circuit_breaker_time: Math.random() > 0.8 ? new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString() : undefined,
      depth_analysis_enabled: true,
    };
    
    setBotStatus(mockStatus);
  }, [config]);

  const loadBotStatus = useCallback(async () => {
    try {
      const status = await invoke<BotStatus>('get_bot_status');
      setBotStatus(status);
      
      if (!config.auto_strategy_enabled) {
        setConfig(status.config);
      } else {
        setConfig(prev => ({
          ...status.config,
          market_adaptation_level: prev.market_adaptation_level,
          auto_strategy_enabled: prev.auto_strategy_enabled
        }));
      }
    } catch (error) {
      console.error('Failed to load bot status:', error);
      generateMockBotStatus();
    }
  }, [config.auto_strategy_enabled, generateMockBotStatus]);

  const generateMockSignals = useCallback(() => {
    const mockSignals: LROSignal[] = [];
    const now = new Date();
    
    for (let i = 50; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
      const lroValue = Math.sin(i * 0.1) * 0.8 + (Math.random() - 0.5) * 0.3;
      const signalLine = lroValue * 0.8 + (Math.random() - 0.5) * 0.2;
      
      let signalType: 'Buy' | 'Sell' | 'StrongBuy' | 'StrongSell' | 'Hold' = 'Hold';
      if (lroValue > config.overbought) {
        signalType = lroValue > config.overbought + 0.1 ? 'StrongSell' : 'Sell';
      } else if (lroValue < config.oversold) {
        signalType = lroValue < config.oversold - 0.1 ? 'StrongBuy' : 'Buy';
      }

      mockSignals.push({
        timestamp: timestamp.toISOString(),
        lro_value: lroValue,
        signal_line: signalLine,
        signal_type: signalType,
        strength: Math.abs(lroValue) / 1.0,
        market_condition: {
          trend_strength: Math.random(),
          volatility: Math.random() * 0.5 + 0.2,
          volume_profile: Math.random(),
          market_phase: ['Trending', 'Ranging', 'Breakout', 'Reversal'][Math.floor(Math.random() * 4)] as any,
        }
      });
    }
    
    setSignals(mockSignals.reverse());
    
    const chartPoints: ChartDataPoint[] = mockSignals.map(signal => ({
      timestamp: signal.timestamp,
      time: new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lro_value: signal.lro_value,
      signal_line: signal.signal_line,
      overbought: config.overbought,
      oversold: config.oversold,
    }));
    
    setChartData(chartPoints);
  }, [config.overbought, config.oversold]);

  const loadSignals = useCallback(async () => {
    try {
      const signalData = await invoke<LROSignal[]>('get_lro_signals', { limit: 50 });
      setSignals(signalData);
      
      const chartPoints: ChartDataPoint[] = signalData.map(signal => ({
        timestamp: signal.timestamp,
        time: new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lro_value: signal.lro_value,
        signal_line: signal.signal_line,
        overbought: config.overbought,
        oversold: config.oversold,
      })).reverse();
      
      setChartData(chartPoints);
    } catch (error) {
      console.error('Failed to load signals:', error);
      generateMockSignals();
    }
  }, [config.overbought, config.oversold, generateMockSignals]);

  const generateMockPerformanceData = useCallback(() => {
    const mockData: PerformanceDataPoint[] = [];
    const now = new Date();
    let cumulativePnL = 0;
    let maxDrawdown = 0;
    let winCount = 0;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dailyReturn = (Math.random() - 0.45) * 20;
      cumulativePnL += dailyReturn;
      
      if (cumulativePnL < maxDrawdown) {
        maxDrawdown = cumulativePnL;
      }
      
      if (dailyReturn > 0) winCount++;
      
      mockData.push({
        timestamp: date.toISOString(),
        time: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        total_pnl: cumulativePnL,
        cumulative_return: (cumulativePnL / 10000) * 100,
        drawdown: maxDrawdown,
        win_rate: (winCount / (31 - i)) * 100,
      });
    }
    
    setPerformanceData(mockData);
  }, []);

  const loadPerformanceData = useCallback(async () => {
    try {
      const perfData = await invoke<PerformanceDataPoint[]>('get_performance_data', { days: 30 });
      setPerformanceData(perfData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
      generateMockPerformanceData();
    }
  }, [generateMockPerformanceData]);

  const analyzeMarketConditions = useCallback(async () => {
    try {
      const conditions = await invoke<MarketConditions>('analyze_market_conditions');
      setMarketConditions(conditions);
    } catch (error) {
      console.error('Failed to analyze market conditions:', error);
      
      const time = Date.now();
      const cyclePeriod = 60000;
      const cyclePhase = (time % cyclePeriod) / cyclePeriod;
      
      const volatility = 0.3 + Math.sin(cyclePhase * Math.PI * 2) * 0.2 + Math.random() * 0.1;
      const trendStrength = 0.5 + Math.cos(cyclePhase * Math.PI * 2) * 0.3 + Math.random() * 0.1;
      const volumeProfile = 0.4 + Math.sin(cyclePhase * Math.PI * 4) * 0.3 + Math.random() * 0.1;
      const priceMomentum = Math.sin(cyclePhase * Math.PI * 6) * 0.1 + Math.random() * 0.05;
      
      let marketRegime: 'Bull' | 'Bear' | 'Sideways' | 'Volatile' = 'Sideways';
      if (trendStrength > 0.7 && priceMomentum > 0) marketRegime = 'Bull';
      else if (trendStrength > 0.7 && priceMomentum < 0) marketRegime = 'Bear';
      else if (volatility > 0.6) marketRegime = 'Volatile';
      
      setMarketConditions({
        volatility,
        trend_strength: trendStrength,
        volume_profile: volumeProfile,
        price_momentum: priceMomentum,
        market_regime: marketRegime,
      });
    }
  }, []);

  const generateMockVirtualPortfolio = useCallback(() => {
    const paperTrades: PaperTrade[] = [];
    let balance = config.virtual_balance;
    let totalPnL = 0;
    let winningTrades = 0;
    
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(Date.now() - (10 - i) * 4 * 60 * 60 * 1000);
      const side = Math.random() > 0.5 ? 'Long' : 'Short';
      const entryPrice = 45000 + Math.random() * 10000;
      const quantity = (Math.random() * 0.1 + 0.05);
      const isOpen = i >= 8;
      
      let exitPrice, pnl, pnlPercentage;
      if (!isOpen) {
        const priceChange = (Math.random() - 0.4) * 0.1;
        exitPrice = entryPrice * (1 + priceChange);
        pnl = (exitPrice - entryPrice) * quantity * (side === 'Long' ? 1 : -1);
        pnlPercentage = (pnl / (entryPrice * quantity)) * 100;
        
        if (pnl > 0) winningTrades++;
        totalPnL += pnl;
        balance += pnl;
      }
      
      paperTrades.push({
        id: `trade-${i}`,
        timestamp: timestamp.toISOString(),
        symbol: 'BTCUSDT',
        side,
        entry_price: entryPrice,
        exit_price: exitPrice,
        quantity,
        status: isOpen ? 'Open' : 'Closed',
        pnl,
        pnl_percentage: pnlPercentage,
        reason: isOpen ? undefined : (pnl! > 0 ? 'Take Profit' : 'Stop Loss'),
      });
    }
    
    const openTrades = paperTrades.filter(t => t.status === 'Open');
    const currentPrice = 50000;
    let unrealizedPnL = 0;
    
    openTrades.forEach(trade => {
      const pnl = (currentPrice - trade.entry_price) * trade.quantity * (trade.side === 'Long' ? 1 : -1);
      unrealizedPnL += pnl;
    });
    
    setVirtualPortfolio({
      balance,
      equity: balance + unrealizedPnL,
      unrealized_pnl: unrealizedPnL,
      total_trades: paperTrades.length,
      winning_trades: winningTrades,
      paper_trades: paperTrades.reverse(),
    });
  }, [config.virtual_balance]);

  const loadVirtualPortfolio = useCallback(async () => {
    if (!config.paper_trading_enabled) return;
    
    try {
      const portfolio = await invoke<VirtualPortfolio>('get_virtual_portfolio');
      setVirtualPortfolio(portfolio);
    } catch (error) {
      console.error('Failed to load virtual portfolio:', error);
      generateMockVirtualPortfolio();
    }
  }, [config.paper_trading_enabled, generateMockVirtualPortfolio]);

  const toggleBot = useCallback(async () => {
    if (!botStatus) return;
    
    setLoading(true);
    try {
      if (botStatus.is_active) {
        await invoke('stop_bot');
      } else {
        await invoke('start_bot', { config });
      }
      await loadBotStatus();
    } catch (error) {
      console.error('Failed to toggle bot:', error);
    } finally {
      setLoading(false);
    }
  }, [botStatus, config, loadBotStatus]);

  const triggerEmergencyStop = useCallback(async (reason: string) => {
    try {
      await invoke('trigger_emergency_stop', { reason });
      await loadBotStatus();
    } catch (error) {
      console.error('Failed to trigger emergency stop:', error);
    }
  }, [loadBotStatus]);

  const resetEmergencyStop = useCallback(async () => {
    try {
      await invoke('reset_emergency_stop');
      await loadBotStatus();
    } catch (error) {
      console.error('Failed to reset emergency stop:', error);
    }
  }, [loadBotStatus]);

  const updateAccountBalance = useCallback(async (balance: number) => {
    try {
      await invoke('update_account_balance', { balance });
      await loadBotStatus();
    } catch (error) {
      console.error('Failed to update account balance:', error);
    }
  }, [loadBotStatus]);

  const resetVirtualPortfolio = useCallback(() => {
    setVirtualPortfolio({
      balance: config.virtual_balance,
      equity: config.virtual_balance,
      unrealized_pnl: 0,
      total_trades: 0,
      winning_trades: 0,
      paper_trades: [],
    });
  }, [config.virtual_balance]);

  const simulateData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBotStatus(),
        loadSignals(),
        loadPerformanceData(),
        analyzeMarketConditions(),
        loadVirtualPortfolio(),
      ]);
    } catch (error) {
      console.error('Failed to simulate data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadBotStatus, loadSignals, loadPerformanceData, analyzeMarketConditions, loadVirtualPortfolio]);

  const applyStrategyPreset = useCallback((preset: 'scalping' | 'swing' | 'trend' | 'range') => {
    let newConfig = { ...config };
    
    switch (preset) {
      case 'scalping':
        newConfig = {
          ...newConfig,
          period: 10,
          signal_period: 5,
          stop_loss_percent: 0.5,
          take_profit_percent: 1.0,
          trailing_stop_enabled: true,
          trailing_stop_percent: 0.3,
        };
        break;
      case 'swing':
        newConfig = {
          ...newConfig,
          period: 25,
          signal_period: 9,
          stop_loss_percent: 2.0,
          take_profit_percent: 4.0,
          trailing_stop_enabled: false,
        };
        break;
      case 'trend':
        newConfig = {
          ...newConfig,
          period: 50,
          signal_period: 20,
          stop_loss_percent: 3.0,
          take_profit_percent: 8.0,
          trailing_stop_enabled: true,
          trailing_stop_percent: 2.0,
        };
        break;
      case 'range':
        newConfig = {
          ...newConfig,
          period: 20,
          signal_period: 7,
          stop_loss_percent: 1.5,
          take_profit_percent: 2.5,
          overbought: 0.6,
          oversold: -0.6,
        };
        break;
    }
    
    setConfig(newConfig);
    invoke('update_bot_config', { config: newConfig }).catch(console.error);
  }, [config]);

  useEffect(() => {
    loadBotStatus();
    loadSignals();
    loadPerformanceData();
    analyzeMarketConditions();
    loadVirtualPortfolio();
    
    const interval = setInterval(() => {
      loadBotStatus();
      loadSignals();
      loadPerformanceData();
      analyzeMarketConditions();
      
      if (config.paper_trading_enabled) {
        loadVirtualPortfolio();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [config.auto_strategy_enabled, config.paper_trading_enabled, loadBotStatus, loadSignals, loadPerformanceData, analyzeMarketConditions, loadVirtualPortfolio]);

  return {
    // State
    botStatus,
    signals,
    chartData,
    performanceData,
    marketConditions,
    virtualPortfolio,
    config,
    loading,
    
    // Actions
    setConfig,
    toggleBot,
    triggerEmergencyStop,
    resetEmergencyStop,
    updateAccountBalance,
    resetVirtualPortfolio,
    simulateData,
    applyStrategyPreset,
  };
};