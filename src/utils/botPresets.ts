import { LROConfig } from '../types/bot';

export interface BotPreset {
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  riskLevel: 'Low' | 'Medium' | 'High';
  expectedReturn: string;
  timeframe: string;
  config: Partial<LROConfig>;
  pros: string[];
  cons: string[];
}

export const BOT_PRESETS: BotPreset[] = [
  {
    name: "Conservative Starter",
    description: "Perfect for beginners - low risk, steady returns with strong safety measures",
    difficulty: "Beginner",
    riskLevel: "Low",
    expectedReturn: "2-5% monthly",
    timeframe: "4-hour charts (Swing/Position)",
    config: {
      timeframe: "4h",
      period: 20,
      signal_period: 10,
      overbought: 0.7,
      oversold: -0.7,
      min_swing_bars: 5,
      adaptive_enabled: true,
      stop_loss_percent: 2.0,
      take_profit_percent: 4.0,
      max_position_size: 500,
      max_daily_loss: 50,
      trailing_stop_enabled: true,
      trailing_stop_percent: 1.5,
      paper_trading_enabled: true,
      virtual_balance: 10000,
      auto_strategy_enabled: false,
      market_adaptation_level: 'Conservative',
      max_position_hold_hours: 48,
      signal_strength_threshold: 0.7,
      emergency_stop_enabled: true,
      circuit_breaker_enabled: true,
      // Conservative auto-resume settings - very cautious approach
      auto_resume_enabled: true,
      volatility_resume_threshold_multiplier: 1.0,  // Wait for full stability
      data_quality_resume_delay_minutes: 5,         // Longer wait for data issues
      connection_resume_delay_minutes: 10,          // Conservative connection wait
      flash_crash_resume_delay_minutes: 30,         // Long stabilization period
      max_auto_pause_duration_hours: 6              // Max 6 hours - position trading
    },
    pros: [
      "Low risk with tight stop losses",
      "Paper trading enabled by default",
      "Strong safety measures",
      "Easy to understand settings"
    ],
    cons: [
      "Lower profit potential",
      "May miss quick opportunities",
      "Conservative approach"
    ]
  },
  
  {
    name: "Balanced Growth",
    description: "Balanced approach for steady growth with moderate risk tolerance",
    difficulty: "Intermediate",
    riskLevel: "Medium",
    expectedReturn: "5-12% monthly",
    timeframe: "1-hour charts (Day trading)",
    config: {
      timeframe: "1h",
      period: 15,
      signal_period: 8,
      overbought: 0.8,
      oversold: -0.8,
      min_swing_bars: 3,
      adaptive_enabled: true,
      stop_loss_percent: 3.0,
      take_profit_percent: 6.0,
      max_position_size: 1000,
      max_daily_loss: 100,
      trailing_stop_enabled: true,
      trailing_stop_percent: 2.0,
      paper_trading_enabled: false,
      auto_strategy_enabled: true,
      market_adaptation_level: 'Moderate',
      max_position_hold_hours: 24,
      signal_strength_threshold: 0.6,
      emergency_stop_enabled: true,
      circuit_breaker_enabled: true,
      // Balanced auto-resume settings - moderate approach
      auto_resume_enabled: true,
      volatility_resume_threshold_multiplier: 0.8,  // Balanced resume (80%)
      data_quality_resume_delay_minutes: 2,         // Standard wait for data issues
      connection_resume_delay_minutes: 3,           // Standard wait for connection issues
      flash_crash_resume_delay_minutes: 10,         // Medium wait for flash crash
      max_auto_pause_duration_hours: 2              // Max 2 hours pause
    },
    pros: [
      "Good balance of risk and reward",
      "Adaptive to market conditions",
      "Reasonable profit targets",
      "Moderate safety measures"
    ],
    cons: [
      "Higher risk than conservative",
      "Requires some market knowledge",
      "May have drawdown periods"
    ]
  },
  
  {
    name: "Aggressive Scalper",
    description: "High-frequency trading for experienced users seeking maximum returns",
    difficulty: "Advanced",
    riskLevel: "High",
    expectedReturn: "10-25% monthly",
    timeframe: "5-minute charts (Scalping)",
    config: {
      timeframe: "5m",
      period: 10,
      signal_period: 5,
      overbought: 0.9,
      oversold: -0.9,
      min_swing_bars: 2,
      adaptive_enabled: true,
      stop_loss_percent: 1.5,
      take_profit_percent: 3.0,
      max_position_size: 2000,
      max_daily_loss: 200,
      trailing_stop_enabled: false,
      trailing_stop_percent: 1.0,
      paper_trading_enabled: false,
      auto_strategy_enabled: true,
      market_adaptation_level: 'Aggressive',
      max_position_hold_hours: 4,
      signal_strength_threshold: 0.5,
      emergency_stop_enabled: true,
      circuit_breaker_enabled: true,
      // Aggressive scalping auto-resume settings - fast recovery
      auto_resume_enabled: true,
      volatility_resume_threshold_multiplier: 0.6,  // More aggressive resume (60%)
      data_quality_resume_delay_minutes: 1,         // Quick resume for data issues
      connection_resume_delay_minutes: 2,           // Quick resume for connection issues
      flash_crash_resume_delay_minutes: 5,          // Short wait for flash crash
      max_auto_pause_duration_hours: 1              // Max 1 hour pause
    },
    pros: [
      "High profit potential",
      "Quick trades with fast exits",
      "Adaptive to rapid market changes",
      "Maximizes trading opportunities"
    ],
    cons: [
      "High risk and volatility",
      "Requires constant monitoring",
      "Higher transaction costs",
      "Not suitable for beginners"
    ]
  },
  
  {
    name: "Swing Trader",
    description: "Medium-term positions targeting larger price movements",
    difficulty: "Intermediate",
    riskLevel: "Medium",
    expectedReturn: "8-15% monthly",
    timeframe: "Daily charts (Swing trading)",
    config: {
      timeframe: "1d",
      period: 25,
      signal_period: 12,
      overbought: 0.6,
      oversold: -0.6,
      min_swing_bars: 8,
      adaptive_enabled: true,
      stop_loss_percent: 4.0,
      take_profit_percent: 8.0,
      max_position_size: 1500,
      max_daily_loss: 150,
      trailing_stop_enabled: true,
      trailing_stop_percent: 3.0,
      paper_trading_enabled: false,
      auto_strategy_enabled: true,
      market_adaptation_level: 'Moderate',
      max_position_hold_hours: 72,
      signal_strength_threshold: 0.5,
      emergency_stop_enabled: true,
      circuit_breaker_enabled: true,
      // Swing trading auto-resume settings - balanced approach
      auto_resume_enabled: true,
      volatility_resume_threshold_multiplier: 0.8,  // Balanced resume (80%)
      data_quality_resume_delay_minutes: 2,         // Standard wait for data issues
      connection_resume_delay_minutes: 3,           // Standard wait for connection issues
      flash_crash_resume_delay_minutes: 10,         // Medium wait for flash crash
      max_auto_pause_duration_hours: 2              // Max 2 hours pause
    },
    pros: [
      "Captures larger price movements",
      "Lower transaction costs",
      "Less screen time required",
      "Good risk-reward ratio"
    ],
    cons: [
      "Longer holding periods",
      "May miss short-term opportunities",
      "Requires patience",
      "Overnight risk exposure"
    ]
  },
  
  {
    name: "Ultra-Fast Scalper",
    description: "1-minute chart scalping for maximum trade frequency - expert traders only",
    difficulty: "Advanced",
    riskLevel: "High",
    expectedReturn: "15-35% monthly",
    timeframe: "1-minute charts (Ultra-scalping)",
    config: {
      timeframe: "1m",
      period: 8,
      signal_period: 3,
      overbought: 0.85,
      oversold: -0.85,
      min_swing_bars: 2,
      adaptive_enabled: true,
      stop_loss_percent: 0.8,
      take_profit_percent: 1.6,
      max_position_size: 3000,
      max_daily_loss: 300,
      trailing_stop_enabled: false,
      trailing_stop_percent: 0.5,
      paper_trading_enabled: false,
      auto_strategy_enabled: true,
      market_adaptation_level: 'Aggressive',
      max_position_hold_hours: 1,
      signal_strength_threshold: 0.4,
      emergency_stop_enabled: true,
      circuit_breaker_enabled: true,
      // Ultra-fast scalping auto-resume settings - extremely aggressive
      auto_resume_enabled: true,
      volatility_resume_threshold_multiplier: 0.5,  // Very aggressive resume (50%)
      data_quality_resume_delay_minutes: 1,         // Ultra-quick resume for data issues (minimum 1 min)
      connection_resume_delay_minutes: 1,           // Ultra-quick resume for connection issues
      flash_crash_resume_delay_minutes: 3,          // Very short wait for flash crash
      max_auto_pause_duration_hours: 1              // Max 1 hour pause (minimum allowed)
    },
    pros: [
      "Maximum trading frequency",
      "Captures micro-movements",
      "Very tight stops minimize losses",
      "High profit potential"
    ],
    cons: [
      "Extremely high risk",
      "Requires constant monitoring",
      "High transaction costs",
      "Prone to false signals",
      "Not for beginners"
    ]
  },
  
  {
    name: "Range Bound",
    description: "Optimized for sideways markets with clear support and resistance",
    difficulty: "Intermediate",
    riskLevel: "Low",
    expectedReturn: "4-8% monthly",
    timeframe: "2-hour charts (Range trading)",
    config: {
      timeframe: "2h",
      period: 30,
      signal_period: 15,
      overbought: 0.5,
      oversold: -0.5,
      min_swing_bars: 6,
      adaptive_enabled: false,
      stop_loss_percent: 2.5,
      take_profit_percent: 5.0,
      max_position_size: 800,
      max_daily_loss: 80,
      trailing_stop_enabled: false,
      trailing_stop_percent: 2.0,
      paper_trading_enabled: false,
      auto_strategy_enabled: false,
      market_adaptation_level: 'Conservative',
      max_position_hold_hours: 36,
      signal_strength_threshold: 0.6,
      emergency_stop_enabled: true,
      circuit_breaker_enabled: true,
      // Range trading auto-resume settings - moderate approach
      auto_resume_enabled: true,
      volatility_resume_threshold_multiplier: 0.7,  // Moderate resume (70%)
      data_quality_resume_delay_minutes: 2,         // Quick resume for range trading
      connection_resume_delay_minutes: 3,           // Standard wait
      flash_crash_resume_delay_minutes: 8,          // Medium wait - range sensitive
      max_auto_pause_duration_hours: 3              // Max 3 hours pause
    },
    pros: [
      "Works well in sideways markets",
      "Predictable entry/exit points",
      "Lower risk profile",
      "Consistent small profits"
    ],
    cons: [
      "Poor performance in trending markets",
      "Limited profit potential",
      "Requires range-bound conditions",
      "May get caught in breakouts"
    ]
  }
];

export const getPresetByName = (name: string): BotPreset | undefined => {
  return BOT_PRESETS.find(preset => preset.name === name);
};

export const getPresetsByDifficulty = (difficulty: 'Beginner' | 'Intermediate' | 'Advanced'): BotPreset[] => {
  return BOT_PRESETS.filter(preset => preset.difficulty === difficulty);
};

export const getPresetsByRisk = (riskLevel: 'Low' | 'Medium' | 'High'): BotPreset[] => {
  return BOT_PRESETS.filter(preset => preset.riskLevel === riskLevel);
};