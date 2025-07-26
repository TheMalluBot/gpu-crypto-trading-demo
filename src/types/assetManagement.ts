// Enhanced Asset Management System
// Focuses on allocation maintenance and profit preservation

export interface AssetAllocation {
  symbol: string;
  target_percentage: number;
  current_percentage: number;
  min_percentage: number;
  max_percentage: number;
  rebalance_threshold: number; // When to trigger rebalancing
}

export interface ProfitZone {
  level: number; // Profit level (e.g., 5%, 10%, 20%)
  action: 'secure' | 'trail' | 'hold';
  percentage_to_secure: number; // What % of profits to lock in
  remaining_percentage: number; // What % to let ride
  stop_loss_adjustment: number; // Move stop loss to break-even + X%
}

export interface AssetClass {
  name: string;
  symbols: string[];
  target_allocation: number;
  current_allocation: number;
  correlation_limit: number; // Max correlation allowed within class
  volatility_adjustment: number; // Multiplier for position sizing based on volatility
}

export interface RiskBucket {
  id: string;
  name: string;
  max_allocation: number; // Max % of portfolio
  current_allocation: number;
  risk_level: 'low' | 'medium' | 'high' | 'speculative';
  max_single_position: number; // Max % for single position in this bucket
  stop_loss_default: number;
  take_profit_default: number;
}

export interface ProfitPreservationRule {
  trigger_profit_percent: number;
  preservation_action: 'partial_exit' | 'trailing_stop' | 'stop_to_breakeven';
  preservation_percentage: number;
  conditions: string[];
}

export interface AssetManagerConfig {
  total_capital: number;
  reserved_cash_percentage: number; // Always keep X% in cash
  asset_classes: AssetClass[];
  risk_buckets: RiskBucket[];
  profit_zones: ProfitZone[];
  profit_preservation_rules: ProfitPreservationRule[];
  rebalancing_frequency: 'daily' | 'weekly' | 'monthly';
  max_drawdown_before_rebalance: number;
  correlation_check_enabled: boolean;
  dynamic_sizing_enabled: boolean;
}

export interface PositionMetrics {
  symbol: string;
  asset_class: string;
  risk_bucket: string;
  entry_price: number;
  current_price: number;
  position_size: number;
  allocation_percentage: number;
  unrealized_pnl: number;
  unrealized_pnl_percentage: number;
  profit_zone_level: number;
  days_held: number;
  volatility: number;
  correlation_score: number;
  risk_score: number;
}

export interface AllocationStatus {
  total_allocated: number;
  cash_available: number;
  target_vs_actual: { [symbol: string]: number };
  rebalancing_needed: boolean;
  rebalancing_suggestions: RebalancingSuggestion[];
  risk_distribution: { [bucket: string]: number };
  correlation_warnings: string[];
}

export interface RebalancingSuggestion {
  action: 'buy' | 'sell' | 'hold';
  symbol: string;
  current_allocation: number;
  target_allocation: number;
  suggested_amount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProfitSecuringAction {
  position_id: string;
  symbol: string;
  action_type: 'partial_sell' | 'trailing_stop' | 'breakeven_stop';
  amount_to_secure: number;
  new_stop_loss: number;
  reason: string;
  profit_level_achieved: number;
}

export interface PortfolioHealth {
  overall_score: number; // 0-100
  allocation_health: number;
  risk_health: number;
  profit_health: number;
  correlation_health: number;
  warnings: string[];
  recommendations: string[];
}

export interface AssetManagerState {
  config: AssetManagerConfig;
  current_positions: PositionMetrics[];
  allocation_status: AllocationStatus;
  portfolio_health: PortfolioHealth;
  profit_secured_today: number;
  last_rebalance: Date;
  pending_actions: ProfitSecuringAction[];
}