import {
  AssetManagerConfig,
  AssetManagerState,
  AllocationStatus,
  PositionMetrics,
  RebalancingSuggestion,
  ProfitSecuringAction,
  PortfolioHealth,
  ProfitZone,
  RiskBucket,
} from '../types/assetManagement';

export class AssetManager {
  private state: AssetManagerState;

  constructor(config: AssetManagerConfig) {
    this.state = {
      config,
      current_positions: [],
      allocation_status: this.initializeAllocationStatus(),
      portfolio_health: this.initializePortfolioHealth(),
      profit_secured_today: 0,
      last_rebalance: new Date(),
      pending_actions: [],
    };
  }

  // Core allocation management
  public calculateOptimalPositionSize(
    symbol: string,
    entry_price: number,
    stop_loss: number,
    risk_percentage: number = 1.0
  ): number {
    const available_capital = this.getAvailableCapital();
    const risk_per_share = Math.abs(entry_price - stop_loss);
    const max_risk_amount = available_capital * (risk_percentage / 100);

    // Base position size
    let position_size = max_risk_amount / risk_per_share;

    // Apply dynamic sizing based on volatility and correlation
    if (this.state.config.dynamic_sizing_enabled) {
      position_size = this.applyDynamicSizing(symbol, position_size);
    }

    // Ensure position doesn't exceed allocation limits
    position_size = this.enforceAllocationLimits(symbol, position_size, entry_price);

    return Math.floor(position_size);
  }

  // Profit preservation system
  public checkProfitPreservation(): ProfitSecuringAction[] {
    const actions: ProfitSecuringAction[] = [];

    for (const position of this.state.current_positions) {
      const profit_percentage = position.unrealized_pnl_percentage;

      // Check each profit zone
      for (const zone of this.state.config.profit_zones) {
        if (profit_percentage >= zone.level && position.profit_zone_level < zone.level) {
          const action = this.createProfitSecuringAction(position, zone);
          if (action) {
            actions.push(action);
          }
        }
      }

      // Check preservation rules
      for (const rule of this.state.config.profit_preservation_rules) {
        if (profit_percentage >= rule.trigger_profit_percent) {
          const action = this.applyPreservationRule(position, rule);
          if (action) {
            actions.push(action);
          }
        }
      }
    }

    return actions;
  }

  // Allocation rebalancing
  public analyzeRebalancingNeeds(): RebalancingSuggestion[] {
    const suggestions: RebalancingSuggestion[] = [];

    // Check individual asset allocations
    for (const assetClass of this.state.config.asset_classes) {
      const current_allocation = this.getCurrentClassAllocation(assetClass.name);
      const deviation = Math.abs(current_allocation - assetClass.target_allocation);

      if (deviation > 2.0) {
        // 2% threshold
        const suggestion: RebalancingSuggestion = {
          action: current_allocation > assetClass.target_allocation ? 'sell' : 'buy',
          symbol: this.selectBestSymbolInClass(assetClass.name),
          current_allocation,
          target_allocation: assetClass.target_allocation,
          suggested_amount: this.calculateRebalanceAmount(assetClass),
          reason: `Asset class allocation deviation: ${deviation.toFixed(2)}%`,
          priority: deviation > 5.0 ? 'high' : 'medium',
        };
        suggestions.push(suggestion);
      }
    }

    // Check risk bucket allocations
    for (const bucket of this.state.config.risk_buckets) {
      if (bucket.current_allocation > bucket.max_allocation) {
        suggestions.push({
          action: 'sell',
          symbol: this.selectWorstPerformerInBucket(bucket.id),
          current_allocation: bucket.current_allocation,
          target_allocation: bucket.max_allocation,
          suggested_amount:
            ((bucket.current_allocation - bucket.max_allocation) *
              this.state.config.total_capital) /
            100,
          reason: `Risk bucket over-allocated: ${bucket.current_allocation.toFixed(2)}% > ${bucket.max_allocation}%`,
          priority: 'high',
        });
      }
    }

    return suggestions;
  }

  // Portfolio health monitoring
  public calculatePortfolioHealth(): PortfolioHealth {
    const allocation_health = this.calculateAllocationHealth();
    const risk_health = this.calculateRiskHealth();
    const profit_health = this.calculateProfitHealth();
    const correlation_health = this.calculateCorrelationHealth();

    const overall_score =
      (allocation_health + risk_health + profit_health + correlation_health) / 4;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Generate warnings and recommendations
    if (allocation_health < 70) {
      warnings.push('Portfolio allocation significantly deviates from targets');
      recommendations.push('Consider rebalancing to target allocations');
    }

    if (risk_health < 60) {
      warnings.push('High risk concentration detected');
      recommendations.push('Reduce position sizes in high-risk assets');
    }

    if (correlation_health < 50) {
      warnings.push('High correlation between positions increases risk');
      recommendations.push('Diversify into uncorrelated assets');
    }

    return {
      overall_score,
      allocation_health,
      risk_health,
      profit_health,
      correlation_health,
      warnings,
      recommendations,
    };
  }

