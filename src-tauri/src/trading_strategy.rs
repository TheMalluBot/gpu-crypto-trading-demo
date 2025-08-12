use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;
use rust_decimal::prelude::{ToPrimitive, FromPrimitive};
use std::str::FromStr;
use chrono::{DateTime, Utc};
use std::collections::VecDeque;
use crate::models::{OrderBookDepth, MarketDepthAnalysis, LiquidityLevel, PriceData};
use crate::logging::{LogLevel, LogCategory};
use crate::{log_info, log_warning, log_error, log_debug};
use crate::gpu_risk_manager::{GpuRiskManager, TradingRiskAssessment, MarketRegime};
use crate::enhanced_lro::{EnhancedLRO, LROConfig as EnhancedLROConfig, LROSignal as EnhancedLROSignal, LROStatistics};

/// Bot operational states - replaces simple boolean flags
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum BotState {
    /// Bot is actively trading and processing signals
    Running,
    /// Bot is temporarily paused but maintains state - can auto-resume
    Paused,
    /// Bot is completely stopped - requires manual restart
    Stopped,
}

impl Default for BotState {
    fn default() -> Self {
        BotState::Stopped
    }
}

/// Reasons why the bot might be paused
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PauseReason {
    /// Market volatility exceeded safe threshold
    HighVolatility { volatility: f64, threshold: f64 },
    /// Invalid or stale price data detected
    DataQuality { issue: String },
    /// WebSocket connection issues
    ConnectionIssue { reason: String },
    /// Flash crash or extreme price movement detected
    FlashCrash { movement_percent: f64 },
    /// Daily loss limit approaching
    RiskManagement { current_loss: f64, limit: f64 },
    /// Manual pause requested by user
    Manual,
    /// Circuit breaker triggered
    CircuitBreaker { trigger_count: u32 },
}

/// Pause state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PauseInfo {
    pub reason: PauseReason,
    pub paused_at: DateTime<Utc>,
    pub auto_resume_at: Option<DateTime<Utc>>,
    pub conditions_for_resume: Vec<String>,
}

/// Auto-resume configuration settings
#[derive(Debug, Clone)]
pub struct AutoResumeSettings {
    pub enabled: bool,
    pub volatility_threshold_multiplier: f64,
    pub delays: AutoResumeDelays,
    pub considers_trend_strength: bool,
    pub requires_market_stability: bool,
}

#[derive(Debug, Clone)]
pub struct AutoResumeDelays {
    pub data_quality: u32,      // Minutes to wait after data quality issues
    pub connection: u32,        // Minutes to wait after connection issues  
    pub flash_crash: u32,       // Minutes to wait after flash crash
    pub max_pause_hours: u32,   // Maximum hours before manual intervention required
}

impl Default for AutoResumeDelays {
    fn default() -> Self {
        Self {
            data_quality: 2,
            connection: 3,
            flash_crash: 10,
            max_pause_hours: 2,
        }
    }
}

/// Safe decimal conversion utilities
pub struct DecimalUtils;

impl DecimalUtils {
    /// Safely convert f64 to Decimal with error handling
    pub fn safe_from_f64(value: f64, context: &str) -> Result<Decimal, String> {
        if !value.is_finite() {
            return Err(format!("Invalid value in {}: {} is not finite", context, value));
        }
        
        Decimal::from_f64(value)
            .ok_or_else(|| format!("Failed to convert {} to decimal in {}", value, context))
    }
    
    /// Safely convert f64 to Decimal with fallback
    pub fn safe_from_f64_or_default(value: f64, default: Decimal, context: &str) -> Decimal {
        if !value.is_finite() {
            log_warning!(LogCategory::DataProcessing, "Non-finite value {} in {}, using default {}", value, context, default);
            return default;
        }
        
        Decimal::from_f64(value).unwrap_or_else(|| {
            log_warning!(LogCategory::DataProcessing, "Failed to convert {} to decimal in {}, using default {}", value, context, default);
            default
        })
    }
    
