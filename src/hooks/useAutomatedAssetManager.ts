import { useState, useEffect, useCallback, useRef } from 'react';
import { AssetManager, DEFAULT_CONSERVATIVE_CONFIG } from '../utils/assetManager';
import { AssetManagerState, ProfitSecuringAction, RebalancingSuggestion } from '../types/assetManagement';
import { BotStatus, LROSignal } from '../types/bot';
import { safeInvoke } from '../utils/tauri';

interface AutomatedAssetManagerConfig {
  enabled: boolean;
  auto_rebalance: boolean;
  auto_profit_taking: boolean;
  monitoring_interval: number; // milliseconds
  rebalance_threshold: number; // percentage deviation to trigger rebalance
  profit_taking_threshold: number; // minimum profit percentage to consider taking
}

interface AssetManagerActions {
  type: 'REBALANCE' | 'PROFIT_TAKING' | 'POSITION_SIZING' | 'RISK_ADJUSTMENT';
  symbol: string;
  action: 'BUY' | 'SELL' | 'ADJUST_STOP' | 'PARTIAL_SELL';
  amount: number;
  price?: number;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  executed: boolean;
  timestamp: Date;
}

export const useAutomatedAssetManager = () => {
  const [assetManager] = useState(() => new AssetManager(DEFAULT_CONSERVATIVE_CONFIG));
  const [config, setConfig] = useState<AutomatedAssetManagerConfig>({
    enabled: true,
    auto_rebalance: true,
    auto_profit_taking: true,
    monitoring_interval: 30000, // 30 seconds
    rebalance_threshold: 3.0, // 3% deviation
    profit_taking_threshold: 5.0 // 5% minimum profit
  });
  
  const [state, setState] = useState<AssetManagerState>(assetManager.getState());
  const [pendingActions, setPendingActions] = useState<AssetManagerActions[]>([]);
  const [executedActions, setExecutedActions] = useState<AssetManagerActions[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();
  const lastRebalanceRef = useRef<Date>(new Date());
  const lastProfitCheckRef = useRef<Date>(new Date());

  // Main monitoring loop
  const monitorPortfolio = useCallback(async () => {
    if (!config.enabled || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const updatedState = assetManager.getState();
      setState(updatedState);
      
      const actions: AssetManagerActions[] = [];
      
      // 1. Check for profit-taking opportunities
      if (config.auto_profit_taking) {
        const profitActions = await checkProfitTakingOpportunities();
        actions.push(...profitActions);
      }
      
      // 2. Check for rebalancing needs
      if (config.auto_rebalance) {
        const rebalanceActions = await checkRebalancingNeeds();
        actions.push(...rebalanceActions);
      }
      
      // 3. Check for risk adjustments
      const riskActions = await checkRiskAdjustments();
      actions.push(...riskActions);
      
      // Add new actions to pending queue
      if (actions.length > 0) {
        setPendingActions(prev => [...prev, ...actions]);
        console.log(`🎯 Asset Manager: Generated ${actions.length} automated actions`);
      }
      
      // Execute high-priority actions immediately
      const highPriorityActions = actions.filter(action => action.priority === 'HIGH');
      if (highPriorityActions.length > 0) {
        await executeActions(highPriorityActions);
      }
      
    } catch (error) {
      console.error('Asset Manager monitoring error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [config, isProcessing, assetManager]);

  // Check for automated profit-taking opportunities
  const checkProfitTakingOpportunities = useCallback(async (): Promise<AssetManagerActions[]> => {
    const actions: AssetManagerActions[] = [];
    const profitSecuringActions = assetManager.checkProfitPreservation();
    
    for (const profitAction of profitSecuringActions) {
      if (profitAction.profit_level_achieved >= config.profit_taking_threshold) {
        actions.push({
          type: 'PROFIT_TAKING',
          symbol: profitAction.symbol,
          action: profitAction.action_type === 'partial_sell' ? 'PARTIAL_SELL' : 'ADJUST_STOP',
          amount: profitAction.amount_to_secure,
          reason: `Automated ${profitAction.reason}`,
          priority: profitAction.profit_level_achieved >= 20 ? 'HIGH' : 'MEDIUM',
          executed: false,
          timestamp: new Date()
        });
      }
    }
    
    return actions;
  }, [assetManager, config.profit_taking_threshold]);

  // Check for automated rebalancing needs
  const checkRebalancingNeeds = useCallback(async (): Promise<AssetManagerActions[]> => {
    const actions: AssetManagerActions[] = [];
    const suggestions = assetManager.analyzeRebalancingNeeds();
    
    // Only execute if enough time has passed since last rebalance
    const timeSinceLastRebalance = Date.now() - lastRebalanceRef.current.getTime();
    const minRebalanceInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    if (timeSinceLastRebalance < minRebalanceInterval) {
      return actions;
    }
    
    for (const suggestion of suggestions) {
      // Only execute if deviation exceeds threshold
      const deviation = Math.abs(suggestion.current_allocation - suggestion.target_allocation);
      if (deviation >= config.rebalance_threshold) {
        actions.push({
          type: 'REBALANCE',
          symbol: suggestion.symbol,
          action: suggestion.action === 'buy' ? 'BUY' : 'SELL',
          amount: suggestion.suggested_amount,
          reason: `Automated rebalancing: ${suggestion.reason}`,
          priority: suggestion.priority === 'high' ? 'HIGH' : 'MEDIUM',
          executed: false,
          timestamp: new Date()
        });
      }
    }
    
    return actions;
  }, [assetManager, config.rebalance_threshold]);

  // Check for risk adjustments based on market conditions
  const checkRiskAdjustments = useCallback(async (): Promise<AssetManagerActions[]> => {
    const actions: AssetManagerActions[] = [];
    const portfolioHealth = assetManager.calculatePortfolioHealth();
    
    // If risk health is poor, suggest reducing positions
    if (portfolioHealth.risk_health < 60) {
      const currentPositions = state.current_positions;
      const highRiskPositions = currentPositions.filter(pos => pos.risk_score > 0.7);
      
      for (const position of highRiskPositions.slice(0, 3)) { // Limit to top 3 riskiest
        actions.push({
          type: 'RISK_ADJUSTMENT',
          symbol: position.symbol,
          action: 'SELL',
          amount: position.position_size * 0.3, // Reduce by 30%
          reason: 'Automated risk reduction - high portfolio risk detected',
          priority: 'HIGH',
          executed: false,
          timestamp: new Date()
        });
      }
    }
    
    return actions;
  }, [assetManager, state.current_positions]);

  // Execute automated actions
  const executeActions = useCallback(async (actions: AssetManagerActions[]) => {
    const executedNow: AssetManagerActions[] = [];
    
    for (const action of actions) {
      try {
        console.log(`🔄 Executing automated action: ${action.type} ${action.action} ${action.symbol}`);
        
        let success = false;
        
        switch (action.action) {
          case 'BUY':
            success = await executeBuyOrder(action);
            break;
          case 'SELL':
          case 'PARTIAL_SELL':
            success = await executeSellOrder(action);
            break;
          case 'ADJUST_STOP':
            success = await adjustStopLoss(action);
            break;
        }
        
        if (success) {
          action.executed = true;
          executedNow.push(action);
          console.log(`✅ Successfully executed: ${action.reason}`);
        } else {
          console.log(`❌ Failed to execute: ${action.reason}`);
        }
        
      } catch (error) {
        console.error(`Error executing action for ${action.symbol}:`, error);
      }
    }
    
    // Update state
    setExecutedActions(prev => [...prev, ...executedNow]);
    setPendingActions(prev => prev.filter(action => !executedNow.includes(action)));
    
    return executedNow;
  }, []);

  // Execute buy orders through the bot system
  const executeBuyOrder = useCallback(async (action: AssetManagerActions): Promise<boolean> => {
    try {
      // Calculate optimal position size using asset manager
      const currentPrice = await getCurrentPrice(action.symbol);
      const stopLoss = currentPrice * 0.95; // 5% stop loss
      const optimalSize = assetManager.calculateOptimalPositionSize(
        action.symbol,
        currentPrice,
        stopLoss,
        1.0 // 1% risk
      );
      
      // Execute through bot system
      const result = await safeInvoke('place_automated_order', {
        symbol: action.symbol,
        side: 'BUY',
        quantity: Math.min(optimalSize, action.amount / currentPrice),
        order_type: 'MARKET',
        stop_loss: stopLoss,
        source: 'ASSET_MANAGER',
        reason: action.reason
      });
      
      return result !== null;
    } catch (error) {
      console.error('Buy order execution failed:', error);
      return false;
    }
  }, [assetManager]);

  // Execute sell orders through the bot system
  const executeSellOrder = useCallback(async (action: AssetManagerActions): Promise<boolean> => {
    try {
      const currentPrice = await getCurrentPrice(action.symbol);
      const quantity = action.amount / currentPrice;
      
      const result = await safeInvoke('place_automated_order', {
        symbol: action.symbol,
        side: 'SELL',
        quantity: quantity,
        order_type: 'MARKET',
        source: 'ASSET_MANAGER',
        reason: action.reason
      });
      
      return result !== null;
    } catch (error) {
      console.error('Sell order execution failed:', error);
      return false;
    }
  }, []);

  // Adjust stop loss orders
  const adjustStopLoss = useCallback(async (action: AssetManagerActions): Promise<boolean> => {
    try {
      const result = await safeInvoke('update_stop_loss', {
        symbol: action.symbol,
        new_stop_loss: action.price,
        source: 'ASSET_MANAGER',
        reason: action.reason
      });
      
      return result !== null;
    } catch (error) {
      console.error('Stop loss adjustment failed:', error);
      return false;
    }
  }, []);

  // Get current market price
  const getCurrentPrice = useCallback(async (symbol: string): Promise<number> => {
    try {
      const priceData = await safeInvoke('get_current_price', { symbol });
      return priceData?.price || 50000; // Fallback price
    } catch (error) {
      console.error('Failed to get current price:', error);
      return 50000; // Fallback price
    }
  }, []);

  // React to bot signals and market conditions
  const onBotSignal = useCallback(async (signal: LROSignal, botStatus: BotStatus) => {
    if (!config.enabled) return;
    
    // Update asset manager with current positions
    const currentPositions = botStatus.current_position ? [{
      symbol: botStatus.current_position.symbol,
      asset_class: 'Large Cap Crypto', // Would be determined dynamically
      risk_bucket: 'medium_risk',
      entry_price: botStatus.current_position.entry_price,
      current_price: botStatus.current_position.entry_price, // Would be updated with real price
      position_size: botStatus.current_position.quantity,
      allocation_percentage: 5.0, // Would be calculated
      unrealized_pnl: 0,
      unrealized_pnl_percentage: 0,
      profit_zone_level: 0,
      days_held: 0,
      volatility: 0.05,
      correlation_score: 0.5,
      risk_score: 0.6
    }] : [];
    
    assetManager.updatePositions(currentPositions);
    
    // Check if signal triggers any immediate actions
    if (signal.signal_type !== 'Hold' && signal.strength > 0.7) {
      // High-strength signal - check if we should adjust position sizing
      const actions = await checkPositionSizingAdjustments(signal);
      if (actions.length > 0) {
        setPendingActions(prev => [...prev, ...actions]);
      }
    }
  }, [config.enabled, assetManager]);

  // Check for position sizing adjustments based on signals
  const checkPositionSizingAdjustments = useCallback(async (signal: LROSignal): Promise<AssetManagerActions[]> => {
    const actions: AssetManagerActions[] = [];
    
    // If signal is very strong, consider increasing position size (within limits)
    if (signal.strength > 0.8) {
      const currentPrice = await getCurrentPrice('BTCUSDT'); // Example symbol
      const maxPositionSize = assetManager.calculateOptimalPositionSize(
        'BTCUSDT',
        currentPrice,
        currentPrice * 0.95,
        1.5 // Increase risk slightly for strong signals
      );
      
      actions.push({
        type: 'POSITION_SIZING',
        symbol: 'BTCUSDT',
        action: signal.signal_type === 'Buy' || signal.signal_type === 'StrongBuy' ? 'BUY' : 'SELL',
        amount: maxPositionSize,
        reason: `Strong signal detected (${signal.strength.toFixed(2)}) - adjusting position size`,
        priority: 'MEDIUM',
        executed: false,
        timestamp: new Date()
      });
    }
    
    return actions;
  }, [assetManager]);

  // Start/stop automated monitoring
  useEffect(() => {
    if (config.enabled) {
      monitoringIntervalRef.current = setInterval(monitorPortfolio, config.monitoring_interval);
      console.log('🤖 Automated Asset Manager started');
    } else {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        console.log('🛑 Automated Asset Manager stopped');
      }
    }
    
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [config.enabled, config.monitoring_interval, monitorPortfolio]);

  // Process pending actions periodically
  useEffect(() => {
    if (pendingActions.length > 0 && !isProcessing) {
      const mediumPriorityActions = pendingActions.filter(action => 
        action.priority === 'MEDIUM' && !action.executed
      );
      
      if (mediumPriorityActions.length > 0) {
        // Process medium priority actions with delay
        setTimeout(() => {
          executeActions(mediumPriorityActions.slice(0, 2)); // Process 2 at a time
        }, 5000);
      }
    }
  }, [pendingActions, isProcessing, executeActions]);

  // Manual controls
  const enableAutomation = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: true }));
  }, []);

  const disableAutomation = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: false }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<AutomatedAssetManagerConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const clearExecutedActions = useCallback(() => {
    setExecutedActions([]);
  }, []);

  const cancelPendingActions = useCallback(() => {
    setPendingActions([]);
  }, []);

  return {
    // State
    config,
    state,
    pendingActions,
    executedActions,
    isProcessing,
    
    // Controls
    enableAutomation,
    disableAutomation,
    updateConfig,
    clearExecutedActions,
    cancelPendingActions,
    
    // Event handlers
    onBotSignal,
    
    // Manual triggers
    executeActions,
    monitorPortfolio: () => monitorPortfolio(),
    
    // Statistics
    stats: {
      totalActionsExecuted: executedActions.length,
      pendingActionsCount: pendingActions.length,
      lastMonitoringTime: new Date(),
      profitActionsToday: executedActions.filter(action => 
        action.type === 'PROFIT_TAKING' && 
        action.timestamp.toDateString() === new Date().toDateString()
      ).length,
      rebalanceActionsToday: executedActions.filter(action => 
        action.type === 'REBALANCE' && 
        action.timestamp.toDateString() === new Date().toDateString()
      ).length
    }
  };
};