  // Dynamic position sizing based on market conditions
  private applyDynamicSizing(symbol: string, base_size: number): number {
    const position = this.findPosition(symbol);
    if (!position) return base_size;

    // Volatility adjustment
    const volatility_multiplier = Math.max(0.5, Math.min(1.5, 1 / (1 + position.volatility)));

    // Correlation adjustment
    const correlation_multiplier = Math.max(
      0.7,
      Math.min(1.0, 1 - position.correlation_score / 100)
    );

    return base_size * volatility_multiplier * correlation_multiplier;
  }

  // Enforce allocation limits
  private enforceAllocationLimits(
    symbol: string,
    position_size: number,
    entry_price: number
  ): number {
    const position_value = position_size * entry_price;
    const position_percentage = (position_value / this.state.config.total_capital) * 100;

    // Check risk bucket limits
    const risk_bucket = this.getRiskBucketForSymbol(symbol);
    if (risk_bucket && position_percentage > risk_bucket.max_single_position) {
      const max_value = this.state.config.total_capital * (risk_bucket.max_single_position / 100);
      position_size = max_value / entry_price;
    }

    return position_size;
  }

  // Create profit securing actions
  private createProfitSecuringAction(
    position: PositionMetrics,
    zone: ProfitZone
  ): ProfitSecuringAction | null {
    switch (zone.action) {
      case 'secure':
        return {
          position_id: position.symbol,
          symbol: position.symbol,
          action_type: 'partial_sell',
          amount_to_secure: position.position_size * (zone.percentage_to_secure / 100),
          new_stop_loss: position.entry_price, // Move to breakeven
          reason: `Profit zone ${zone.level}% reached - securing ${zone.percentage_to_secure}%`,
          profit_level_achieved: zone.level,
        };

      case 'trail':
        const trailing_stop = position.current_price * 0.95; // 5% trailing stop
        return {
          position_id: position.symbol,
          symbol: position.symbol,
          action_type: 'trailing_stop',
          amount_to_secure: 0,
          new_stop_loss: trailing_stop,
          reason: `Profit zone ${zone.level}% reached - implementing trailing stop`,
          profit_level_achieved: zone.level,
        };

      case 'hold':
        return {
          position_id: position.symbol,
          symbol: position.symbol,
          action_type: 'breakeven_stop',
          amount_to_secure: 0,
          new_stop_loss: position.entry_price * 1.01, // Breakeven + 1%
          reason: `Profit zone ${zone.level}% reached - moving stop to breakeven+`,
          profit_level_achieved: zone.level,
        };
    }

    return null;
  }

  // Helper methods
  private getAvailableCapital(): number {
    const allocated_capital = this.state.current_positions.reduce(
      (sum, pos) => sum + pos.position_size * pos.current_price,
      0
    );
    const reserved_cash =
      this.state.config.total_capital * (this.state.config.reserved_cash_percentage / 100);
    return this.state.config.total_capital - allocated_capital - reserved_cash;
  }

  private getCurrentClassAllocation(className: string): number {
    const class_positions = this.state.current_positions.filter(
      pos => pos.asset_class === className
    );
    const class_value = class_positions.reduce(
      (sum, pos) => sum + pos.position_size * pos.current_price,
      0
    );
    return (class_value / this.state.config.total_capital) * 100;
  }

  private calculateAllocationHealth(): number {
    let total_deviation = 0;
    let asset_count = 0;

    for (const assetClass of this.state.config.asset_classes) {
      const current_allocation = this.getCurrentClassAllocation(assetClass.name);
      const deviation = Math.abs(current_allocation - assetClass.target_allocation);
      total_deviation += deviation;
      asset_count++;
    }

    const average_deviation = asset_count > 0 ? total_deviation / asset_count : 0;
    return Math.max(0, 100 - average_deviation * 10); // Scale to 0-100
  }

  private calculateRiskHealth(): number {
    let risk_score = 100;

    // Check risk bucket violations
    for (const bucket of this.state.config.risk_buckets) {
      if (bucket.current_allocation > bucket.max_allocation) {
        const violation = bucket.current_allocation - bucket.max_allocation;
        risk_score -= violation * 5; // Penalize violations
      }
    }

    return Math.max(0, risk_score);
  }

  private calculateProfitHealth(): number {
    const profitable_positions = this.state.current_positions.filter(
      pos => pos.unrealized_pnl > 0
    ).length;
    const total_positions = this.state.current_positions.length;

    if (total_positions === 0) return 100;

    return (profitable_positions / total_positions) * 100;
  }

  private calculateCorrelationHealth(): number {
    // Simplified correlation health - would need actual correlation calculation
    const unique_classes = new Set(this.state.current_positions.map(pos => pos.asset_class));
    const diversification_score = Math.min(100, (unique_classes.size / 5) * 100); // Assume 5 is ideal

    return diversification_score;
  }

  private initializeAllocationStatus(): AllocationStatus {
    return {
      total_allocated: 0,
      cash_available: this.state?.config?.total_capital || 0,
      target_vs_actual: {},
      rebalancing_needed: false,
      rebalancing_suggestions: [],
      risk_distribution: {},
      correlation_warnings: [],
    };
  }