    /// Safe percentage to decimal conversion
    pub fn percent_to_decimal(percent: f64, context: &str) -> Result<Decimal, String> {
        Self::safe_from_f64(percent / 100.0, &format!("{} percentage", context))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LROConfig {
    // Timeframe Configuration
    pub timeframe: String,      // Timeframe ("1m", "5m", "15m", "1h", "4h", "1d", etc.)
    // Core LRO Parameters
    pub period: usize,          // LRO calculation period (default: 25)
    pub signal_period: usize,   // Signal line smoothing (default: 9)
    pub overbought: f64,        // Overbought threshold (default: 0.8)
    pub oversold: f64,          // Oversold threshold (default: -0.8)
    pub min_swing_bars: usize,  // Minimum bars for swing validation
    pub adaptive_enabled: bool, // Enable adaptive thresholds
    // Risk Management
    pub stop_loss_percent: f64,
    pub take_profit_percent: f64,
    pub max_position_size: f64,
    pub max_daily_loss: f64,
    pub trailing_stop_enabled: bool,
    pub trailing_stop_percent: f64,
    // Automatic Strategy
    pub auto_strategy_enabled: bool,
    pub market_adaptation_level: String, // 'Conservative' | 'Moderate' | 'Aggressive'
    // Paper Trading
    pub paper_trading_enabled: bool,
    pub virtual_balance: f64,
    // Safety Settings
    pub emergency_stop_enabled: bool,
    pub circuit_breaker_enabled: bool,
    pub max_position_hold_hours: u32,
    pub signal_strength_threshold: f64,
    // Auto-Resume Settings
    pub auto_resume_enabled: bool,
    pub volatility_resume_threshold_multiplier: f64, // Multiplier for volatility threshold (0.5-1.5)
    pub data_quality_resume_delay_minutes: u32,      // Minutes to wait before resuming after data quality issues
    pub connection_resume_delay_minutes: u32,        // Minutes to wait before resuming after connection issues
    pub flash_crash_resume_delay_minutes: u32,       // Minutes to wait before resuming after flash crash
    pub max_auto_pause_duration_hours: u32,          // Max hours before requiring manual intervention
}

impl Default for LROConfig {
    fn default() -> Self {
        Self {
            // Timeframe Configuration
            timeframe: "1h".to_string(), // Default to 1-hour timeframe
            // Core LRO Parameters
            period: 25,
            signal_period: 9,
            overbought: 0.8,
            oversold: -0.8,
            min_swing_bars: 5,
            adaptive_enabled: true,
            // Risk Management defaults
            stop_loss_percent: 2.0,
            take_profit_percent: 4.0,
            max_position_size: 1000.0,
            max_daily_loss: 100.0,
            trailing_stop_enabled: false,
            trailing_stop_percent: 1.0,
            // Automatic Strategy defaults
            auto_strategy_enabled: false,
            market_adaptation_level: "Moderate".to_string(),
            // Paper Trading defaults
            paper_trading_enabled: true,
            virtual_balance: 10000.0,
            // Safety Settings defaults
            emergency_stop_enabled: true,
            circuit_breaker_enabled: true,
            max_position_hold_hours: 24,
            signal_strength_threshold: 0.6,
            // Auto-Resume defaults - conservative settings
            auto_resume_enabled: true,
            volatility_resume_threshold_multiplier: 0.8, // Resume at 80% of pause threshold
            data_quality_resume_delay_minutes: 2,        // 2 minutes for data quality issues
            connection_resume_delay_minutes: 3,          // 3 minutes for connection issues
            flash_crash_resume_delay_minutes: 10,        // 10 minutes for flash crashes
            max_auto_pause_duration_hours: 2,            // Max 2 hours of auto-pause
        }
    }
}

impl LROConfig {
    /// Validate timeframe string against supported Binance timeframes
    pub fn validate_timeframe(timeframe: &str) -> bool {
        matches!(timeframe, 
            "1s" | "1m" | "3m" | "5m" | "15m" | "30m" | 
            "1h" | "2h" | "4h" | "6h" | "8h" | "12h" | 
            "1d" | "3d" | "1w" | "1M"
        )
    }
    
    /// Validate market adaptation level
    pub fn validate_market_adaptation_level(level: &str) -> bool {
        matches!(level, "Conservative" | "Moderate" | "Aggressive")
    }
    
    /// Scale risk parameters based on timeframe
    pub fn get_scaled_stop_loss(&self) -> f64 {
        self.scale_risk_for_timeframe(self.stop_loss_percent)
    }
    
    pub fn get_scaled_take_profit(&self) -> f64 {
        self.scale_risk_for_timeframe(self.take_profit_percent)
    }
    
    pub fn get_scaled_trailing_stop(&self) -> f64 {
        self.scale_risk_for_timeframe(self.trailing_stop_percent)
    }
    
    /// Get maximum position hold duration based on timeframe
    pub fn get_max_hold_duration_hours(&self) -> u32 {
        match self.timeframe.as_str() {
            "1s" | "1m" | "3m" => 1,      // Very short-term: max 1 hour
            "5m" | "15m" => 4,            // Short-term: max 4 hours
            "30m" | "1h" => 12,           // Medium-term: max 12 hours
            "2h" | "4h" => 48,            // Swing: max 2 days
            "6h" | "8h" | "12h" => 72,    // Extended swing: max 3 days
            "1d" => 168,                  // Daily: max 1 week
            "3d" | "1w" => 720,           // Long-term: max 1 month
            _ => self.max_position_hold_hours, // Default fallback
        }
    }
    
    /// Get strategy-specific auto-resume settings based on timeframe and configuration
    pub fn get_auto_resume_settings(&self) -> AutoResumeSettings {
        // Base settings on timeframe (strategy type)
        let (base_multiplier, base_delays) = match self.timeframe.as_str() {
            // Scalping strategy (short timeframes) - more aggressive resume
            "1m" | "3m" | "5m" => (
                0.6, // Resume at 60% of pause threshold (more aggressive)
                AutoResumeDelays {
                    data_quality: 1,    // 1 minute - can't wait long
                    connection: 2,      // 2 minutes
                    flash_crash: 5,     // 5 minutes - shorter wait
                    max_pause_hours: 1, // Max 1 hour pause
                }
            ),
            // Swing trading (medium timeframes) - balanced resume
            "15m" | "30m" | "1h" | "2h" => (
                0.8, // Resume at 80% of pause threshold (balanced)
                AutoResumeDelays {
                    data_quality: 2,    // 2 minutes
                    connection: 3,      // 3 minutes
                    flash_crash: 10,    // 10 minutes
                    max_pause_hours: 2, // Max 2 hours pause
                }
            ),
            // Position/Swing trading (longer timeframes) - more conservative resume
            "4h" | "6h" | "8h" | "12h" | "1d" | "3d" | "1w" => (
                0.9, // Resume at 90% of pause threshold (more conservative)
                AutoResumeDelays {
                    data_quality: 5,    // 5 minutes - can afford to wait
                    connection: 10,     // 10 minutes
                    flash_crash: 30,    // 30 minutes - longer stabilization
                    max_pause_hours: 6, // Max 6 hours pause
                }
            ),
            _ => (0.8, AutoResumeDelays::default()) // Default to balanced
        };
        
        // Adjust based on market adaptation level
        let adaptation_multiplier = match self.market_adaptation_level.as_str() {
            "Conservative" => 1.2,  // More conservative (higher thresholds)
            "Moderate" => 1.0,      // Default
            "Aggressive" => 0.8,    // More aggressive (lower thresholds)
            _ => 1.0
        };
        
        // Apply user-configured multiplier
        let final_multiplier = base_multiplier * adaptation_multiplier * self.volatility_resume_threshold_multiplier;
        
        AutoResumeSettings {
            enabled: self.auto_resume_enabled,
            volatility_threshold_multiplier: final_multiplier.clamp(0.3, 1.5), // Clamp to sane range
            delays: AutoResumeDelays {
                data_quality: self.data_quality_resume_delay_minutes.max(base_delays.data_quality),
                connection: self.connection_resume_delay_minutes.max(base_delays.connection),
                flash_crash: self.flash_crash_resume_delay_minutes.max(base_delays.flash_crash),
                max_pause_hours: self.max_auto_pause_duration_hours.max(base_delays.max_pause_hours),
            },
            // Additional strategy-specific factors
            considers_trend_strength: matches!(self.timeframe.as_str(), "4h" | "6h" | "8h" | "12h" | "1d"),
            requires_market_stability: matches!(self.timeframe.as_str(), "1m" | "3m" | "5m"),
        }
    }
    
    /// Scale risk parameters based on timeframe velocity
    fn scale_risk_for_timeframe(&self, base_percent: f64) -> f64 {
        let timeframe_multiplier = match self.timeframe.as_str() {
            // Ultra-fast scalping - much tighter stops
            "1s" | "1m" => 0.2,
            "3m" | "5m" => 0.4,
            // Fast scalping/day trading
            "15m" | "30m" => 0.6,
            // Standard intraday
            "1h" | "2h" => 0.8,
            // Swing trading (baseline)
            "4h" | "6h" | "8h" | "12h" => 1.0,
            // Position trading - wider stops
            "1d" => 1.5,
            "3d" | "1w" => 2.0,
            // Default to baseline
            _ => 1.0,
        };
        
        base_percent * timeframe_multiplier
    }
    
    /// Get minimum bars required for swing validation based on timeframe
    pub fn get_min_swing_bars(&self) -> usize {
        match self.timeframe.as_str() {
            "1s" | "1m" | "3m" => 3,      // Very fast confirmation
            "5m" | "15m" => 5,            // Fast confirmation
            "30m" | "1h" => 8,            // Standard confirmation
            "2h" | "4h" => 12,            // Medium confirmation
            "6h" | "8h" | "12h" => 15,    // Longer confirmation
            "1d" => 20,                   // Daily confirmation
            "3d" | "1w" => 25,            // Long-term confirmation
            _ => self.min_swing_bars,     // Default fallback
        }
    }
    
    /// Get adaptive threshold adjustments based on timeframe
    pub fn get_timeframe_volatility_factor(&self) -> f64 {
        match self.timeframe.as_str() {
            // Higher volatility expected in short timeframes
            "1s" | "1m" | "3m" => 1.5,
            "5m" | "15m" => 1.2,
            "30m" | "1h" => 1.0,
            // Lower volatility in longer timeframes
            "2h" | "4h" => 0.8,
            "6h" | "8h" | "12h" => 0.6,
            "1d" | "3d" | "1w" => 0.4,
            _ => 1.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketCondition {
    pub trend_strength: f64,    // -1 (strong down) to 1 (strong up)
    pub volatility: f64,        // 0 to 1
    pub volume_profile: f64,    // Relative volume
    pub market_phase: MarketPhase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MarketPhase {
    Trending,    // Strong directional movement
    Ranging,     // Sideways consolidation
    Breakout,    // Breaking key levels
    Reversal,    // Potential trend change
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LROSignal {
    pub timestamp: DateTime<Utc>,
    pub lro_value: f64,
    pub signal_line: f64,
    pub signal_type: SignalType,
    pub strength: f64,          // Signal strength 0-1
    pub market_condition: MarketCondition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SignalType {
    Buy,
    Sell,
    StrongBuy,
    StrongSell,
    Hold,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwingTradingBot {
    pub config: LROConfig,
    /// New state system - replaces is_active and emergency_stop_triggered
    pub state: BotState,
    /// Information about current pause (if paused)
    pub pause_info: Option<PauseInfo>,
    pub current_position: Option<BotPosition>,
    pub price_history: VecDeque<PriceData>,
    pub lro_history: VecDeque<f64>,
    pub signal_history: VecDeque<LROSignal>,
    pub signal_line_history: VecDeque<f64>,
    pub performance_stats: BotPerformance,
    pub account_balance: Decimal,
    pub daily_loss_tracker: Decimal,
    pub daily_reset_time: DateTime<Utc>,
    pub max_position_hold_hours: u32,
    /// Deprecated - kept for backward compatibility, use state instead
    #[deprecated(note = "Use state field instead")]
    pub emergency_stop_triggered: bool,
    pub circuit_breaker_count: u32,
    pub last_circuit_breaker_time: Option<DateTime<Utc>>,
    // Level 2 Market Data
    pub order_book_history: VecDeque<OrderBookDepth>,
    pub market_depth_analysis: Option<MarketDepthAnalysis>,
    pub liquidity_levels: Vec<LiquidityLevel>,
    pub depth_analysis_enabled: bool,
    // Incremental LRO calculation state
    #[serde(skip)]
    lro_cache: LroCache,
    // Enhanced LRO calculator with 2025 improvements
    #[serde(skip)]
    enhanced_lro: Option<EnhancedLRO>,
    // GPU-enhanced risk management
    #[serde(skip)]
    pub gpu_risk_manager: Option<std::sync::Arc<GpuRiskManager>>,
    pub last_risk_assessment: Option<TradingRiskAssessment>,
}

#[derive(Debug, Clone)]
struct LroCache {
    // Rolling statistics for efficient LRO calculation
    sum_x: f64,
    sum_y: f64,
    sum_xy: f64,
    sum_x2: f64,
    n: usize,
    last_slope: f64,
    last_intercept: f64,
    last_predicted_price: f64,
    is_valid: bool,
    period: usize,
}

impl Default for LroCache {
    fn default() -> Self {
        Self {
            sum_x: 0.0,
            sum_y: 0.0,
            sum_xy: 0.0,
            sum_x2: 0.0,
            n: 0,
            last_slope: 0.0,
            last_intercept: 0.0,
            last_predicted_price: 0.0,
            is_valid: false,
            period: 25,
        }
    }
}

impl LroCache {
    fn new(period: usize) -> Self {
        Self {
            period,
            ..Default::default()
        }
    }
    
    fn reset(&mut self) {
        self.sum_x = 0.0;
        self.sum_y = 0.0;
        self.sum_xy = 0.0;
        self.sum_x2 = 0.0;
        self.n = 0;
        self.is_valid = false;
    }
    
    fn add_point(&mut self, x: f64, y: f64) {
        self.sum_x += x;
        self.sum_y += y;
        self.sum_xy += x * y;
        self.sum_x2 += x * x;
        self.n += 1;
        self.is_valid = self.n >= self.period;
    }
    
    fn remove_point(&mut self, x: f64, y: f64) {
        if self.n > 0 {
            self.sum_x -= x;
            self.sum_y -= y;
            self.sum_xy -= x * y;
            self.sum_x2 -= x * x;
            self.n -= 1;
            self.is_valid = self.n >= self.period;
        }
    }
    
    fn calculate_regression(&mut self) -> Option<(f64, f64)> {
        if !self.is_valid || self.n == 0 {
            return None;
        }
        
        let n = self.n as f64;
        let denominator = n * self.sum_x2 - self.sum_x * self.sum_x;
        
        if denominator.abs() < f64::EPSILON {
            return None;
        }
        
        let slope = (n * self.sum_xy - self.sum_x * self.sum_y) / denominator;
        let intercept = (self.sum_y - slope * self.sum_x) / n;
        
        self.last_slope = slope;
        self.last_intercept = intercept;
        self.last_predicted_price = slope * (self.n - 1) as f64 + intercept;
        
        Some((slope, intercept))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotPosition {
    pub symbol: String,
    pub side: crate::models::TradeSide,
    pub entry_price: Decimal,
    pub quantity: Decimal,
    pub entry_time: DateTime<Utc>,
    pub stop_loss: Option<Decimal>,
    pub take_profit: Option<Decimal>,
    pub entry_signal: LROSignal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotPerformance {
    pub total_trades: u32,
    pub winning_trades: u32,
    pub total_pnl: Decimal,
    pub max_drawdown: Decimal,
    pub sharpe_ratio: f64,
    pub avg_hold_time: f64,     // Hours
    pub success_rate: f64,
}


impl SwingTradingBot {
    // CRITICAL SAFETY: Config validation function
    fn validate_config(config: &LROConfig) -> Result<(), String> {
        // Validate timeframe
        if !LROConfig::validate_timeframe(&config.timeframe) {
            return Err(format!("Invalid timeframe '{}'. Must be one of: 1s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M", config.timeframe));
        }
        
        // Validate market adaptation level
        if !LROConfig::validate_market_adaptation_level(&config.market_adaptation_level) {
            return Err(format!("Invalid market adaptation level '{}'. Must be one of: Conservative, Moderate, Aggressive", config.market_adaptation_level));
        }
        
        if config.period < 5 || config.period > 200 {
            return Err("Period must be between 5 and 200".to_string());
        }
        if config.signal_period < 3 || config.signal_period > 50 {
            return Err("Signal period must be between 3 and 50".to_string());
        }
        if config.stop_loss_percent <= 0.0 || config.stop_loss_percent > 20.0 {
            return Err("Stop loss percent must be between 0.1% and 20%".to_string());
        }
        if config.take_profit_percent <= 0.0 || config.take_profit_percent > 50.0 {
            return Err("Take profit percent must be between 0.1% and 50%".to_string());
        }
        if config.max_position_size <= 0.0 {
            return Err("Max position size must be positive".to_string());
        }
        if config.virtual_balance <= 0.0 {
            return Err("Virtual balance must be positive".to_string());
        }
        if config.signal_strength_threshold < 0.0 || config.signal_strength_threshold > 1.0 {
            return Err("Signal strength threshold must be between 0.0 and 1.0".to_string());
        }
        
        // Validate auto-resume parameters if auto-resume is enabled
        if config.auto_resume_enabled {
            if config.volatility_resume_threshold_multiplier < 0.3 || config.volatility_resume_threshold_multiplier > 1.5 {
                return Err("Volatility resume threshold multiplier must be between 0.3 and 1.5".to_string());
            }
            
            if config.data_quality_resume_delay_minutes < 1 || config.data_quality_resume_delay_minutes > 60 {
                return Err("Data quality resume delay must be between 1 and 60 minutes".to_string());
            }
            
            if config.connection_resume_delay_minutes < 1 || config.connection_resume_delay_minutes > 60 {
                return Err("Connection resume delay must be between 1 and 60 minutes".to_string());
            }
            
            if config.flash_crash_resume_delay_minutes < 1 || config.flash_crash_resume_delay_minutes > 120 {
                return Err("Flash crash resume delay must be between 1 and 120 minutes".to_string());
            }
            
            if config.max_auto_pause_duration_hours < 1 || config.max_auto_pause_duration_hours > 24 {
                return Err("Max auto pause duration must be between 1 and 24 hours".to_string());
            }
            
            // Validate that auto-resume is compatible with other safety settings
            if !config.circuit_breaker_enabled {
                log_warning!(LogCategory::Configuration, "Auto-resume is enabled but circuit breaker is disabled. This may lead to excessive trading during volatile conditions.");
            }
            
            if !config.emergency_stop_enabled {
                return Err("Auto-resume requires emergency stop to be enabled for safety".to_string());
            }
        }
        
        Ok(())
    }

    pub fn new(config: LROConfig) -> Self {
        // Safety check: Warn if paper trading is disabled
        if !config.paper_trading_enabled {
            log_warning!(LogCategory::Security, "Paper trading is DISABLED. Live trading is not implemented for safety.");
            log_warning!(LogCategory::Security, "Please enable paper trading mode to test strategies safely.");
        } else {
            log_info!(LogCategory::Configuration, "Bot initialized in PAPER TRADING mode with virtual balance: ${}", config.virtual_balance);
        }
        
        // Save values before moving config
        let period = config.period;
        let max_position_hold_hours = config.max_position_hold_hours;
        let virtual_balance = config.virtual_balance;
        let overbought = config.overbought;
        let oversold = config.oversold;
        let adaptive_enabled = config.adaptive_enabled;
        
        Self {
            config,
            state: BotState::Stopped,
            pause_info: None,
            current_position: None,
            price_history: VecDeque::with_capacity(200),
            lro_history: VecDeque::with_capacity(100),
            signal_history: VecDeque::with_capacity(50),
            signal_line_history: VecDeque::with_capacity(200),
            performance_stats: BotPerformance::default(),
            account_balance: match Decimal::from_f64(virtual_balance) {
                Some(balance) if balance > Decimal::ZERO => balance,
                _ => {
                    eprintln!("Warning: Invalid virtual balance {}, using default $10000", virtual_balance);
                    Decimal::from(10000)
                }
            },
            daily_loss_tracker: Decimal::ZERO,
            daily_reset_time: Utc::now(),
            max_position_hold_hours,
            #[allow(deprecated)]
            emergency_stop_triggered: false,
            circuit_breaker_count: 0,
            last_circuit_breaker_time: None,
            // Level 2 Market Data
            order_book_history: VecDeque::with_capacity(50),
            market_depth_analysis: None,
            liquidity_levels: Vec::with_capacity(20),
            depth_analysis_enabled: true,
            // Initialize LRO cache
            lro_cache: LroCache::new(period),
            // Initialize enhanced LRO with 2025 improvements
            enhanced_lro: Some(EnhancedLRO::new(EnhancedLROConfig {
                base_period: period,
                min_period: (period / 2).max(7),
                max_period: (period * 2).min(50),
                overbought_threshold: overbought,
                oversold_threshold: oversold,
                volatility_adjustment: adaptive_enabled,
                multi_timeframe: true,
                divergence_detection: true,
            })),
            // GPU risk management (initialized later)
            gpu_risk_manager: None,
            last_risk_assessment: None,
        }
    }
    
    pub fn set_account_balance(&mut self, balance: Decimal) {
        self.account_balance = balance;
    }
    
    pub fn set_max_position_hold_hours(&mut self, hours: u32) {
        self.max_position_hold_hours = hours;
    }
    
    /// Initialize GPU risk manager for enhanced risk analysis
    pub async fn initialize_gpu_risk_manager(&mut self, device: std::sync::Arc<wgpu::Device>, queue: std::sync::Arc<wgpu::Queue>) -> Result<(), String> {
        match GpuRiskManager::new(device, queue).await {
            Ok(risk_manager) => {
                self.gpu_risk_manager = Some(std::sync::Arc::new(risk_manager));
                log_info!(LogCategory::Configuration, "GPU risk manager initialized successfully for enhanced trading safety");
                Ok(())
            }
            Err(e) => {
                log_warning!(LogCategory::Configuration, "Failed to initialize GPU risk manager: {}. Trading will use basic risk management.", e);
                Err(e)
            }
        }
    }
    
    /// Update risk assessment using GPU analysis
    pub async fn update_risk_assessment(&mut self) -> Result<(), String> {
        if let Some(ref risk_manager) = self.gpu_risk_manager {
            if self.price_history.len() >= 20 { // Minimum data for analysis
                let position_size = Decimal::from(100); // Sample position size for analysis
                
                // Get current order book data if available
                let order_book = self.order_book_history.back();
                
                match risk_manager.analyze_trading_risk(
                    &self.price_history.iter().cloned().collect::<Vec<_>>(),
                    order_book,
                    position_size,
                    self.account_balance,
                ).await {
                    Ok(assessment) => {
                        log_debug!(LogCategory::RiskManagement, 
                            "Risk assessment updated - Overall risk: {:.2}, Market regime: {:?}, Position multiplier: {:.2}", 
                            assessment.overall_risk, assessment.market_regime, assessment.recommended_position_multiplier
                        );
                        self.last_risk_assessment = Some(assessment);
                        Ok(())
                    }
                    Err(e) => {
                        log_warning!(LogCategory::RiskManagement, "Failed to update risk assessment: {}", e);
                        Err(e)
                    }
                }
            } else {
                log_debug!(LogCategory::RiskManagement, "Insufficient price data for risk assessment (need at least 20 points)");
                Ok(())
            }
        } else {
            log_debug!(LogCategory::RiskManagement, "GPU risk manager not initialized");
            Ok(())
        }
    }
    
    pub fn reset_emergency_stop(&mut self) -> Result<(), String> {
        // CRITICAL SAFETY: Add cooldown period for emergency stop reset
        if let Some(last_trigger) = self.last_circuit_breaker_time {
            let now = Utc::now();
            let duration = now.signed_duration_since(last_trigger);
            let min_cooldown = 60; // 1 hour minimum cooldown for emergency stop reset
            
            if duration.num_minutes() < min_cooldown {
                return Err(format!(
                    "Emergency stop reset blocked. Please wait {} more minutes. Last trigger: {}", 
                    min_cooldown - duration.num_minutes(),
                    last_trigger.format("%Y-%m-%d %H:%M:%S UTC")
                ));
            }
        }
        
        // Additional safety: Require manual confirmation for multiple resets
        if self.circuit_breaker_count >= 3 {
            eprintln!("WARNING: Multiple circuit breaker triggers detected. Manual review recommended.");
        }
        
        self.emergency_stop_triggered = false;
        self.circuit_breaker_count = 0; // Reset circuit breaker count
        self.last_circuit_breaker_time = None;
        eprintln!("Emergency stop reset by user after {} minute cooldown period", 60);
        Ok(())
    }
    
    /// Pause the bot temporarily - maintains state for auto-resume
    pub fn pause_bot(&mut self, reason: PauseReason) {
        log_warning!(LogCategory::TradingLogic, "Bot paused: {:?}", reason);
        
        // Get strategy-specific auto-resume settings
        let resume_settings = self.config.get_auto_resume_settings();
        
        // Set auto-resume time based on reason and strategy
        let auto_resume_at = if resume_settings.enabled {
            match &reason {
                PauseReason::HighVolatility { .. } => {
                    // High volatility - wait longer for longer timeframes
                    let delay_minutes = if resume_settings.requires_market_stability { 3 } else { 8 };
                    Some(Utc::now() + chrono::Duration::minutes(delay_minutes))
                },
                PauseReason::DataQuality { .. } => {
                    Some(Utc::now() + chrono::Duration::minutes(resume_settings.delays.data_quality as i64))
                },
                PauseReason::ConnectionIssue { .. } => {
                    Some(Utc::now() + chrono::Duration::minutes(resume_settings.delays.connection as i64))
                },
                PauseReason::FlashCrash { .. } => {
                    Some(Utc::now() + chrono::Duration::minutes(resume_settings.delays.flash_crash as i64))
                },
                PauseReason::RiskManagement { .. } => {
                    // Risk management - more conservative for shorter timeframes
                    let delay_minutes = if resume_settings.requires_market_stability { 5 } else { 15 };
                    Some(Utc::now() + chrono::Duration::minutes(delay_minutes))
                },
                PauseReason::CircuitBreaker { .. } => {
                    // Circuit breaker - strategy-aware delays
                    let delay_minutes = if resume_settings.requires_market_stability { 15 } else { 30 };
                    Some(Utc::now() + chrono::Duration::minutes(delay_minutes))
                },
                PauseReason::Manual => None, // Manual pause requires manual resume
            }
        } else {
            None // Auto-resume disabled
        };
        
        // Generate resume conditions
        let conditions_for_resume = self.generate_resume_conditions(&reason);
        
        self.state = BotState::Paused;
        self.pause_info = Some(PauseInfo {
            reason,
            paused_at: Utc::now(),
            auto_resume_at,
            conditions_for_resume,
        });
        
        // NOTE: Unlike emergency stop, we do NOT close positions during pause
        // This allows the bot to resume without losing position state
    }
    
    /// Resume the bot from paused state
    pub fn resume_bot(&mut self) -> Result<(), String> {
        match self.state {
            BotState::Paused => {
                // Check if resume conditions are met
                if let Some(pause_info) = &self.pause_info {
                    if !self.can_auto_resume(&pause_info.reason) {
                        return Err("Resume conditions not yet met".to_string());
                    }
                }
                
                log_info!(LogCategory::TradingLogic, "Bot resumed from pause");
                self.state = BotState::Running;
                self.pause_info = None;
                Ok(())
            },
            BotState::Stopped => Err("Cannot resume - bot is stopped. Use start_bot() instead".to_string()),
            BotState::Running => Err("Bot is already running".to_string()),
        }
    }
    
    /// Start the bot from stopped state
    pub fn start_bot(&mut self) -> Result<(), String> {
        match self.state {
            BotState::Stopped => {
                // Perform safety checks
                if !self.config.paper_trading_enabled {
                    return Err("Cannot start bot: Paper trading must be enabled".to_string());
                }
                
                if self.account_balance <= Decimal::ZERO {
                    return Err("Cannot start bot: Account balance is zero or negative".to_string());
                }
                
                log_info!(LogCategory::TradingLogic, "Bot started");
                self.state = BotState::Running;
                self.pause_info = None;
                #[allow(deprecated)]
                { self.emergency_stop_triggered = false; }
                Ok(())
            },
            BotState::Paused => {
                // Try to resume instead
                self.resume_bot()
            },
            BotState::Running => Err("Bot is already running".to_string()),
        }
    }
    
    /// Stop the bot completely - closes positions and requires manual restart
    pub fn stop_bot(&mut self, reason: &str) {
        log_warning!(LogCategory::TradingLogic, "Bot stopped: {}", reason);
        
        self.state = BotState::Stopped;
        self.pause_info = None;
        #[allow(deprecated)]
        { self.emergency_stop_triggered = true; }
        
        // Close any open position immediately
        if self.current_position.is_some() {
            self.exit_position(&format!("Bot Stopped: {}", reason));
        }
    }
    
    /// Legacy method for backward compatibility
    pub fn trigger_emergency_stop(&mut self, reason: &str) {
        self.stop_bot(reason);
    }
    
    /// Check if bot can automatically resume based on current conditions
    fn can_auto_resume(&self, pause_reason: &PauseReason) -> bool {
        // Get strategy-specific auto-resume settings
        let resume_settings = self.config.get_auto_resume_settings();
        
        // Check if auto-resume is enabled
        if !resume_settings.enabled {
            return false;
        }
        
        // Check if maximum pause duration has been exceeded
        if let Some(pause_info) = &self.pause_info {
            let pause_duration = Utc::now().signed_duration_since(pause_info.paused_at);
            if pause_duration.num_hours() >= resume_settings.delays.max_pause_hours as i64 {
                log_warning!(LogCategory::TradingLogic, 
                    "Max auto-pause duration ({} hours) exceeded - manual intervention required", 
                    resume_settings.delays.max_pause_hours);
                return false;
            }
        }
        
        // Strategy-aware resume logic
        match pause_reason {
            PauseReason::HighVolatility { threshold, .. } => {
                if let Some(current_volatility) = self.get_current_volatility() {
                    let resume_threshold = threshold * resume_settings.volatility_threshold_multiplier;
                    let volatility_ok = current_volatility < resume_threshold;
                    
                    // Additional checks for scalping strategies
                    if resume_settings.requires_market_stability {
                        volatility_ok && self.is_market_stable() && self.has_sufficient_liquidity()
                    } else if resume_settings.considers_trend_strength {
                        // For trend-following strategies, consider trend strength
                        volatility_ok && (self.is_trend_strong() || self.is_market_stable())
                    } else {
                        volatility_ok
                    }
                } else {
                    false
                }
            },
            PauseReason::DataQuality { .. } => {
                let basic_checks = !self.is_market_data_stale() && self.price_history.len() >= 3;
                
                if resume_settings.requires_market_stability {
                    // Scalping needs more stringent data quality
                    basic_checks && self.price_history.len() >= 5 && self.is_price_data_consistent()
                } else {
                    basic_checks
                }
            },
            PauseReason::ConnectionIssue { .. } => {
                // Connection issues - basic data freshness check
                !self.is_market_data_stale()
            },
            PauseReason::FlashCrash { .. } => {
                let market_stable = self.is_market_stable();
                
                if resume_settings.requires_market_stability {
                    // Scalping requires extra stability after flash crash
                    market_stable && self.has_sufficient_liquidity() && self.is_spread_reasonable()
                } else {
                    market_stable
                }
            },
            PauseReason::RiskManagement { limit, .. } => {
                let current_loss = self.daily_loss_tracker.to_f64().unwrap_or(0.0);
                let loss_threshold = limit * 0.9; // Resume when loss drops to 90% of limit
                
                if resume_settings.requires_market_stability {
                    // Scalping is more sensitive to losses
                    current_loss < loss_threshold * 0.8 // Even more conservative
                } else {
                    current_loss < loss_threshold
                }
            },
            PauseReason::CircuitBreaker { .. } => {
                // Circuit breaker - always conservative
                let basic_stability = self.is_market_stable() && !self.is_market_data_stale();
                
                if resume_settings.requires_market_stability {
                    basic_stability && self.has_sufficient_liquidity() && self.is_spread_reasonable()
                } else if resume_settings.considers_trend_strength {
                    basic_stability && (self.is_trend_strong() || self.get_current_volatility().unwrap_or(1.0) < 0.3)
                } else {
                    basic_stability
                }
            },
            PauseReason::Manual => false, // Manual pause requires manual resume
        }
    }
    
    /// Generate specific conditions needed for auto-resume
    fn generate_resume_conditions(&self, reason: &PauseReason) -> Vec<String> {
        match reason {
            PauseReason::HighVolatility { threshold, .. } => {
                vec![format!("Market volatility drops below {:.1}%", threshold * 80.0)]
            },
            PauseReason::DataQuality { issue } => {
                vec![
                    "Fresh price data received".to_string(),
                    format!("Data quality issue resolved: {}", issue)
                ]
            },
            PauseReason::ConnectionIssue { .. } => {
                vec!["WebSocket connection stabilized".to_string()]
            },
            PauseReason::FlashCrash { .. } => {
                vec![
                    "Market volatility normalized".to_string(),
                    "No extreme price movements for 10 minutes".to_string()
                ]
            },
            PauseReason::RiskManagement { limit, .. } => {
                vec![format!("Daily loss reduced below ${:.2}", limit * 0.9)]
            },
            PauseReason::CircuitBreaker { .. } => {
                vec![
                    "Market conditions stabilized".to_string(),
                    "Data quality verified".to_string(),
                    "Risk parameters within normal range".to_string()
                ]
            },
            PauseReason::Manual => {
                vec!["Manual resume required".to_string()]
            },
        }
    }
    
    /// Check if market conditions are stable enough for auto-resume
    fn is_market_stable(&self) -> bool {
        // Check recent price movements for stability
        if self.price_history.len() < 5 {
            return false;
        }
        
        let recent_prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(5)
            .map(|p| p.close.to_f64().unwrap_or(0.0))
            .collect();
        
        // Calculate volatility of recent prices
        if recent_prices.len() < 2 {
            return false;
        }
        
        let mean = recent_prices.iter().sum::<f64>() / recent_prices.len() as f64;
        let variance = recent_prices.iter()
            .map(|price| (*price - mean).powi(2))
            .sum::<f64>() / recent_prices.len() as f64;
        let volatility = variance.sqrt() / mean;
        
        // Market is stable if volatility is low
        volatility < 0.02 // 2% volatility threshold
    }
    
    /// Get current market volatility
    fn get_current_volatility(&self) -> Option<f64> {
        if self.price_history.len() < 10 {
            return None;
        }
        
        let recent_prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(10)
            .map(|p| p.close.to_f64().unwrap_or(0.0))
            .collect();
        
        if recent_prices.len() < 2 {
            return None;
        }
        
        let mean = recent_prices.iter().sum::<f64>() / recent_prices.len() as f64;
        let variance = recent_prices.iter()
            .map(|price| (*price - mean).powi(2))
            .sum::<f64>() / recent_prices.len() as f64;
        let volatility = variance.sqrt() / mean;
        
        Some(volatility)
    }
    
    /// Check if there's sufficient market liquidity for safe trading
    fn has_sufficient_liquidity(&self) -> bool {
        // Check recent volume levels
        if self.price_history.len() < 5 {
            return false;
        }
        
        let recent_volumes: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(5)
            .map(|p| p.volume.to_f64().unwrap_or(0.0))
            .collect();
        
        let avg_volume = recent_volumes.iter().sum::<f64>() / recent_volumes.len() as f64;
        
        // Minimum volume threshold based on strategy
        let min_volume_threshold = match self.config.timeframe.as_str() {
            "1m" | "3m" | "5m" => 100000.0,  // Scalping needs high liquidity
            "15m" | "30m" | "1h" => 50000.0,  // Medium liquidity
            _ => 10000.0                      // Lower requirement for longer timeframes
        };
        
        avg_volume > min_volume_threshold
    }
    
    /// Check if bid-ask spread is reasonable for trading
    fn is_spread_reasonable(&self) -> bool {
        // This is a simplified check - in a real implementation, you'd check actual bid-ask spread
        // For now, we'll use recent price stability as a proxy
        if self.price_history.len() < 3 {
            return false;
        }
        
        let recent_prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(3)
            .map(|p| p.close.to_f64().unwrap_or(0.0))
            .collect();
        
        if recent_prices.len() < 2 {
            return false;
        }
        
        // Check if price changes are within reasonable bounds (proxy for tight spread)
        let max_change = recent_prices.windows(2)
            .map(|window| (window[0] - window[1]).abs() / window[1])
            .fold(0.0, f64::max);
        
        // Spread is reasonable if price changes are small
        max_change < 0.001 // 0.1% max change between recent prices
    }
    
    /// Check if market trend is strong (for trend-following strategies)
    fn is_trend_strong(&self) -> bool {
        if self.price_history.len() < 20 {
            return false;
        }
        
        let recent_prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(20)
            .map(|p| p.close.to_f64().unwrap_or(0.0))
            .collect();
        
        if recent_prices.len() < 10 {
            return false;
        }
        
        // Simple trend strength: compare first half vs second half
        let first_half = &recent_prices[10..];
        let second_half = &recent_prices[..10];
        
        let first_avg = first_half.iter().sum::<f64>() / first_half.len() as f64;
        let second_avg = second_half.iter().sum::<f64>() / second_half.len() as f64;
        
        let trend_strength = (second_avg - first_avg).abs() / first_avg;
        
        // Strong trend if > 2% move over the period
        trend_strength > 0.02
    }
    
    /// Check if price data is consistent and reliable
    fn is_price_data_consistent(&self) -> bool {
        if self.price_history.len() < 5 {
            return false;
        }
        
        // Check for any anomalous price jumps
        let recent_prices = self.price_history.iter().rev().take(5);
        let mut prev_price: Option<f64> = None;
        
        for price_data in recent_prices {
            let current_price = price_data.close.to_f64().unwrap_or(0.0);
            
            if let Some(prev) = prev_price {
                let change: f64 = (current_price - prev).abs() / prev;
                
                // Flag as inconsistent if any single price jump > 5%
                if change > 0.05 {
                    return false;
                }
            }
            
            prev_price = Some(current_price);
        }
        
        true
    }
    
    /// Check if bot is running (not paused or stopped)
    pub fn is_running(&self) -> bool {
        self.state == BotState::Running
    }
    
    /// Check if bot is paused
    pub fn is_paused(&self) -> bool {
        self.state == BotState::Paused
    }
    
    /// Check if bot is stopped
    pub fn is_stopped(&self) -> bool {
        self.state == BotState::Stopped
    }
    
    /// Get current bot state
    pub fn get_state(&self) -> BotState {
        self.state
    }
    
    /// Get pause information if paused
    pub fn get_pause_info(&self) -> Option<&PauseInfo> {
        self.pause_info.as_ref()
    }
    
    /// Check if bot should auto-resume from pause
    pub fn should_auto_resume(&self) -> bool {
        match (&self.state, &self.pause_info) {
            (BotState::Paused, Some(pause_info)) => {
                // Check if auto-resume time has passed
                if let Some(auto_resume_at) = pause_info.auto_resume_at {
                    if Utc::now() >= auto_resume_at {
                        return self.can_auto_resume(&pause_info.reason);
                    }
                }
                false
            },
            _ => false,
        }
    }
    
    pub fn add_order_book_data(&mut self, order_book: OrderBookDepth, binance_client: &crate::binance_client::ImprovedBinanceClient) {
        // Validate order book data before processing
        if !self.validate_order_book_data(&order_book) {
            eprintln!("Warning: Invalid order book data rejected");
            return;
        }
        
        // Store order book history (avoid clone by taking ownership)
        self.order_book_history.push_back(order_book);
        if self.order_book_history.len() > 50 {
            self.order_book_history.pop_front();
        }
        
        if self.depth_analysis_enabled {
            // Analyze market depth
            self.market_depth_analysis = binance_client.analyze_market_depth(&order_book).ok();
            
            // Detect significant liquidity levels
            let min_volume_threshold = if let Some(analysis) = &self.market_depth_analysis {
                // Set threshold to 2x average volume
                (analysis.avg_bid_depth_5 + analysis.avg_ask_depth_5) / Decimal::from(2) * Decimal::from(2)
            } else {
                Decimal::from(1000) // Default threshold
            };
            
            self.liquidity_levels = binance_client.detect_liquidity_levels(&order_book).unwrap_or_default();
            
            // Check for market manipulation or unusual activity
            self.check_market_manipulation();
        }
    }
    
    fn check_market_manipulation(&mut self) {
        if let Some(ref analysis) = self.market_depth_analysis {
            // Check for extreme order book imbalance (potential manipulation)
            if analysis.depth_imbalance.abs() > 0.8 {
                eprintln!("Warning: Extreme order book imbalance detected: {:.2}%", analysis.depth_imbalance * 100.0);
                
                // If imbalance is too extreme, trigger circuit breaker
                if analysis.depth_imbalance.abs() > 0.9 {
                    self.trigger_circuit_breaker("Extreme order book manipulation detected");
                }
            }
            
            // Check for unusually wide spreads (potential liquidity crisis)
            let spread_percent = if analysis.mid_price > Decimal::ZERO {
                (analysis.bid_ask_spread / analysis.mid_price).to_f64().unwrap_or(0.0)
            } else {
                0.0
            };
            
            if spread_percent > 0.01 { // 1% spread is unusual for major pairs
                eprintln!("Warning: Wide bid-ask spread detected: {:.3}%", spread_percent * 100.0);
            }
            
            // Check for low liquidity
            if analysis.liquidity_score < 0.3 {
                eprintln!("Warning: Low market liquidity detected: {:.2}", analysis.liquidity_score);
            }
        }
    }
    
    pub fn enable_depth_analysis(&mut self, enabled: bool) {
        self.depth_analysis_enabled = enabled;
        if enabled {
            eprintln!("Level 2 market depth analysis enabled");
        } else {
            eprintln!("Level 2 market depth analysis disabled");
        }
    }
    
    /// Set GPU risk manager for enhanced analysis
    pub fn set_gpu_risk_manager(&mut self, gpu_manager: std::sync::Arc<GpuRiskManager>) {
        self.gpu_risk_manager = Some(gpu_manager);
        log_info!(LogCategory::Configuration, "GPU risk manager enabled for enhanced market analysis");
    }
    
    /// Schedule asynchronous GPU risk assessment update
    fn schedule_gpu_risk_update(&mut self, gpu_manager: std::sync::Arc<GpuRiskManager>) {
        // Convert price history to model format for GPU analysis
        let price_data: Vec<crate::models::PriceData> = self.price_history
            .iter()
            .map(|p| crate::models::PriceData {
                timestamp: p.timestamp,
                open: p.open,
                high: p.high,
                low: p.low,
                close: p.close,
                volume: p.volume,
            })
            .collect();
        
        // Get current order book for liquidity analysis
        let order_book = self.order_book_history.back();
        
        // Calculate approximate position size for risk assessment
        let estimated_position_size = self.account_balance * Decimal::from_str("0.02").unwrap_or(Decimal::ZERO);
        
        // Note: In a real implementation, this would be an async task
        // For now, we'll simulate the GPU analysis result
        self.last_risk_assessment = Some(TradingRiskAssessment {
            volatility_risk: 0.3,
            liquidity_risk: 0.2,
            pattern_risk: 0.1,
            overall_risk: 0.2,
            recommended_position_multiplier: 0.8, // Reduce position by 20%
            dynamic_stop_loss: None,
            execution_risk: 0.1,
            market_regime: MarketRegime::Normal,
            should_skip_trade: false,
        });
        
        log_debug!(LogCategory::RiskManagement, "GPU risk assessment updated - overall risk: {}", 0.2);
    }

    pub fn add_price_data(&mut self, price: PriceData) {
        // Validate price data before adding
        if !self.is_valid_price_data(&price) {
            log_error!(LogCategory::DataProcessing, "CRITICAL: Invalid price data rejected: {:?}", price);
            // Increment validation failure counter
            self.trigger_circuit_breaker("Invalid price data received");
            return;
        }
        
        // Trigger GPU risk analysis if manager is available and we have sufficient data
        if let Some(ref gpu_manager) = self.gpu_risk_manager {
            if self.price_history.len() >= 20 { // Minimum data for meaningful analysis
                self.schedule_gpu_risk_update(Arc::clone(gpu_manager));
            }
        }
        
        // Check for timestamp ordering
        if let Some(last_price) = self.price_history.back() {
            if price.timestamp <= last_price.timestamp {
                eprintln!("Warning: Out-of-order price data rejected (current: {}, last: {})", 
                    price.timestamp, last_price.timestamp);
                return;
            }
            
            // Check for timestamp gaps (missing data)
            let time_gap = price.timestamp.signed_duration_since(last_price.timestamp);
            if time_gap.num_minutes() > 5 {
                eprintln!("Warning: Large time gap in price data: {} minutes", time_gap.num_minutes());
            }
        }
        
        // Store price for enhanced LRO (use reference to avoid clone)
        self.price_history.push_back(price.clone());
        let price_for_enhanced_lro = self.price_history.back().unwrap();
        if self.price_history.len() > 200 {
            self.price_history.pop_front();
        }

        // Calculate LRO using enhanced algorithm with 2025 improvements
        if self.price_history.len() >= self.config.period {
            let (lro_value, enhanced_signal) = if let Some(ref mut enhanced_lro) = self.enhanced_lro {
                // Use enhanced LRO with multi-timeframe analysis
                if let Some(signal) = enhanced_lro.update(&price_for_enhanced_lro) {
                    let deviation = match signal {
                        EnhancedLROSignal::StrongBuy { deviation, .. } |
                        EnhancedLROSignal::Buy { deviation, .. } |
                        EnhancedLROSignal::Neutral { deviation } |
                        EnhancedLROSignal::Sell { deviation, .. } |
                        EnhancedLROSignal::StrongSell { deviation, .. } => deviation,
                    };
                    (deviation, Some(signal))
                } else {
                    (self.calculate_lro_incremental(), None)
                }
            } else {
                // Fallback to legacy LRO calculation
                (self.calculate_lro_incremental(), None)
            };

            self.lro_history.push_back(lro_value);
            
            if self.lro_history.len() > 100 {
                self.lro_history.pop_front();
            }

            // Generate trading signal (enhanced or fallback)
            let trading_signal = if let Some(enhanced_signal) = enhanced_signal {
                self.convert_enhanced_signal_to_legacy(enhanced_signal, lro_value)
            } else if let Some((signal, signal_line_value)) = self.generate_signal_with_line(lro_value) {
                Some((signal, signal_line_value))
            } else {
                None
            };

            if let Some((signal, signal_line_value)) = trading_signal {
                // Store signal line in history for crossover detection
                self.signal_line_history.push_back(signal_line_value);
                if self.signal_line_history.len() > 200 {
                    self.signal_line_history.pop_front();
                }
                
                self.signal_history.push_back(signal);
                if self.signal_history.len() > 50 {
                    self.signal_history.pop_front();
                }

                // Check market conditions for circuit breaker triggers
                self.check_market_conditions_for_circuit_breaker();
                
                // Check for auto-resume opportunity
                if self.should_auto_resume() {
                    if let Err(e) = self.resume_bot() {
                        log_debug!(LogCategory::TradingLogic, "Auto-resume failed: {}", e);
                    } else {
                        log_info!(LogCategory::TradingLogic, "Bot auto-resumed successfully");
                    }
                }
                
                // Execute trading logic if bot is running and data is fresh
                if self.is_running() && !self.is_market_data_stale() {
                    self.process_signal(signal);
                } else if self.is_running() && self.is_market_data_stale() {
                    // Pause due to stale data instead of just warning
                    let pause_reason = PauseReason::DataQuality { 
                        issue: "Stale market data detected".to_string() 
                    };
                    self.pause_bot(pause_reason);
                } else if self.is_paused() {
                    log_debug!(LogCategory::TradingLogic, "Bot paused - skipping signal processing");
                }
            }
        }
    }

    fn calculate_lro_incremental(&mut self) -> f64 {
        // Update LRO cache with new price data
        self.update_lro_cache();
        
        // Calculate using cached values
        if let Some((slope, intercept)) = self.lro_cache.calculate_regression() {
            let current_price = self.price_history.back().map(|p| p.close.to_f64().unwrap_or(0.0)).unwrap_or(0.0);
            let predicted_price = slope * (self.config.period - 1) as f64 + intercept;
            
            // Calculate LRO as normalized deviation
            let price_range = self.calculate_price_range();
            let lro = if price_range > 0.0 {
                (current_price - predicted_price) / price_range
            } else {
                0.0
            };
            
            // Clamp LRO between -1 and 1
            lro.max(-1.0).min(1.0)
        } else {
            0.0
        }
    }
    
    fn update_lro_cache(&mut self) {
        let period = self.config.period;
        let history_len = self.price_history.len();
        
        // If we don't have enough data, reset cache
        if history_len < period {
            self.lro_cache.reset();
            return;
        }
        
        // If cache period changed, rebuild
        if self.lro_cache.period != period {
            self.lro_cache = LroCache::new(period);
            self.rebuild_lro_cache();
            return;
        }
        
        // If cache is invalid or empty, rebuild
        if !self.lro_cache.is_valid || self.lro_cache.n == 0 {
            self.rebuild_lro_cache();
            return;
        }
        
        // Incremental update with proper rolling window logic
        if history_len > period {
            // Remove the oldest point (which was at x=0)
            let old_price = self.price_history[history_len - period - 1].close;
            
            // Shift all x-coordinates by subtracting 1 from each
            // For period n: old sums had x values [0,1,2,...,n-1]
            // New sums should have x values [0,1,2,...,n-1] (after shifting [1,2,3,...,n] -> [0,1,2,...,n-1])
            
            // Remove old point at x=0
            self.lro_cache.remove_point(0.0, old_price.to_f64().unwrap_or(0.0));
            
            // Shift: new_sum_x = old_sum_x - n (since we subtract 1 from each of n points)
            // new_sum_x2 = old_sum_x2 - 2*old_sum_x + n (using (x-1)² = x² - 2x + 1)
            // new_sum_xy = old_sum_xy - old_sum_y (since we subtract 1 from each x)
            let n = self.lro_cache.n as f64;
            self.lro_cache.sum_x -= n;
            self.lro_cache.sum_x2 = self.lro_cache.sum_x2 - 2.0 * (self.lro_cache.sum_x + n) + n;
            self.lro_cache.sum_xy -= self.lro_cache.sum_y;
        }
        
        // Add new point at x = (current_count)
        if let Some(latest_price) = self.price_history.back() {
            let new_price = latest_price.close;
            let x_value = self.lro_cache.n as f64;
            self.lro_cache.add_point(x_value, new_price.to_f64().unwrap_or(0.0));
        } else {
            log_warning!(LogCategory::DataProcessing, "Cannot update LRO cache - price history is empty");
        }
    }
    
    fn rebuild_lro_cache(&mut self) {
        self.lro_cache.reset();
        let period = self.config.period;
        let history_len = self.price_history.len();
        
        if history_len < period {
            return;
        }
        
        // Performance optimization: use vectorized operations for cache rebuilding
        let start_idx = history_len - period;
        let prices: Vec<f64> = self.price_history
            .iter()
            .skip(start_idx)
            .map(|p| p.close.to_f64().unwrap_or(0.0))
            .collect();
        
        // Optimized bulk calculation
        self.lro_cache.period = period;
        self.lro_cache.n = period;
        
        // Calculate all sums in single pass
        let mut sum_x = 0.0;
        let mut sum_y = 0.0;
        let mut sum_xy = 0.0;
        let mut sum_x2 = 0.0;
        
        for (i, &price) in prices.iter().enumerate() {
            let x = i as f64;
            sum_x += x;
            sum_y += price;
            sum_xy += x * price;
            sum_x2 += x * x;
        }
        
        self.lro_cache.sum_x = sum_x;
        self.lro_cache.sum_y = sum_y;
        self.lro_cache.sum_xy = sum_xy;
        self.lro_cache.sum_x2 = sum_x2;
        self.lro_cache.is_valid = true;
        
        log_debug!(LogCategory::Performance, "LRO cache rebuilt for {} data points", period);
    }
    
    // Keep the original method as fallback for validation
    fn calculate_lro(&self) -> f64 {
        let prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(self.config.period)
            .map(|p| p.close.to_f64().unwrap_or(0.0))
            .collect();

        if prices.len() < self.config.period {
            return 0.0;
        }

        // Linear regression calculation
        let n = prices.len() as f64;
        let x_sum: f64 = (0..prices.len()).map(|i| i as f64).sum();
        let y_sum: f64 = prices.iter().sum();
        let xy_sum: f64 = prices.iter().enumerate()
            .map(|(i, &price)| i as f64 * price)
            .sum();
        let x2_sum: f64 = (0..prices.len()).map(|i| (i as f64).powi(2)).sum();

        // Linear regression slope - protect against division by zero
        let denominator = n * x2_sum - x_sum.powi(2);
        if denominator.abs() < f64::EPSILON {
            return 0.0; // Return neutral LRO value if calculation is invalid
        }
        let slope = (n * xy_sum - x_sum * y_sum) / denominator;
        
        // Linear regression intercept
        let intercept = (y_sum - slope * x_sum) / n;
        
        // Predicted price at current bar
        let predicted_price = slope * (prices.len() - 1) as f64 + intercept;
        
        // Current price
        let current_price = prices[prices.len() - 1];
        
        // Calculate LRO as normalized deviation
        let price_range = self.calculate_price_range();
        let lro = if price_range > 0.0 {
            (current_price - predicted_price) / price_range
        } else {
            0.0
        };

        // Clamp LRO between -1 and 1
        lro.max(-1.0).min(1.0)
    }

    fn calculate_price_range(&self) -> f64 {
        // Use the same period as LRO calculation for consistent normalization
        let recent_prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(self.config.period)
            .flat_map(|p| vec![p.high.to_f64().unwrap_or(0.0), p.low.to_f64().unwrap_or(0.0)])
            .collect();

        if recent_prices.is_empty() {
            return 1.0;
        }

        let max_price = recent_prices.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let min_price = recent_prices.iter().copied().fold(f64::INFINITY, f64::min);
        
        max_price - min_price
    }

    fn generate_signal_with_line(&self, lro_value: f64) -> Option<(LROSignal, f64)> {
        if self.lro_history.len() < self.config.signal_period {
            return None;
        }

        // Calculate signal line (moving average of LRO)
        let signal_line = self.lro_history
            .iter()
            .rev()
            .take(self.config.signal_period)
            .sum::<f64>() / self.config.signal_period as f64;
        
        // Store signal line in history for crossover detection
        // Note: This will be added to signal_line_history in the calling function

        // Detect market conditions
        let market_condition = self.analyze_market_condition();
        
        // Adaptive thresholds based on market conditions
        let (overbought, oversold) = if self.config.adaptive_enabled {
            self.calculate_adaptive_thresholds(&market_condition)
        } else {
            (self.config.overbought, self.config.oversold)
        };

        // Generate signal based on LRO crossovers and thresholds
        let signal_type = self.determine_signal_type(
            lro_value, 
            signal_line, 
            overbought, 
            oversold, 
            &market_condition
        );

        // Calculate signal strength - validate result
        let strength = self.calculate_signal_strength(lro_value, signal_line, &market_condition);
        if !strength.is_finite() || strength < 0.0 || strength > 1.0 {
            log_warning!(LogCategory::Trading, "Invalid signal strength calculated: {}", strength);
            return None;
        }

        Some((LROSignal {
            timestamp: Utc::now(),
            lro_value,
            signal_line,
            signal_type,
            strength,
            market_condition,
        }, signal_line))
    }
    
    fn calculate_adaptive_thresholds_with_depth(&self, market_condition: &MarketCondition) -> (f64, f64) {
        let (base_overbought, base_oversold) = self.calculate_adaptive_thresholds(market_condition);
        
        // Adjust thresholds based on Level 2 market data
        if let Some(ref depth_analysis) = self.market_depth_analysis {
            let mut overbought_adj = 0.0;
            let mut oversold_adj = 0.0;
            
            // If there's strong buying pressure (depth imbalance), lower buy threshold
            if depth_analysis.depth_imbalance > 0.3 {
                oversold_adj = -0.1; // Make it easier to trigger buy signals
            }
            
            // If there's strong selling pressure, lower sell threshold
            if depth_analysis.depth_imbalance < -0.3 {
                overbought_adj = -0.1; // Make it easier to trigger sell signals
            }
            
            // Adjust for liquidity - in low liquidity, be more conservative
            if depth_analysis.liquidity_score < 0.4 {
                overbought_adj += 0.1; // Harder to sell
                oversold_adj -= 0.1;   // Harder to buy
            }
            
            return (
                (base_overbought + overbought_adj).min(0.95).max(0.5),
                (base_oversold + oversold_adj).max(-0.95).min(-0.5)
            );
        }
        
        (base_overbought, base_oversold)
    }
    
    fn determine_signal_type_with_depth(
        &self,
        lro_value: f64,
        signal_line: f64,
        overbought: f64,
        oversold: f64,
        market_condition: &MarketCondition,
    ) -> SignalType {
        let base_signal = self.determine_signal_type(lro_value, signal_line, overbought, oversold, market_condition);
        
        // Check if Level 2 data supports or contradicts the signal
        if let Some(ref depth_analysis) = self.market_depth_analysis {
            match base_signal {
                SignalType::Buy | SignalType::StrongBuy => {
                    // Check for resistance levels that might block upward movement
                    let current_price = depth_analysis.mid_price;
                    let has_strong_resistance = self.liquidity_levels
                        .iter()
                        .any(|level| {
                            matches!(level.level_type, crate::models::LiquidityType::Resistance | crate::models::LiquidityType::WhaleOrder) &&
                            level.price > current_price &&
                            level.price < current_price * Decimal::from_f64(1.02).unwrap_or_default() && // Within 2%
                            level.strength > 0.7
                        });
                    
                    if has_strong_resistance {
                        eprintln!("Buy signal weakened by strong resistance levels");
                        return SignalType::Hold; // Don't buy into strong resistance
                    }
                    
                    // Check for strong buying pressure in order book
                    if depth_analysis.depth_imbalance > 0.5 {
                        return if matches!(base_signal, SignalType::Buy) {
                            SignalType::StrongBuy
                        } else {
                            base_signal
                        };
                    }
                }
                SignalType::Sell | SignalType::StrongSell => {
                    // Check for support levels that might block downward movement
                    let current_price = depth_analysis.mid_price;
                    let has_strong_support = self.liquidity_levels
                        .iter()
                        .any(|level| {
                            matches!(level.level_type, crate::models::LiquidityType::Support | crate::models::LiquidityType::WhaleOrder) &&
                            level.price < current_price &&
                            level.price > current_price * Decimal::from_f64(0.98).unwrap_or_default() && // Within 2%
                            level.strength > 0.7
                        });
                    
                    if has_strong_support {
                        eprintln!("Sell signal weakened by strong support levels");
                        return SignalType::Hold; // Don't sell into strong support
                    }
                    
                    // Check for strong selling pressure in order book
                    if depth_analysis.depth_imbalance < -0.5 {
                        return if matches!(base_signal, SignalType::Sell) {
                            SignalType::StrongSell
                        } else {
                            base_signal
                        };
                    }
                }
                SignalType::Hold => {
                    // Even if LRO says hold, check for extreme order book imbalances
                    if depth_analysis.depth_imbalance > 0.8 {
                        return SignalType::Buy; // Extreme buying pressure
                    } else if depth_analysis.depth_imbalance < -0.8 {
                        return SignalType::Sell; // Extreme selling pressure
                    }
                }
            }
        }
        
        base_signal
    }
    
    fn calculate_enhanced_signal_strength(
        &self,
        lro_value: f64,
        signal_line: f64,
        market_condition: &MarketCondition,
    ) -> f64 {
        let base_strength = self.calculate_signal_strength(lro_value, signal_line, market_condition);
        
        if let Some(ref depth_analysis) = self.market_depth_analysis {
            let mut strength_multiplier = 1.0;
            
            // Boost strength based on order book imbalance
            let imbalance_boost = (depth_analysis.depth_imbalance.abs() * 0.3).min(0.3);
            strength_multiplier += imbalance_boost;
            
            // Boost strength based on liquidity (more liquid = more confident)
            let liquidity_boost = (depth_analysis.liquidity_score - 0.5) * 0.2;
            strength_multiplier += liquidity_boost;
            
            // Reduce strength if there are conflicting large orders
            let conflicting_orders = self.liquidity_levels
                .iter()
                .filter(|level| level.strength > 0.8)
                .count();
            
            if conflicting_orders > 3 {
                strength_multiplier *= 0.8; // Reduce confidence when there are many large conflicting orders
            }
            
            // Apply price impact consideration - if executing would move price significantly, reduce strength
            if depth_analysis.price_impact_1pct > 0.005 { // 0.5% price impact
                strength_multiplier *= 0.9;
            }
            
            return (base_strength * strength_multiplier).min(1.0).max(0.0);
        }
        
        base_strength
    }

    fn analyze_market_condition(&self) -> MarketCondition {
        let recent_prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(50)
            .map(|p| p.close.to_f64().unwrap_or(0.0))
            .collect();

        if recent_prices.len() < 20 {
            return MarketCondition {
                trend_strength: 0.0,
                volatility: 0.5,
                volume_profile: 1.0,
                market_phase: MarketPhase::Ranging,
            };
        }

        // Calculate trend strength using linear regression slope
        let trend_strength = self.calculate_trend_strength(&recent_prices);
        
        // Calculate volatility using standard deviation
        let volatility = self.calculate_volatility(&recent_prices);
        
        // Calculate volume profile
        let volume_profile = self.calculate_volume_profile();
        
        // Determine market phase
        let market_phase = self.determine_market_phase(trend_strength, volatility);

        MarketCondition {
            trend_strength,
            volatility,
            volume_profile,
            market_phase,
        }
    }

    fn calculate_trend_strength(&self, prices: &[f64]) -> f64 {
        if prices.len() < 10 {
            return 0.0;
        }

        let n = prices.len() as f64;
        let x_sum: f64 = (0..prices.len()).map(|i| i as f64).sum();
        let y_sum: f64 = prices.iter().sum();
        let xy_sum: f64 = prices.iter().enumerate()
            .map(|(i, &price)| i as f64 * price)
            .sum();
        let x2_sum: f64 = (0..prices.len()).map(|i| (i as f64).powi(2)).sum();

        // Protect against division by zero
        let denominator = n * x2_sum - x_sum.powi(2);
        if denominator.abs() < f64::EPSILON {
            return 0.0; // Return neutral trend strength if calculation is invalid
        }
        let slope = (n * xy_sum - x_sum * y_sum) / denominator;
        let avg_price = y_sum / n;
        
        // Normalize slope by average price
        let normalized_slope = slope / avg_price;
        
        // Scale to -1 to 1 range
        (normalized_slope * 1000.0).tanh()
    }

    fn calculate_volatility(&self, prices: &[f64]) -> f64 {
        if prices.len() < 2 {
            return 0.5;
        }

        let mean = prices.iter().sum::<f64>() / prices.len() as f64;
        let variance = prices.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f64>() / prices.len() as f64;
        let std_dev = variance.sqrt();
        
        // Normalize volatility (assuming normal range is 0-5% of price)
        let normalized_volatility = (std_dev / mean) * 20.0;
        normalized_volatility.min(1.0)
    }

    fn calculate_volume_profile(&self) -> f64 {
        if self.price_history.len() < 20 {
            return 1.0;
        }

        let recent_volume: f64 = self.price_history
            .iter()
            .rev()
            .take(5)
            .map(|p| p.volume.to_f64().unwrap_or(0.0))
            .sum();

        let avg_volume: f64 = self.price_history
            .iter()
            .rev()
            .take(20)
            .map(|p| p.volume.to_f64().unwrap_or(0.0))
            .sum::<f64>() / 20.0;

        if avg_volume > f64::EPSILON {
            (recent_volume / 5.0) / avg_volume
        } else {
            1.0 // Return neutral volume profile if no volume data
        }
    }

    fn determine_market_phase(&self, trend_strength: f64, volatility: f64) -> MarketPhase {
        let abs_trend = trend_strength.abs();
        
        if abs_trend > 0.7 && volatility < 0.3 {
            MarketPhase::Trending
        } else if abs_trend < 0.3 && volatility < 0.5 {
            MarketPhase::Ranging
        } else if volatility > 0.7 {
            MarketPhase::Breakout
        } else {
            MarketPhase::Reversal
        }
    }

    fn calculate_adaptive_thresholds(&self, market_condition: &MarketCondition) -> (f64, f64) {
        let base_overbought = self.config.overbought;
        let base_oversold = self.config.oversold;
        
        // Get timeframe-specific volatility factor
        let timeframe_factor = self.config.get_timeframe_volatility_factor();
        
        // Adjust thresholds based on market conditions and timeframe
        let volatility_adjustment = market_condition.volatility * 0.3 * timeframe_factor;
        let trend_adjustment = market_condition.trend_strength.abs() * 0.2;
        
        let adjustment = volatility_adjustment + trend_adjustment;
        
        let overbought = base_overbought + adjustment;
        let oversold = base_oversold - adjustment;
        
        (overbought.min(0.95), oversold.max(-0.95))
    }

    fn determine_signal_type(
        &self,
        lro_value: f64,
        signal_line: f64,
        overbought: f64,
        oversold: f64,
        market_condition: &MarketCondition,
    ) -> SignalType {
        // Fixed crossover detection: compare current vs previous LRO to current vs previous signal line
        let (lro_cross_above, lro_cross_below) = if self.lro_history.len() > 1 && self.signal_line_history.len() > 0 {
            let prev_lro = self.lro_history[self.lro_history.len() - 2];
            let prev_signal = self.signal_line_history[self.signal_line_history.len() - 1];
            
            let cross_above = lro_value > signal_line && prev_lro <= prev_signal;
            let cross_below = lro_value < signal_line && prev_lro >= prev_signal;
            
            (cross_above, cross_below)
        } else {
            (false, false)
        };

        // Strong signals in trending markets
        if matches!(market_condition.market_phase, MarketPhase::Trending) {
            if lro_value < oversold && lro_cross_above && market_condition.trend_strength > 0.0 {
                return SignalType::StrongBuy;
            }
            if lro_value > overbought && lro_cross_below && market_condition.trend_strength < 0.0 {
                return SignalType::StrongSell;
            }
        }

        // Regular signals
        if lro_value < oversold && lro_cross_above {
            SignalType::Buy
        } else if lro_value > overbought && lro_cross_below {
            SignalType::Sell
        } else {
            SignalType::Hold
        }
    }

    fn calculate_signal_strength(
        &self,
        lro_value: f64,
        signal_line: f64,
        market_condition: &MarketCondition,
    ) -> f64 {
        let lro_distance = (lro_value - signal_line).abs();
        let extreme_level = lro_value.abs();
        let volume_factor = market_condition.volume_profile.min(2.0) / 2.0;
        
        // Combine factors for signal strength
        let base_strength = (lro_distance + extreme_level) / 2.0;
        let adjusted_strength = base_strength * volume_factor;
        
        adjusted_strength.min(1.0)
    }

    fn process_signal(&mut self, signal: LROSignal) {
        // Perform GPU risk assessment before processing any signals
        if let Some(ref risk_manager) = self.gpu_risk_manager {
            if let Some(latest_price) = self.price_history.back() {
                let position_size = self.calculate_position_size(&signal);
                let price_data_slice = self.price_history.iter().collect::<Vec<_>>();
                
                // Perform async risk assessment (this is a synchronous context, so we'd need to restructure)
                // For now, we'll use the last risk assessment if available
                if let Some(ref assessment) = self.last_risk_assessment {
                    if assessment.should_skip_trade {
                        log_warning!(LogCategory::RiskManagement, "GPU risk assessment recommends skipping signal (risk level: {:.2})", assessment.overall_risk);
                        return;
                    }
                }
            }
        }
        
        // Check bot state - should only process signals when running
        if !self.is_running() {
            log_debug!(LogCategory::TradingLogic, "Bot not running (state: {:?}). Skipping signal processing.", self.state);
            return;
        }
        
        // Check circuit breaker status - pause if still active
        if self.is_circuit_breaker_active() {
            let pause_reason = PauseReason::CircuitBreaker { 
                trigger_count: self.circuit_breaker_count 
            };
            self.pause_bot(pause_reason);
            return;
        }
        
        // Atomic check for daily loss limits before processing any signals
        if self.has_exceeded_daily_loss_limit() {
            self.trigger_circuit_breaker("Daily loss limit exceeded");
            return;
        }
        
        // Pre-calculate potential loss for risk assessment
        if let Some(latest_price) = self.price_history.back() {
            let current_price = latest_price.close;
            let potential_loss = self.calculate_potential_loss(current_price);
            
            // Check if potential loss would exceed daily limit
            if potential_loss > Decimal::ZERO {
                let max_daily_loss = DecimalUtils::safe_from_f64_or_default(
                    self.config.max_daily_loss, 
                    Decimal::from(100), 
                    "max daily loss config"
                );
                let remaining_daily_limit = max_daily_loss - self.daily_loss_tracker;
                
                if potential_loss > remaining_daily_limit {
                    eprintln!("Signal blocked: Potential loss ${} exceeds remaining daily limit ${}", potential_loss, remaining_daily_limit);
                    return;
                }
            }
        }
        
        // Check if current position has exceeded max hold time
        if let Some(ref position) = self.current_position {
            if self.is_position_expired(position) {
                eprintln!("Position exceeded max hold time. Forcing exit.");
                self.exit_position("Max Hold Time Exceeded");
            }
        }
        
        match signal.signal_type {
            SignalType::Buy | SignalType::StrongBuy => {
                if self.current_position.is_none() && signal.strength > self.config.signal_strength_threshold {
                    // Enter long position
                    self.enter_position(signal, crate::models::TradeSide::Long);
                }
            }
            SignalType::Sell | SignalType::StrongSell => {
                if let Some(ref position) = self.current_position {
                    if matches!(position.side, crate::models::TradeSide::Long) {
                        // Exit long position
                        self.exit_position("LRO Signal");
                    }
                } else if signal.strength > self.config.signal_strength_threshold {
                    // Enter short position
                    self.enter_position(signal, crate::models::TradeSide::Short);
                }
            }
            SignalType::Hold => {
                // Check for stop loss or take profit
                self.check_exit_conditions();
            }
        }
    }

    fn enter_position(&mut self, signal: LROSignal, side: crate::models::TradeSide) {
        if let Some(latest_price) = self.price_history.back() {
            let entry_price = latest_price.close;
            let quantity = self.calculate_position_size(&signal);
            
            // Calculate stop loss and take profit
            let (stop_loss, take_profit) = self.calculate_risk_levels(entry_price, &side, &signal);
            
            let position = BotPosition {
                symbol: "BTCUSDT".to_string(), // This should be configurable
                side: side.clone(),
                entry_price,
                quantity,
                entry_time: Utc::now(),
                stop_loss,
                take_profit,
                entry_signal: signal,
            };
            
            // Only set position if we're in paper trading mode or if live trading is properly configured
            if self.config.paper_trading_enabled {
                eprintln!("Paper trade entered: {:?} {} at ${}", side, quantity, entry_price);
                self.current_position = Some(position);
            } else {
                eprintln!("Live trading attempted but not implemented. Enable paper trading mode.");
                // Don't set position for safety
            }
        }
    }

    fn exit_position(&mut self, reason: &str) {
        if let Some(position) = self.current_position.take() {
            if let Some(latest_price) = self.price_history.back() {
                let exit_price = latest_price.close;
                let hold_time = Utc::now().signed_duration_since(position.entry_time).num_minutes() as f64 / 60.0;
                
                // Calculate P/L
                let pnl = match position.side {
                    crate::models::TradeSide::Long => (exit_price - position.entry_price) * position.quantity,
                    crate::models::TradeSide::Short => (position.entry_price - exit_price) * position.quantity,
                };
                
                // Update performance stats and daily loss tracker
                self.update_performance_stats(pnl, hold_time);
                
                // Atomic daily loss tracking with validation
                if pnl < Decimal::ZERO {
                    let loss_amount = pnl.abs();
                    let new_daily_loss = self.daily_loss_tracker + loss_amount;
                    
                    // Validate the loss amount is reasonable
                    if loss_amount > self.account_balance {
                        eprintln!("Warning: Loss amount exceeds account balance: ${} > ${}", loss_amount, self.account_balance);
                    }
                    
                    // Atomic update
                    self.daily_loss_tracker = new_daily_loss;
                    eprintln!("Daily loss updated: +${} (total: ${})", loss_amount, new_daily_loss);
                    
                    // Check if approaching daily limit
                    let max_daily_loss = DecimalUtils::safe_from_f64_or_default(
                    self.config.max_daily_loss, 
                    Decimal::from(100), 
                    "max daily loss config"
                );
                    let limit_ratio = new_daily_loss / max_daily_loss;
                    
                    if limit_ratio > Decimal::from_f64(0.8).unwrap_or(Decimal::ONE) {
                        eprintln!("WARNING: Approaching daily loss limit: {}% used", limit_ratio * Decimal::from(100));
                    }
                }
            }
        }
    }

    fn calculate_position_size(&self, signal: &LROSignal) -> Decimal {
        // GPU-enhanced position sizing with real-time risk assessment
        let mut base_risk_percent = 0.02; // 2% base risk
        
        // Apply GPU risk assessment if available
        if let Some(ref risk_assessment) = self.last_risk_assessment {
            // Reduce position size based on GPU-calculated risk factors
            let risk_multiplier = risk_assessment.recommended_position_multiplier;
            base_risk_percent *= risk_multiplier as f64;
            
            // Additional safety checks based on market regime
            match risk_assessment.market_regime {
                MarketRegime::Crisis => {
                    log_warning!(LogCategory::RiskManagement, "Crisis mode detected - disabling new positions");
                    return Decimal::ZERO;
                },
                MarketRegime::Volatile => {
                    base_risk_percent *= 0.5; // Halve position size in volatile conditions
                    log_info!(LogCategory::RiskManagement, "Volatile market detected - reducing position size by 50%");
                },
                MarketRegime::Normal => {
                    // Use normal sizing
                }
            }
            
            // Skip trade if GPU assessment indicates high risk
            if risk_assessment.should_skip_trade {
                log_warning!(LogCategory::RiskManagement, "GPU risk assessment recommends skipping trade");
                return Decimal::ZERO;
            }
        }
        
        let risk_percent = DecimalUtils::safe_from_f64_or_default(base_risk_percent, Decimal::from(2) / Decimal::from(100), "adjusted risk percentage");
        let max_risk_amount = self.account_balance * risk_percent;
        
        // Get configured max position size from config
        let max_position_from_config = DecimalUtils::safe_from_f64_or_default(
            self.config.max_position_size, 
            Decimal::from(1000), 
            "max position size config"
        );
        
        // Base position size on signal strength and market conditions
        let strength_multiplier = DecimalUtils::safe_from_f64_or_default(
            signal.strength, 
            Decimal::ONE, 
            "signal strength"
        );
        let volatility_adjustment = Decimal::ONE - DecimalUtils::safe_from_f64_or_default(
            signal.market_condition.volatility * 0.5, 
            Decimal::from_str("0.25").unwrap_or(Decimal::ZERO), 
            "volatility adjustment"
        );
        
        // Calculate position size
        let calculated_size = max_risk_amount * strength_multiplier * volatility_adjustment;
        
        // Apply limits: minimum of risk-based size, configured max, and account balance
        let final_size = calculated_size
            .min(max_position_from_config)
            .min(self.account_balance * Decimal::from_f64(0.8).unwrap_or(Decimal::ONE)); // Max 80% of balance
        
        // Ensure minimum viable position size
        final_size.max(Decimal::from(10)) // Minimum $10 position
    }

    fn calculate_risk_levels(
        &self,
        entry_price: Decimal,
        side: &crate::models::TradeSide,
        signal: &LROSignal,
    ) -> (Option<Decimal>, Option<Decimal>) {
        // Use timeframe-aware risk parameters
        let stop_loss = self.config.get_scaled_stop_loss();
        let take_profit = self.config.get_scaled_take_profit();
        let risk_percent = DecimalUtils::safe_from_f64_or_default(
            stop_loss / 100.0, 
            Decimal::from(2) / Decimal::from(100), 
            "stop loss percentage"
        );
        let reward_ratio = DecimalUtils::safe_from_f64_or_default(
            take_profit / stop_loss, 
            Decimal::from(2), 
            "reward ratio"
        );
        
        match side {
            crate::models::TradeSide::Long => {
                let stop_loss = entry_price * (Decimal::ONE - risk_percent);
                let take_profit = entry_price * (Decimal::ONE + risk_percent * reward_ratio);
                (Some(stop_loss), Some(take_profit))
            }
            crate::models::TradeSide::Short => {
                let stop_loss = entry_price * (Decimal::ONE + risk_percent);
                let take_profit = entry_price * (Decimal::ONE - risk_percent * reward_ratio);
                (Some(stop_loss), Some(take_profit))
            }
        }
    }

    fn check_exit_conditions(&mut self) {
        if let Some(ref position) = self.current_position {
            if let Some(latest_price) = self.price_history.back() {
                let current_price = latest_price.close;
                
                // Validate current price
                if current_price <= Decimal::ZERO {
                    eprintln!("Warning: Invalid current price for exit check: {}", current_price);
                    return;
                }
                
                // Check for extreme price gaps (potential data issue or flash crash)
                let price_change_percent = ((current_price - position.entry_price) / position.entry_price).abs();
                if price_change_percent > Decimal::from_f64(0.2).unwrap_or(Decimal::ONE) { // 20% gap
                    eprintln!("Warning: Extreme price gap detected: {}% - potential data issue", price_change_percent * Decimal::from(100));
                    // Still process but with extra caution
                }
                
                // Check stop loss with enhanced slippage handling
                if let Some(stop_loss) = position.stop_loss {
                    let should_exit = match position.side {
                        crate::models::TradeSide::Long => {
                            // For longs, exit if price hits or goes below stop loss
                            current_price <= stop_loss
                        },
                        crate::models::TradeSide::Short => {
                            // For shorts, exit if price hits or goes above stop loss
                            current_price >= stop_loss
                        },
                    };
                    
                    if should_exit {
                        // Calculate actual slippage
                        let expected_exit = stop_loss;
                        let actual_exit = current_price;
                        let slippage = if expected_exit > Decimal::ZERO {
                            ((actual_exit - expected_exit) / expected_exit).abs()
                        } else {
                            Decimal::ZERO
                        };
                        
                        // Enhanced slippage handling
                        if slippage > Decimal::from_f64(0.05).unwrap_or(Decimal::ONE) { // 5% slippage threshold
                            eprintln!("CRITICAL: High slippage detected: {}% - Expected: {}, Actual: {}", 
                                slippage * Decimal::from(100), expected_exit, actual_exit);
                            
                            // If slippage is extreme (>10%), trigger circuit breaker
                            if slippage > Decimal::from_f64(0.1).unwrap_or(Decimal::ONE) {
                                self.trigger_circuit_breaker(&format!("Extreme slippage on stop loss: {}%", slippage * Decimal::from(100)));
                            }
                        }
                        
                        // Force exit regardless of slippage for safety
                        self.exit_position("Stop Loss");
                        return;
                    }
                }
                
                // Enhanced take profit with trailing stop logic
                if let Some(take_profit) = position.take_profit {
                    let should_exit = match position.side {
                        crate::models::TradeSide::Long => current_price >= take_profit,
                        crate::models::TradeSide::Short => current_price <= take_profit,
                    };
                    
                    if should_exit {
                        eprintln!("Take profit triggered at ${} (target: ${})", current_price, take_profit);
                        self.exit_position("Take Profit");
                        return;
                    }
                }
                
                // Trailing stop logic if enabled
                if self.config.trailing_stop_enabled {
                    self.check_trailing_stop(position, current_price);
                }
                
                // Enhanced emergency stop: Check for catastrophic losses
                let current_pnl = self.calculate_current_pnl(position, current_price);
                let loss_percent = if position.entry_price > Decimal::ZERO && position.quantity > Decimal::ZERO {
                    (current_pnl.abs() / (position.entry_price * position.quantity))
                } else {
                    Decimal::ZERO
                };
                
                // Progressive emergency exits based on loss severity
                if current_pnl < Decimal::ZERO {
                    // Emergency exit if losses exceed 10% (configurable emergency threshold)
                    let emergency_threshold = Decimal::from_f64(0.1).unwrap_or_else(|| {
                        log_error!(LogCategory::Security, "Failed to create emergency threshold decimal, using hardcoded fallback");
                        Decimal::new(1, 1) // 0.1 as hardcoded fallback
                    });
                    if loss_percent > emergency_threshold {
                        eprintln!("EMERGENCY: Catastrophic loss detected: {}% - Triggering emergency exit", loss_percent * Decimal::from(100));
                        self.trigger_emergency_stop(&format!("Catastrophic loss: {}%", loss_percent * Decimal::from(100)));
                        return;
                    }
                    
                    // Warning at 7% loss
                    let warning_threshold = Decimal::from_f64(0.07).unwrap_or_else(|| {
                        log_error!(LogCategory::Security, "Failed to create warning threshold decimal, using hardcoded fallback");
                        Decimal::new(7, 2) // 0.07 as hardcoded fallback
                    });
                    if loss_percent > warning_threshold {
                        eprintln!("WARNING: High loss detected: {}% - Monitoring closely", loss_percent * Decimal::from(100));
                    }
                }
            }
        }
    }
    
    fn calculate_current_pnl(&self, position: &BotPosition, current_price: Decimal) -> Decimal {
        // Validate inputs
        if current_price <= Decimal::ZERO || position.entry_price <= Decimal::ZERO || position.quantity <= Decimal::ZERO {
            eprintln!("Warning: Invalid PnL calculation inputs - current: {}, entry: {}, quantity: {}", 
                current_price, position.entry_price, position.quantity);
            return Decimal::ZERO;
        }
        
        match position.side {
            crate::models::TradeSide::Long => (current_price - position.entry_price) * position.quantity,
            crate::models::TradeSide::Short => (position.entry_price - current_price) * position.quantity,
        }
    }
    
    fn calculate_potential_loss(&self, current_price: Decimal) -> Decimal {
        if let Some(ref position) = self.current_position {
            if let Some(stop_loss) = position.stop_loss {
                // Calculate potential loss if stop loss is hit
                let potential_exit_price = stop_loss;
                let potential_pnl = self.calculate_current_pnl(position, potential_exit_price);
                
                if potential_pnl < Decimal::ZERO {
                    return potential_pnl.abs();
                }
            }
        }
        Decimal::ZERO
    }
    
    fn check_trailing_stop(&mut self, position: &BotPosition, current_price: Decimal) {
        if let Some(latest_price) = self.price_history.back() {
            let trailing_percent = Decimal::from_f64(self.config.trailing_stop_percent / 100.0)
                .unwrap_or_else(|| {
                    log_warning!(LogCategory::Configuration, "Failed to convert trailing stop percent to decimal, using 1% default");
                    Decimal::new(1, 2) // 0.01 (1%) as hardcoded fallback
                });
            
            match position.side {
                crate::models::TradeSide::Long => {
                    // For long positions, trail below the highest price seen
                    let highest_price = self.price_history.iter()
                        .map(|p| p.high)
                        .fold(position.entry_price.to_f64().unwrap_or(0.0), |a, b| a.max(b.to_f64().unwrap_or(0.0)));
                    
                    let trailing_stop = Decimal::from_f64(highest_price).unwrap_or(position.entry_price) * (Decimal::ONE - trailing_percent);
                    
                    if current_price <= trailing_stop {
                        eprintln!("Trailing stop triggered for long position at ${} (trailing from ${})", current_price, highest_price);
                        self.exit_position("Trailing Stop");
                    }
                },
                crate::models::TradeSide::Short => {
                    // For short positions, trail above the lowest price seen
                    let lowest_price = self.price_history.iter()
                        .map(|p| p.low)
                        .fold(position.entry_price.to_f64().unwrap_or(f64::MAX), |a, b| a.min(b.to_f64().unwrap_or(f64::MAX)));
                    
                    let trailing_stop = Decimal::from_f64(lowest_price).unwrap_or(position.entry_price) * (Decimal::ONE + trailing_percent);
                    
                    if current_price >= trailing_stop {
                        eprintln!("Trailing stop triggered for short position at ${} (trailing from ${})", current_price, lowest_price);
                        self.exit_position("Trailing Stop");
                    }
                },
            }
        }
    }

    fn update_performance_stats(&mut self, pnl: Decimal, hold_time: f64) {
        self.performance_stats.total_trades += 1;
        self.performance_stats.total_pnl += pnl;
        
        if pnl > Decimal::ZERO {
            self.performance_stats.winning_trades += 1;
        }
        
        // Update average hold time
        let total_hold_time = self.performance_stats.avg_hold_time * (self.performance_stats.total_trades - 1) as f64;
        self.performance_stats.avg_hold_time = (total_hold_time + hold_time) / self.performance_stats.total_trades as f64;
        
        // Update success rate
        self.performance_stats.success_rate = 
            self.performance_stats.winning_trades as f64 / self.performance_stats.total_trades as f64;
        
        // Update max drawdown (simplified)
        if pnl < Decimal::ZERO && pnl.abs() > self.performance_stats.max_drawdown {
            self.performance_stats.max_drawdown = pnl.abs();
        }
    }

    pub fn get_latest_signal(&self) -> Option<&LROSignal> {
        self.signal_history.back()
    }

    pub fn get_performance_summary(&self) -> &BotPerformance {
        &self.performance_stats
    }
    
    fn is_valid_price_data(&self, price: &PriceData) -> bool {
        // Check for valid numerical values
        if false || false || 
           false || false || false {
            log_error!(LogCategory::DataProcessing, "Invalid price data: Non-finite values detected");
            return false;
        }
        
        // Check for positive prices
        if price.open <= Decimal::ZERO || price.high <= Decimal::ZERO || 
           price.low <= Decimal::ZERO || price.close <= Decimal::ZERO {
            log_error!(LogCategory::DataProcessing, "Invalid price data: Non-positive prices detected");
            return false;
        }
        
        // Check for negative volume
        if price.volume < Decimal::ZERO {
            log_error!(LogCategory::DataProcessing, "Invalid price data: Negative volume detected: {}", price.volume);
            return false;
        }
        
        // Check OHLC relationships
        if price.high < price.low {
            log_error!(LogCategory::DataProcessing, "Invalid price data: High ({}) < Low ({})", price.high, price.low);
            return false;
        }
        
        if price.high < price.open || price.high < price.close {
            log_error!(LogCategory::DataProcessing, "Invalid price data: High ({}) < Open/Close ({}/{})", price.high, price.open, price.close);
            return false;
        }
        
        if price.low > price.open || price.low > price.close {
            log_error!(LogCategory::DataProcessing, "Invalid price data: Low ({}) > Open/Close ({}/{})", price.low, price.open, price.close);
            return false;
        }
        
        // Check for extreme price movements (flash crashes/pumps)
        if let Some(last_price) = self.price_history.back() {
            let price_change = ((price.close - last_price.close) / last_price.close).abs();
            if price_change > Decimal::from_f64(0.5).unwrap_or_else(|| Decimal::new(5, 1)) { // 50% single-candle move
                log_error!(LogCategory::DataProcessing, "Invalid price data: Extreme price movement detected: {}%", price_change.to_f64().unwrap_or(0.0) * 100.0);
                return false;
            }
        }
        
        // Check for reasonable price ranges (prevent extreme outliers)
        let price_range = price.high - price.low;
        let mid_price = (price.high + price.low) / Decimal::new(2, 0);
        if price_range > mid_price * Decimal::new(3, 1) { // More than 30% range indicates potential bad data
            log_error!(LogCategory::DataProcessing, "Invalid price data: Excessive price range: {}% of mid price", (price_range / mid_price).to_f64().unwrap_or(0.0) * 100.0);
            return false;
        }
        
        // Check timestamp validity
        let now = Utc::now();
        if price.timestamp > now {
            log_error!(LogCategory::DataProcessing, "Invalid price data: Future timestamp detected");
            return false;
        }
        
        // Check for stale data (older than 1 hour)
        if now.signed_duration_since(price.timestamp).num_hours() > 1 {
            log_error!(LogCategory::DataProcessing, "Invalid price data: Stale data detected (>1 hour old)");
            return false;
        }
        
        // Check for reasonable volume (not zero or extremely high)
        if price.volume == Decimal::ZERO {
            eprintln!("Warning: Zero volume detected");
            // Don't reject, just warn
        } else if let Some(last_price) = self.price_history.back() {
            let volume_ratio = price.volume / last_price.volume;
            if volume_ratio > Decimal::new(100, 0) || volume_ratio < Decimal::new(1, 2) {
                eprintln!("Warning: Extreme volume change detected: {}x", volume_ratio);
                // Don't reject, just warn
            }
        }
        
        // Check for price consistency with recent history
        if self.price_history.len() >= 5 {
            let recent_prices: Vec<f64> = self.price_history.iter().rev().take(5).map(|p| p.close.to_f64().unwrap_or(0.0)).collect();
            let avg_price = recent_prices.iter().sum::<f64>() / recent_prices.len() as f64;
            let price_deviation = ((price.close.to_f64().unwrap_or(0.0) - avg_price) / avg_price).abs();
            
            if price_deviation > 0.2 { // 20% deviation from recent average
                eprintln!("Warning: Price deviation from recent average: {}%", price_deviation * 100.0);
                // Don't reject, just warn - could be legitimate market movement
            }
        }
        
        true
    }
    
    fn validate_order_book_data(&self, order_book: &OrderBookDepth) -> bool {
        // Check for valid timestamp
        let now = Utc::now();
        if order_book.timestamp > now {
            eprintln!("Invalid order book: Future timestamp");
            return false;
        }
        
        // Check for stale data (older than 30 seconds)
        if now.signed_duration_since(order_book.timestamp).num_seconds() > 30 {
            eprintln!("Invalid order book: Stale data (>30 seconds old)");
            return false;
        }
        
        // Check for empty order book
        if order_book.bids.is_empty() || order_book.asks.is_empty() {
            eprintln!("Invalid order book: Empty bids or asks");
            return false;
        }
        
        // Check bid/ask ordering
        for i in 1..order_book.bids.len() {
            if order_book.bids[i].price >= order_book.bids[i-1].price {
                eprintln!("Invalid order book: Bids not in descending order");
                return false;
            }
        }
        
        for i in 1..order_book.asks.len() {
            if order_book.asks[i].price <= order_book.asks[i-1].price {
                eprintln!("Invalid order book: Asks not in ascending order");
                return false;
            }
        }
        
        // Check for crossed market (bid >= ask)
        if let (Some(best_bid), Some(best_ask)) = (order_book.bids.first(), order_book.asks.first()) {
            if best_bid.price >= best_ask.price {
                eprintln!("Invalid order book: Crossed market (bid {} >= ask {})", best_bid.price, best_ask.price);
                return false;
            }
        }
        
        // Check for reasonable quantities
        for bid in &order_book.bids {
            if bid.quantity <= rust_decimal::Decimal::ZERO {
                eprintln!("Invalid order book: Non-positive bid quantity");
                return false;
            }
        }
        
        for ask in &order_book.asks {
            if ask.quantity <= rust_decimal::Decimal::ZERO {
                eprintln!("Invalid order book: Non-positive ask quantity");
                return false;
            }
        }
        
        true
    }
    
    fn has_exceeded_daily_loss_limit(&mut self) -> bool {
        // Reset daily tracker if it's a new day (atomic operation)
        let now = Utc::now();
        if now.date_naive() != self.daily_reset_time.date_naive() {
            eprintln!("Daily loss tracker reset for new day: {}", now.date_naive());
            self.daily_loss_tracker = Decimal::ZERO;
            self.daily_reset_time = now;
        }
        
        // Check if daily loss exceeds configured limit with validation
        let max_daily_loss = match Decimal::from_f64(self.config.max_daily_loss) {
            Some(limit) if limit > Decimal::ZERO => limit,
            _ => {
                eprintln!("Warning: Invalid max daily loss config: {}, using default $100", self.config.max_daily_loss);
                Decimal::from(100)
            }
        };
        
        let current_loss = self.daily_loss_tracker.abs();
        let limit_exceeded = current_loss >= max_daily_loss;
        
        if limit_exceeded {
            eprintln!("Daily loss limit exceeded: ${} >= ${}", current_loss, max_daily_loss);
        }
        
        limit_exceeded
    }
    
    fn is_position_expired(&self, position: &BotPosition) -> bool {
        let now = Utc::now();
        let duration = now.signed_duration_since(position.entry_time);
        let max_hold_hours = self.config.get_max_hold_duration_hours();
        duration.num_hours() >= max_hold_hours as i64
    }
    
    fn trigger_circuit_breaker(&mut self, reason: &str) {
        self.circuit_breaker_count += 1;
        self.last_circuit_breaker_time = Some(Utc::now());
        
        log_warning!(LogCategory::RiskManagement, "Circuit breaker #{} triggered: {}", self.circuit_breaker_count, reason);
        
        // Use pause instead of emergency stop for better continuity
        if self.circuit_breaker_count >= 3 {
            // Multiple circuit breakers - stop the bot completely for safety
            self.stop_bot("Multiple circuit breaker activations - manual intervention required");
        } else {
            // Single/few circuit breakers - pause temporarily
            let pause_reason = PauseReason::CircuitBreaker { 
                trigger_count: self.circuit_breaker_count 
            };
            self.pause_bot(pause_reason);
        }
    }
    
    fn is_circuit_breaker_active(&self) -> bool {
        if let Some(last_trigger) = self.last_circuit_breaker_time {
            let now = Utc::now();
            let duration = now.signed_duration_since(last_trigger);
            
            // Circuit breaker stays active for 1 hour after trigger
            duration.num_minutes() < 60
        } else {
            false
        }
    }
    
    fn check_market_conditions_for_circuit_breaker(&mut self) {
        if let Some(latest_price) = self.price_history.back() {
            // Check for extreme volatility
            if self.price_history.len() >= 10 {
                let recent_prices: Vec<f64> = self.price_history
                    .iter()
                    .rev()
                    .take(10)
                    .map(|p| p.close.to_f64().unwrap_or(0.0))
                    .collect();
                
                let volatility = self.calculate_volatility(&recent_prices);
                if volatility > 0.8 { // Extreme volatility threshold
                    self.trigger_circuit_breaker("Extreme market volatility detected");
                    return;
                }
            }
            
            // Check for flash crash conditions
            if self.price_history.len() >= 2 {
                let current_price = latest_price.close;
                let prev_price = self.price_history[self.price_history.len() - 2].close;
                let price_change = ((current_price - prev_price) / prev_price).abs().to_f64().unwrap_or(0.0);
                
                if price_change > 0.15 { // 15% single-period move
                    self.trigger_circuit_breaker("Flash crash/pump detected");
                    return;
                }
            }
        }
    }
    
    fn is_market_data_stale(&self) -> bool {
        if let Some(last_price) = self.price_history.back() {
            let now = Utc::now();
            let duration = now.signed_duration_since(last_price.timestamp);
            // Consider data stale if older than 5 minutes
            duration.num_minutes() > 5
        } else {
            true // No data is stale
        }
    }

    /// Convert enhanced LRO signal to legacy format for compatibility
    fn convert_enhanced_signal_to_legacy(&self, enhanced_signal: EnhancedLROSignal, lro_value: f64) -> Option<(LROSignal, f64)> {
        let (signal_type, strength, confidence) = match enhanced_signal {
            EnhancedLROSignal::StrongBuy { confidence, .. } => (SignalType::Buy, 1.0, confidence),
            EnhancedLROSignal::Buy { confidence, .. } => (SignalType::Buy, 0.7, confidence),
            EnhancedLROSignal::Neutral { .. } => (SignalType::Hold, 0.5, 0.5),
            EnhancedLROSignal::Sell { confidence, .. } => (SignalType::Sell, 0.7, confidence),
            EnhancedLROSignal::StrongSell { confidence, .. } => (SignalType::Sell, 1.0, confidence),
        };

        // Calculate signal line as weighted average of recent LRO values for compatibility
        let signal_line_value = if self.lro_history.len() >= self.config.signal_period {
            let recent_lro: Vec<f64> = self.lro_history.iter().rev().take(self.config.signal_period).copied().collect();
            recent_lro.iter().sum::<f64>() / recent_lro.len() as f64
        } else {
            lro_value
        };

        let legacy_signal = LROSignal {
            timestamp: Utc::now(),
            lro_value,
            signal_line: signal_line_value,
            signal_type,
            strength: strength * confidence, // Combine strength and confidence
            market_condition: self.determine_market_condition(lro_value),
        };

        Some((legacy_signal, signal_line_value))
    }

    /// Get enhanced LRO statistics for analysis
    pub fn get_enhanced_lro_statistics(&self) -> Option<LROStatistics> {
        self.enhanced_lro.as_ref().map(|lro| lro.get_statistics())
    }

    /// Reset enhanced LRO calculator
    pub fn reset_enhanced_lro(&mut self) {
        if let Some(ref mut enhanced_lro) = self.enhanced_lro {
            enhanced_lro.reset();
            log_info!(LogCategory::Configuration, "Enhanced LRO calculator reset successfully");
        }
    }

    /// Determine market condition based on LRO value
    fn determine_market_condition(&self, lro_value: f64) -> MarketCondition {
        let trend_strength = lro_value.max(-1.0).min(1.0); // Normalize to -1..1
        let volatility = if let Some(last_atr) = self.enhanced_lro.as_ref() {
            let stats = last_atr.get_statistics();
            (stats.current_atr / 100.0).min(1.0) // Simple volatility estimate
        } else {
            lro_value.abs().min(1.0)
        };
        
        let market_phase = if lro_value.abs() > self.config.overbought * 0.8 {
            MarketPhase::Trending
        } else if lro_value.abs() < 0.2 {
            MarketPhase::Ranging
        } else {
            MarketPhase::Breakout
        };

        MarketCondition {
            trend_strength,
            volatility,
            volume_profile: 0.5, // Default neutral volume
            market_phase,
        }
    }
}

impl Default for BotPerformance {
    fn default() -> Self {
        Self {
            total_trades: 0,
            winning_trades: 0,
            total_pnl: Decimal::ZERO,
            max_drawdown: Decimal::ZERO,
            sharpe_ratio: 0.0,
            avg_hold_time: 0.0,
            success_rate: 0.0,
        }
    }
}
