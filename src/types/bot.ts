export interface LROConfig {
  period: number;
  signal_period: number;
  overbought: number;
  oversold: number;
  min_swing_bars: number;
  adaptive_enabled: boolean;
  // Risk Management
  stop_loss_percent: number;
  take_profit_percent: number;
  max_position_size: number;
  max_daily_loss: number;
  trailing_stop_enabled: boolean;
  trailing_stop_percent: number;
  // Automatic Strategy
  auto_strategy_enabled: boolean;
  market_adaptation_level: 'Conservative' | 'Moderate' | 'Aggressive';
  // Paper Trading
  paper_trading_enabled: boolean;
  virtual_balance: number;
  // Safety Settings
  emergency_stop_enabled: boolean;
  circuit_breaker_enabled: boolean;
  max_position_hold_hours: number;
  signal_strength_threshold: number;
}

export interface MarketConditions {
  volatility: number;
  trend_strength: number;
  volume_profile: number;
  price_momentum: number;
  market_regime: 'Bull' | 'Bear' | 'Sideways' | 'Volatile';
}

export interface BotPosition {
  symbol: string;
  side: 'Long' | 'Short';
  entry_price: number;
  quantity: number;
  entry_time: string;
  stop_loss?: number;
  take_profit?: number;
}

export interface BotPerformance {
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  max_drawdown: number;
  sharpe_ratio: number;
  avg_hold_time: number;
  success_rate: number;
}

export interface LROSignal {
  timestamp: string;
  lro_value: number;
  signal_line: number;
  signal_type: 'Buy' | 'Sell' | 'StrongBuy' | 'StrongSell' | 'Hold';
  strength: number;
  market_condition: {
    trend_strength: number;
    volatility: number;
    volume_profile: number;
    market_phase: 'Trending' | 'Ranging' | 'Breakout' | 'Reversal';
  };
}

export interface BotStatus {
  is_active: boolean;
  current_position?: BotPosition;
  latest_signal?: LROSignal;
  performance: BotPerformance;
  config: LROConfig;
  // Safety Status
  emergency_stop_triggered: boolean;
  circuit_breaker_count: number;
  circuit_breaker_active: boolean;
  account_balance: number;
  daily_loss_tracker: number;
  max_position_hold_hours: number;
  // Risk Metrics
  current_daily_loss: number;
  positions_auto_closed: number;
  // Additional fields from backend
  daily_reset_time: string;
  last_circuit_breaker_time?: string;
  depth_analysis_enabled: boolean;
}

export interface ChartDataPoint {
  timestamp: string;
  time: string;
  lro_value: number;
  signal_line: number;
  overbought: number;
  oversold: number;
}

export interface PerformanceDataPoint {
  timestamp: string;
  time: string;
  total_pnl: number;
  cumulative_return: number;
  drawdown: number;
  win_rate: number;
}

export interface PaperTrade {
  id: string;
  timestamp: string;
  symbol: string;
  side: 'Long' | 'Short';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  status: 'Open' | 'Closed';
  pnl?: number;
  pnl_percentage?: number;
  reason?: string;
}

export interface VirtualPortfolio {
  balance: number;
  equity: number;
  unrealized_pnl: number;
  total_trades: number;
  winning_trades: number;
  paper_trades: PaperTrade[];
}

export interface SymbolFilter {
  filter_type: string;
  min_price?: number;
  max_price?: number;
  tick_size?: number;
  min_qty?: number;
  max_qty?: number;
  step_size?: number;
  min_notional?: number;
}

export interface SymbolInfo {
  symbol: string;
  base_asset: string;
  quote_asset: string;
  status: string;
  price?: number;
  price_change_percent?: number;
  volume?: number;
  high?: number;
  low?: number;
  is_spot_trading_allowed: boolean;
  is_margin_trading_allowed: boolean;
  filters: SymbolFilter[];
}

export interface MarketStats {
  symbol: string;
  price: number;
  price_change: number;
  price_change_percent: number;
  high: number;
  low: number;
  volume: number;
  quote_volume: number;
  count: number;
  open_time: string;
  close_time: string;
}