  private initializePortfolioHealth(): PortfolioHealth {
    return {
      overall_score: 100,
      allocation_health: 100,
      risk_health: 100,
      profit_health: 100,
      correlation_health: 100,
      warnings: [],
      recommendations: [],
    };
  }

  private findPosition(symbol: string): PositionMetrics | undefined {
    return this.state.current_positions.find(pos => pos.symbol === symbol);
  }

  private getRiskBucketForSymbol(symbol: string): RiskBucket | undefined {
    // This would need to be implemented based on symbol-to-bucket mapping
    return this.state.config.risk_buckets[0]; // Simplified
  }

  private selectBestSymbolInClass(className: string): string {
    const class_positions = this.state.current_positions.filter(
      pos => pos.asset_class === className
    );
    return class_positions.length > 0 ? class_positions[0].symbol : 'BTCUSDT'; // Fallback
  }

  private selectWorstPerformerInBucket(bucketId: string): string {
    const bucket_positions = this.state.current_positions.filter(
      pos => pos.risk_bucket === bucketId
    );
    if (bucket_positions.length === 0) return 'BTCUSDT';

    // Return the worst performer
    return bucket_positions.sort(
      (a, b) => a.unrealized_pnl_percentage - b.unrealized_pnl_percentage
    )[0].symbol;
  }

  private calculateRebalanceAmount(assetClass: any): number {
    const deviation = Math.abs(assetClass.current_allocation - assetClass.target_allocation);
    return (deviation / 100) * this.state.config.total_capital;
  }

  private applyPreservationRule(position: PositionMetrics, rule: any): ProfitSecuringAction | null {
    // Implementation would depend on specific rule logic
    return null;
  }

  // Public interface methods
  public getState(): AssetManagerState {
    return { ...this.state };
  }

  public updatePositions(positions: PositionMetrics[]): void {
    this.state.current_positions = positions;
    this.state.allocation_status = this.calculateAllocationStatus();
    this.state.portfolio_health = this.calculatePortfolioHealth();
  }

  private calculateAllocationStatus(): AllocationStatus {
    // Implementation for calculating current allocation status
    return this.state.allocation_status; // Simplified for now
  }
}

// Default configurations for different risk profiles
export const DEFAULT_CONSERVATIVE_CONFIG: AssetManagerConfig = {
  total_capital: 10000,
  reserved_cash_percentage: 20,
  asset_classes: [
    {
      name: 'Large Cap Crypto',
      symbols: ['BTCUSDT', 'ETHUSDT'],
      target_allocation: 60,
      current_allocation: 0,
      correlation_limit: 0.7,
      volatility_adjustment: 0.8,
    },
    {
      name: 'Mid Cap Crypto',
      symbols: ['ADAUSDT', 'DOTUSDT', 'LINKUSDT'],
      target_allocation: 30,
      current_allocation: 0,
      correlation_limit: 0.6,
      volatility_adjustment: 0.6,
    },
    {
      name: 'Speculative',
      symbols: ['SOLUSDT', 'AVAXUSDT'],
      target_allocation: 10,
      current_allocation: 0,
      correlation_limit: 0.5,
      volatility_adjustment: 0.4,
    },
  ],
  risk_buckets: [
    {
      id: 'low_risk',
      name: 'Low Risk',
      max_allocation: 70,
      current_allocation: 0,
      risk_level: 'low',
      max_single_position: 15,
      stop_loss_default: 3,
      take_profit_default: 6,
    },
    {
      id: 'medium_risk',
      name: 'Medium Risk',
      max_allocation: 25,
      current_allocation: 0,
      risk_level: 'medium',
      max_single_position: 10,
      stop_loss_default: 5,
      take_profit_default: 10,
    },
    {
      id: 'high_risk',
      name: 'High Risk',
      max_allocation: 5,
      current_allocation: 0,
      risk_level: 'high',
      max_single_position: 3,
      stop_loss_default: 8,
      take_profit_default: 15,
    },
  ],
  profit_zones: [
    {
      level: 10,
      action: 'secure',
      percentage_to_secure: 25,
      remaining_percentage: 75,
      stop_loss_adjustment: 1,
    },
    {
      level: 20,
      action: 'secure',
      percentage_to_secure: 50,
      remaining_percentage: 50,
      stop_loss_adjustment: 5,
    },
    {
      level: 50,
      action: 'trail',
      percentage_to_secure: 0,
      remaining_percentage: 100,
      stop_loss_adjustment: 10,
    },
  ],
  profit_preservation_rules: [
    {
      trigger_profit_percent: 15,
      preservation_action: 'stop_to_breakeven',
      preservation_percentage: 0,
      conditions: ['position_age > 24h'],
    },
  ],
  rebalancing_frequency: 'weekly',
  max_drawdown_before_rebalance: 10,
  correlation_check_enabled: true,
  dynamic_sizing_enabled: true,
};
