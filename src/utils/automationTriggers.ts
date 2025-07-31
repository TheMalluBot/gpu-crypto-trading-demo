// Automation triggers for asset management system
// These functions determine when to execute automated actions

import { BotStatus, LROSignal, MarketConditions } from '../types/bot';
import { AssetManagerState, ProfitSecuringAction } from '../types/assetManagement';

export interface AutomationContext {
  botStatus: BotStatus;
  latestSignal?: LROSignal;
  marketConditions?: MarketConditions;
  assetManagerState: AssetManagerState;
  currentTime: Date;
}

export interface AutomationTrigger {
  id: string;
  name: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  check: (context: AutomationContext) => boolean;
  action?: string;
}

// Profit-taking triggers
export const PROFIT_TAKING_TRIGGERS: AutomationTrigger[] = [
  {
    id: 'profit_zone_10',
    name: '10% Profit Zone',
    description: 'Secure 25% of profits when position reaches 10% gain',
    priority: 'HIGH',
    check: context => {
      if (!context.botStatus.current_position) return false;
      const position = context.botStatus.current_position;
      const profitPercent =
        ((position.entry_price - position.entry_price) / position.entry_price) * 100;
      return profitPercent >= 10;
    },
  },

  {
    id: 'profit_zone_20',
    name: '20% Profit Zone',
    description: 'Secure 50% of profits when position reaches 20% gain',
    priority: 'HIGH',
    check: context => {
      if (!context.botStatus.current_position) return false;
      const position = context.botStatus.current_position;
      const profitPercent =
        ((position.entry_price - position.entry_price) / position.entry_price) * 100;
      return profitPercent >= 20;
    },
  },

  {
    id: 'trailing_stop_trigger',
    name: 'Trailing Stop Activation',
    description: 'Activate trailing stop when profit exceeds 50%',
    priority: 'MEDIUM',
    check: context => {
      if (!context.botStatus.current_position) return false;
      const position = context.botStatus.current_position;
      const profitPercent =
        ((position.entry_price - position.entry_price) / position.entry_price) * 100;
      return profitPercent >= 50;
    },
  },

  {
    id: 'market_reversal_protection',
    name: 'Market Reversal Protection',
    description: 'Secure profits if strong reversal signal detected',
    priority: 'HIGH',
    check: context => {
      if (!context.latestSignal || !context.botStatus.current_position) return false;
      const signal = context.latestSignal;
      const position = context.botStatus.current_position;

      // Check for reversal signals
      const isReversal =
        (signal.signal_type === 'StrongSell' && position.side === 'Long') ||
        (signal.signal_type === 'StrongBuy' && position.side === 'Short');

      return isReversal && signal.strength > 0.8;
    },
  },
];

// Rebalancing triggers
export const REBALANCING_TRIGGERS: AutomationTrigger[] = [
  {
    id: 'allocation_deviation',
    name: 'Allocation Deviation',
    description: 'Rebalance when asset allocation deviates >5% from target',
    priority: 'MEDIUM',
    check: context => {
      const state = context.assetManagerState;
      for (const assetClass of state.config.asset_classes) {
        const deviation = Math.abs(assetClass.current_allocation - assetClass.target_allocation);
        if (deviation > 5.0) return true;
      }
      return false;
    },
  },

  {
    id: 'risk_bucket_overflow',
    name: 'Risk Bucket Overflow',
    description: 'Rebalance when risk bucket exceeds maximum allocation',
    priority: 'HIGH',
    check: context => {
      const state = context.assetManagerState;
      for (const bucket of state.config.risk_buckets) {
        if (bucket.current_allocation > bucket.max_allocation) return true;
      }
      return false;
    },
  },

  {
    id: 'portfolio_drawdown',
    name: 'Portfolio Drawdown',
    description: 'Emergency rebalance if portfolio drawdown exceeds threshold',
    priority: 'HIGH',
    check: context => {
      return context.assetManagerState.portfolio_health.overall_score < 50;
    },
  },

  {
    id: 'time_based_rebalance',
    name: 'Scheduled Rebalancing',
    description: 'Regular rebalancing based on configured frequency',
    priority: 'LOW',
    check: context => {
      const lastRebalance = context.assetManagerState.last_rebalance;
      const frequency = context.assetManagerState.config.rebalancing_frequency;

      let intervalMs = 0;
      switch (frequency) {
        case 'daily':
          intervalMs = 24 * 60 * 60 * 1000;
          break;
        case 'weekly':
          intervalMs = 7 * 24 * 60 * 60 * 1000;
          break;
        case 'monthly':
          intervalMs = 30 * 24 * 60 * 60 * 1000;
          break;
      }

      return context.currentTime.getTime() - lastRebalance.getTime() > intervalMs;
    },
  },
];

