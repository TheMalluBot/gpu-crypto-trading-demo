import { useState, useEffect, useCallback } from 'react';
import { safeInvoke, isTauriApp } from '../utils/tauri';
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
  timeframe: "1h",
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
  

  const generateMockBotStatus = useCallback(() => {
    const mockStatus: BotStatus = {
      is_active: false, // NEVER auto-start in mock mode - user must explicitly start
      state: 'Stopped', // Use proper state system
      current_position: undefined, // No positions when bot is inactive
      latest_signal: {
        timestamp: new Date().toISOString(),
        lro_value: 0,
        signal_line: 0,
        signal_type: 'Hold' as any, // Always Hold when bot is inactive
        strength: 0,
        market_condition: {
          trend_strength: Math.random(),
          volatility: Math.random(),
          volume_profile: Math.random(),
          market_phase: ['Trending', 'Ranging', 'Breakout', 'Reversal'][Math.floor(Math.random() * 4)] as any,
        }
      },
      performance: {
        total_trades: 0, // No trades when bot is inactive
        winning_trades: 0,
        total_pnl: 0,
        max_drawdown: 0,
        sharpe_ratio: 0,
        avg_hold_time: 0,
        success_rate: 0,
      },
      config: {
        ...config,
        // Ensure auto-resume settings have defaults if missing
        auto_resume_enabled: config.auto_resume_enabled ?? true,
        volatility_resume_threshold_multiplier: config.volatility_resume_threshold_multiplier ?? 0.8,
        data_quality_resume_delay_minutes: config.data_quality_resume_delay_minutes ?? 2,
        connection_resume_delay_minutes: config.connection_resume_delay_minutes ?? 3,
        flash_crash_resume_delay_minutes: config.flash_crash_resume_delay_minutes ?? 10,
        max_auto_pause_duration_hours: config.max_auto_pause_duration_hours ?? 2,
      },
      emergency_stop_triggered: false,
      circuit_breaker_count: 0, // Clean state when inactive
      circuit_breaker_active: false,
      account_balance: config.virtual_balance, // Use configured balance
      daily_loss_tracker: 0, // No losses when inactive
      max_position_hold_hours: config.max_position_hold_hours,
      current_daily_loss: 0,
      positions_auto_closed: 0,
      daily_reset_time: new Date().toISOString(),
      last_circuit_breaker_time: undefined,
      depth_analysis_enabled: true,
    };
    
    setBotStatus(mockStatus);
  }, [config]);

  const loadBotStatus = useCallback(async () => {
    try {
      const status = await safeInvoke<BotStatus>('get_bot_status');
      if (!status) {
        console.warn('No bot status available from backend');
        return;
      }
      setBotStatus(status);
      
      // Ensure minimum viable configuration
      if (status.account_balance <= 0) {
        console.warn('⚠️ Zero balance detected, setting default balance');
        try {
          await safeInvoke('update_account_balance', { balance: 10000 });
          // Reload status after balance update
          const updatedStatus = await safeInvoke<BotStatus>('get_bot_status');
          setBotStatus(updatedStatus);
        } catch (balanceError) {
          console.error('Failed to update balance:', balanceError);
        }
      }
      
      // Set config from status if auto-strategy is disabled
      if (!status.config?.auto_strategy_enabled) {
        setConfig(status.config);
      }
    } catch (error) {
      console.error('Failed to load bot status:', error);
      setBotStatus(null);
    }
  }, [generateMockBotStatus]);

  const generateMockSignals = useCallback(() => {
    const mockSignals: LROSignal[] = [];
    const now = new Date();
    
    for (let i = 50; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
      const lroValue = Math.sin(i * 0.1) * 0.8 + (Math.random() - 0.5) * 0.3;
      const signalLine = lroValue * 0.8 + (Math.random() - 0.5) * 0.2;
      
      let signalType: 'Buy' | 'Sell' | 'StrongBuy' | 'StrongSell' | 'Hold' = 'Hold';
      if (lroValue > 0.8) {
        signalType = lroValue > 0.9 ? 'StrongSell' : 'Sell';
      } else if (lroValue < -0.8) {
        signalType = lroValue < -0.9 ? 'StrongBuy' : 'Buy';
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
      overbought: 0.8,
      oversold: -0.8,
    }));
    
    setChartData(chartPoints);
  }, []);

  const loadSignals = useCallback(async () => {
    try {
      const signalData = await safeInvoke<LROSignal[]>('get_lro_signals', { limit: 50 });
      if (!signalData || signalData.length === 0) {
        console.warn('No signal data available from backend');
        setSignals([]);
        setChartData([]);
        return;
      }
      setSignals(signalData);
      
      const chartPoints: ChartDataPoint[] = signalData.map(signal => ({
        timestamp: signal.timestamp,
        time: new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lro_value: signal.lro_value,
        signal_line: signal.signal_line,
        overbought: 0.8,
        oversold: -0.8,
      })).reverse();
      
      setChartData(chartPoints);
    } catch (error) {
      console.error('Failed to load signals:', error);
      setSignals([]);
      setChartData([]);
    }
  }, [generateMockSignals]);


  const loadPerformanceData = useCallback(async () => {
    try {
      const perfData = await safeInvoke<PerformanceDataPoint[]>('get_bot_performance_history', { days: 30 });
      if (!perfData || perfData.length === 0) {
        console.warn('No performance data available from backend');
        setPerformanceData([]);
        return;
      }
      setPerformanceData(perfData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
      setPerformanceData([]);
    }
  }, []);

  const analyzeMarketConditions = useCallback(async () => {
    try {
      const conditions = await safeInvoke<MarketConditions>('analyze_market_conditions');
      if (!conditions) {
        // Generate mock conditions
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
        return;
      }
      setMarketConditions(conditions);
    } catch (error) {
      console.error('Failed to analyze market conditions:', error);
      setMarketConditions(null);
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
    try {
      const portfolio = await safeInvoke<VirtualPortfolio>('get_virtual_portfolio');
      if (!portfolio) {
        generateMockVirtualPortfolio();
        return;
      }
      setVirtualPortfolio(portfolio);
    } catch (error) {
      console.error('Failed to load virtual portfolio:', error);
      generateMockVirtualPortfolio();
    }
  }, [generateMockVirtualPortfolio]);

  const toggleBot = useCallback(async () => {
    if (!botStatus) return;
    
    setLoading(true);
    try {
      // Pre-startup diagnostics
      if (!botStatus.is_active) {
        console.log('🔍 Starting bot diagnostics...');
        
        // Check for common startup blockers
        if (botStatus.emergency_stop_triggered) {
          throw new Error('Emergency stop is active. Please reset emergency stop first.');
        }
        
        if (!botStatus.config.paper_trading_enabled) {
          throw new Error('Paper trading must be enabled for safety.');
        }
        
        if (botStatus.account_balance <= 0) {
          throw new Error('Account balance must be positive. Current balance: ' + botStatus.account_balance);
        }
        
        console.log('✅ All startup checks passed');
      }
      
      if (isTauriApp()) {
        // Real Tauri environment
        if (botStatus.is_active) {
          await safeInvoke('stop_swing_bot');
          console.log('✅ Bot stopped successfully');
        } else {
          await safeInvoke('start_swing_bot');
          console.log('✅ Bot started successfully');
        }
        await loadBotStatus();
      } else {
        // Web preview mode - update mock status directly
        console.log(`🌐 Web preview mode: ${botStatus.is_active ? 'Stopping' : 'Starting'} bot simulation`);
        const updatedStatus = {
          ...botStatus,
          is_active: !botStatus.is_active
        };
        setBotStatus(updatedStatus);
        console.log(`✅ Bot ${updatedStatus.is_active ? 'started' : 'stopped'} successfully (simulation)`);
      }
    } catch (error) {
      console.error('❌ Failed to toggle bot:', error);
      // Provide user-friendly error messages
      if (error instanceof Error) {
        alert(`Bot Error: ${error.message}`);
      } else {
        alert(`Bot Error: ${String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  }, [botStatus, loadBotStatus]);

  const triggerEmergencyStop = useCallback(async (reason: string) => {
    try {
      if (isTauriApp()) {
        await safeInvoke('trigger_emergency_stop', { reason });
        await loadBotStatus();
      } else {
        // Web preview mode - update mock status
        console.log(`🚨 Web preview mode: Emergency stop triggered - ${reason}`);
        if (botStatus) {
          const updatedStatus = {
            ...botStatus,
            is_active: false,
            emergency_stop_triggered: true
          };
          setBotStatus(updatedStatus);
        }
      }
    } catch (error) {
      console.error('Failed to trigger emergency stop:', error);
    }
  }, [botStatus, loadBotStatus]);

  const pauseBot = useCallback(async (reason?: string) => {
    try {
      if (isTauriApp()) {
        await safeInvoke('pause_swing_bot', { reason });
        await loadBotStatus();
      } else {
        // Web preview mode - update mock status
        console.log(`⏸️ Web preview mode: Bot paused - ${reason || 'Manual pause'}`);
        if (botStatus) {
          const updatedStatus = {
            ...botStatus,
            is_active: false,
            state: 'Paused' as any,
            pause_info: {
              reason: { Manual: null },
              paused_at: new Date().toISOString(),
              auto_resume_at: undefined,
              conditions_for_resume: ['Manual resume required']
            }
          };
          setBotStatus(updatedStatus);
        }
      }
    } catch (error) {
      console.error('Failed to pause bot:', error);
    }
  }, [botStatus, loadBotStatus]);

  const resumeBot = useCallback(async () => {
    try {
      if (isTauriApp()) {
        await safeInvoke('resume_swing_bot');
        await loadBotStatus();
      } else {
        // Web preview mode - update mock status
        console.log('▶️ Web preview mode: Bot resumed');
        if (botStatus) {
          const updatedStatus = {
            ...botStatus,
            is_active: true,
            state: 'Running' as any,
            pause_info: undefined
          };
          setBotStatus(updatedStatus);
        }
      }
    } catch (error) {
      console.error('Failed to resume bot:', error);
      if (error instanceof Error) {
        alert(`Resume Error: ${error.message}`);
      }
    }
  }, [botStatus, loadBotStatus]);

  const resetEmergencyStop = useCallback(async () => {
    try {
      if (isTauriApp()) {
        await safeInvoke('reset_emergency_stop');
        await loadBotStatus();
      } else {
        // Web preview mode - reset mock emergency stop
        console.log('🔄 Web preview mode: Emergency stop reset');
        if (botStatus) {
          const updatedStatus = {
            ...botStatus,
            emergency_stop_triggered: false
          };
          setBotStatus(updatedStatus);
        }
      }
    } catch (error) {
      console.error('Failed to reset emergency stop:', error);
    }
  }, [botStatus, loadBotStatus]);

  const updateAccountBalance = useCallback(async (balance: number) => {
    try {
      await safeInvoke('update_account_balance', { balance });
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
          timeframe: "5m",
          period: 10,
          signal_period: 5,
          stop_loss_percent: 0.5,
          take_profit_percent: 1.0,
          trailing_stop_enabled: true,
          trailing_stop_percent: 0.3,
          // Scalping-specific auto-resume settings
          auto_resume_enabled: true,
          volatility_resume_threshold_multiplier: 0.6,  // More aggressive resume (60%)
          data_quality_resume_delay_minutes: 1,         // Quick resume for data issues
          connection_resume_delay_minutes: 2,           // Quick resume for connection issues
          flash_crash_resume_delay_minutes: 5,          // Short wait for flash crash
          max_auto_pause_duration_hours: 1,             // Max 1 hour pause
        };
        break;
      case 'swing':
        newConfig = {
          ...newConfig,
          timeframe: "1d",
          period: 25,
          signal_period: 9,
          stop_loss_percent: 2.0,
          take_profit_percent: 4.0,
          trailing_stop_enabled: false,
          // Swing trading auto-resume settings
          auto_resume_enabled: true,
          volatility_resume_threshold_multiplier: 0.8,  // Balanced resume (80%)
          data_quality_resume_delay_minutes: 2,         // Standard wait for data issues
          connection_resume_delay_minutes: 3,           // Standard wait for connection issues
          flash_crash_resume_delay_minutes: 10,         // Medium wait for flash crash
          max_auto_pause_duration_hours: 2,             // Max 2 hours pause
        };
        break;
      case 'trend':
        newConfig = {
          ...newConfig,
          timeframe: "4h",
          period: 50,
          signal_period: 20,
          stop_loss_percent: 3.0,
          take_profit_percent: 8.0,
          trailing_stop_enabled: true,
          trailing_stop_percent: 2.0,
          // Trend following auto-resume settings
          auto_resume_enabled: true,
          volatility_resume_threshold_multiplier: 0.9,  // More conservative resume (90%)
          data_quality_resume_delay_minutes: 5,         // Longer wait - can afford it
          connection_resume_delay_minutes: 10,          // Longer wait for connection issues
          flash_crash_resume_delay_minutes: 30,         // Long stabilization period
          max_auto_pause_duration_hours: 6,             // Max 6 hours pause - position trading
        };
        break;
      case 'range':
        newConfig = {
          ...newConfig,
          timeframe: "2h",
          period: 20,
          signal_period: 7,
          stop_loss_percent: 1.5,
          take_profit_percent: 2.5,
          overbought: 0.6,
          oversold: -0.6,
          // Range trading auto-resume settings
          auto_resume_enabled: true,
          volatility_resume_threshold_multiplier: 0.7,  // Moderate resume (70%)
          data_quality_resume_delay_minutes: 2,         // Quick resume for range trading
          connection_resume_delay_minutes: 3,           // Standard wait
          flash_crash_resume_delay_minutes: 8,          // Medium wait - range sensitive
          max_auto_pause_duration_hours: 3,             // Max 3 hours pause
        };
        break;
    }
    
    setConfig(newConfig);
    safeInvoke('update_bot_config', { config: newConfig }).catch(console.error);
  }, [config]);

  useEffect(() => {
    // Load initial data with a small delay to prevent blocking
    const initialLoad = setTimeout(() => {
      loadBotStatus();
      loadSignals();
      loadPerformanceData();
      analyzeMarketConditions();
      loadVirtualPortfolio();
    }, 100);
    
    const interval = setInterval(() => {
      loadBotStatus();
      loadSignals();
      loadPerformanceData();
      analyzeMarketConditions();
      loadVirtualPortfolio();
    }, 5000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, []);

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
    pauseBot,
    resumeBot,
    triggerEmergencyStop,
    resetEmergencyStop,
    updateAccountBalance,
    resetVirtualPortfolio,
    simulateData,
    applyStrategyPreset,
  };
};