// Risk management triggers
export const RISK_MANAGEMENT_TRIGGERS: AutomationTrigger[] = [
  {
    id: 'high_volatility_reduction',
    name: 'High Volatility Position Reduction',
    description: 'Reduce position sizes during high volatility periods',
    priority: 'HIGH',
    check: context => {
      if (!context.marketConditions) return false;
      return context.marketConditions.volatility > 0.08; // 8% volatility threshold
    },
  },

  {
    id: 'correlation_risk',
    name: 'Correlation Risk Management',
    description: 'Reduce correlated positions when correlation exceeds limits',
    priority: 'MEDIUM',
    check: context => {
      // Check if portfolio has high correlation risk
      return context.assetManagerState.portfolio_health.correlation_health < 60;
    },
  },

  {
    id: 'flash_crash_protection',
    name: 'Flash Crash Protection',
    description: 'Emergency position reduction during flash crash events',
    priority: 'HIGH',
    check: context => {
      if (!context.marketConditions || !context.latestSignal) return false;

      // Detect rapid price movement
      const rapidMovement = Math.abs(context.marketConditions.price_momentum) > 0.15; // >15% movement
      const highVolatility = context.marketConditions.volatility > 0.12; // >12% volatility

      return rapidMovement && highVolatility;
    },
  },
];

// Position sizing triggers
export const POSITION_SIZING_TRIGGERS: AutomationTrigger[] = [
  {
    id: 'strong_signal_sizing',
    name: 'Strong Signal Position Sizing',
    description: 'Increase position size for high-confidence signals',
    priority: 'MEDIUM',
    check: context => {
      if (!context.latestSignal) return false;
      return (
        context.latestSignal.strength > 0.85 &&
        (context.latestSignal.signal_type === 'StrongBuy' ||
          context.latestSignal.signal_type === 'StrongSell')
      );
    },
  },

  {
    id: 'market_regime_sizing',
    name: 'Market Regime Position Sizing',
    description: 'Adjust position sizes based on market regime',
    priority: 'LOW',
    check: context => {
      if (!context.marketConditions) return false;

      // Increase size in trending markets, reduce in volatile markets
      const isTrending = context.marketConditions.trend_strength > 0.7;
      const isVolatile = context.marketConditions.market_regime === 'Volatile';

      return isTrending || isVolatile;
    },
  },
];

// Combined trigger evaluation
export class AutomationTriggerEngine {
  private static instance: AutomationTriggerEngine;

  private constructor() {}

  public static getInstance(): AutomationTriggerEngine {
    if (!AutomationTriggerEngine.instance) {
      AutomationTriggerEngine.instance = new AutomationTriggerEngine();
    }
    return AutomationTriggerEngine.instance;
  }

  public evaluateAllTriggers(context: AutomationContext): {
    profitTaking: AutomationTrigger[];
    rebalancing: AutomationTrigger[];
    riskManagement: AutomationTrigger[];
    positionSizing: AutomationTrigger[];
  } {
    return {
      profitTaking: this.evaluateTriggers(PROFIT_TAKING_TRIGGERS, context),
      rebalancing: this.evaluateTriggers(REBALANCING_TRIGGERS, context),
      riskManagement: this.evaluateTriggers(RISK_MANAGEMENT_TRIGGERS, context),
      positionSizing: this.evaluateTriggers(POSITION_SIZING_TRIGGERS, context),
    };
  }

  private evaluateTriggers(
    triggers: AutomationTrigger[],
    context: AutomationContext
  ): AutomationTrigger[] {
    return triggers.filter(trigger => {
      try {
        return trigger.check(context);
      } catch (error) {
        console.error(`Error evaluating trigger ${trigger.id}:`, error);
        return false;
      }
    });
  }

  public getHighPriorityTriggers(context: AutomationContext): AutomationTrigger[] {
    const allResults = this.evaluateAllTriggers(context);
    const allTriggers = [
      ...allResults.profitTaking,
      ...allResults.rebalancing,
      ...allResults.riskManagement,
      ...allResults.positionSizing,
    ];

    return allTriggers
      .filter(trigger => trigger.priority === 'HIGH')
      .sort((a, b) => {
        // Sort by priority and then by type (profit taking first)
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }
}

// Helper functions for automation decision making
export const AutomationHelpers = {
  calculateProfitPercentage: (
    entryPrice: number,
    currentPrice: number,
    side: 'Long' | 'Short'
  ): number => {
    if (side === 'Long') {
      return ((currentPrice - entryPrice) / entryPrice) * 100;
    } else {
      return ((entryPrice - currentPrice) / entryPrice) * 100;
    }
  },

  shouldReduceRisk: (portfolioHealth: number, marketVolatility: number): boolean => {
    return portfolioHealth < 70 || marketVolatility > 0.1;
  },

  calculateOptimalRebalanceAmount: (
    currentAllocation: number,
    targetAllocation: number,
    totalCapital: number
  ): number => {
    const deviationPercent = targetAllocation - currentAllocation;
    return (deviationPercent / 100) * totalCapital;
  },

  isMarketConditionFavorable: (marketConditions: MarketConditions): boolean => {
    return (
      marketConditions.trend_strength > 0.6 &&
      marketConditions.volatility < 0.08 &&
      marketConditions.market_regime !== 'Volatile'
    );
  },
};
