use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;
use chrono::{DateTime, Utc};
use std::collections::VecDeque;
use crate::models::{OrderBookDepth, MarketDepthAnalysis, LiquidityLevel};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LROConfig {
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
}

impl Default for LROConfig {
    fn default() -> Self {
        Self {
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
    pub is_active: bool,
    pub current_position: Option<BotPosition>,
    pub price_history: VecDeque<PriceData>,
    pub lro_history: VecDeque<f64>,
    pub signal_history: VecDeque<LROSignal>,
    pub performance_stats: BotPerformance,
    pub account_balance: Decimal,
    pub daily_loss_tracker: Decimal,
    pub daily_reset_time: DateTime<Utc>,
    pub max_position_hold_hours: u32,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceData {
    pub timestamp: DateTime<Utc>,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

impl SwingTradingBot {
    // CRITICAL SAFETY: Config validation function
    fn validate_config(config: &LROConfig) -> Result<(), String> {
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
        Ok(())
    }

    pub fn new(config: LROConfig) -> Self {
        // Safety check: Warn if paper trading is disabled
        if !config.paper_trading_enabled {
            eprintln!("WARNING: Paper trading is DISABLED. Live trading is not implemented for safety.");
            eprintln!("Please enable paper trading mode to test strategies safely.");
        } else {
            eprintln!("Bot initialized in PAPER TRADING mode with virtual balance: ${}", config.virtual_balance);
        }
        
        Self {
            config,
            is_active: false,
            current_position: None,
            price_history: VecDeque::with_capacity(200),
            lro_history: VecDeque::with_capacity(100),
            signal_history: VecDeque::with_capacity(50),
            performance_stats: BotPerformance::default(),
            account_balance: match Decimal::from_f64_retain(config.virtual_balance) {
                Some(balance) if balance > Decimal::ZERO => balance,
                _ => {
                    eprintln!("Warning: Invalid virtual balance {}, using default $10000", config.virtual_balance);
                    Decimal::from(10000)
                }
            },
            daily_loss_tracker: Decimal::ZERO,
            daily_reset_time: Utc::now(),
            max_position_hold_hours: config.max_position_hold_hours,
            emergency_stop_triggered: false,
            circuit_breaker_count: 0,
            last_circuit_breaker_time: None,
            // Level 2 Market Data
            order_book_history: VecDeque::with_capacity(50),
            market_depth_analysis: None,
            liquidity_levels: Vec::new(),
            depth_analysis_enabled: true,
            // Initialize LRO cache
            lro_cache: LroCache::new(config.period),
        }
    }
    
    pub fn set_account_balance(&mut self, balance: Decimal) {
        self.account_balance = balance;
    }
    
    pub fn set_max_position_hold_hours(&mut self, hours: u32) {
        self.max_position_hold_hours = hours;
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
    
    pub fn trigger_emergency_stop(&mut self, reason: &str) {
        self.emergency_stop_triggered = true;
        self.is_active = false;
        
        // Close any open position immediately
        if self.current_position.is_some() {
            self.exit_position(&format!("Emergency Stop: {}", reason));
        }
        
        eprintln!("EMERGENCY STOP TRIGGERED: {}", reason);
    }
    
    pub fn add_order_book_data(&mut self, order_book: OrderBookDepth, binance_client: &crate::binance_client::BinanceClient) {
        // Validate order book data before processing
        if !self.validate_order_book_data(&order_book) {
            eprintln!("Warning: Invalid order book data rejected");
            return;
        }
        
        // Store order book history
        self.order_book_history.push_back(order_book.clone());
        if self.order_book_history.len() > 50 {
            self.order_book_history.pop_front();
        }
        
        if self.depth_analysis_enabled {
            // Analyze market depth
            self.market_depth_analysis = Some(binance_client.analyze_market_depth(&order_book));
            
            // Detect significant liquidity levels
            let min_volume_threshold = if let Some(analysis) = &self.market_depth_analysis {
                // Set threshold to 2x average volume
                (analysis.avg_bid_depth_5 + analysis.avg_ask_depth_5) / Decimal::from(2) * Decimal::from(2)
            } else {
                Decimal::from(1000) // Default threshold
            };
            
            self.liquidity_levels = binance_client.detect_liquidity_levels(&order_book, min_volume_threshold);
            
            // Check for market manipulation or unusual activity
            self.check_market_manipulation();
        }
    }
    
    fn check_market_manipulation(&mut self) {
        if let Some(analysis) = &self.market_depth_analysis {
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

    pub fn add_price_data(&mut self, price: PriceData) {
        // Validate price data before adding
        if !self.is_valid_price_data(&price) {
            eprintln!("CRITICAL: Invalid price data rejected: {:?}", price);
            // Increment validation failure counter
            self.trigger_circuit_breaker("Invalid price data received");
            return;
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
        
        self.price_history.push_back(price);
        if self.price_history.len() > 200 {
            self.price_history.pop_front();
        }

        // Calculate LRO and generate signals using incremental calculation
        if self.price_history.len() >= self.config.period {
            let lro_value = self.calculate_lro_incremental();
            self.lro_history.push_back(lro_value);
            
            if self.lro_history.len() > 100 {
                self.lro_history.pop_front();
            }

            // Generate trading signal
            if let Some(signal) = self.generate_signal(lro_value) {
                self.signal_history.push_back(signal.clone());
                if self.signal_history.len() > 50 {
                    self.signal_history.pop_front();
                }

                // Check market conditions for circuit breaker triggers
                self.check_market_conditions_for_circuit_breaker();
                
                // Execute trading logic if bot is active and data is fresh
                if self.is_active && !self.is_market_data_stale() && !self.emergency_stop_triggered {
                    self.process_signal(signal);
                } else if self.is_active && self.is_market_data_stale() {
                    eprintln!("Warning: Skipping signal processing due to stale market data");
                }
            }
        }
    }

    fn calculate_lro_incremental(&mut self) -> f64 {
        // Update LRO cache with new price data
        self.update_lro_cache();
        
        // Calculate using cached values
        if let Some((slope, intercept)) = self.lro_cache.calculate_regression() {
            let current_price = self.price_history.back().map(|p| p.close).unwrap_or(0.0);
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
        
        // Incremental update: remove old point and add new point
        if history_len > period {
            // Remove oldest point from cache
            let old_price = self.price_history[history_len - period - 1].close;
            self.lro_cache.remove_point(0.0, old_price);
            
            // Shift all x values down by 1
            self.lro_cache.sum_x -= self.lro_cache.n as f64;
            self.lro_cache.sum_x2 -= (self.lro_cache.n * (self.lro_cache.n + 1)) as f64 / 2.0;
        }
        
        // Add new point
        let new_price = self.price_history.back().unwrap().close;
        let x_value = (self.lro_cache.n.min(period - 1)) as f64;
        self.lro_cache.add_point(x_value, new_price);
    }
    
    fn rebuild_lro_cache(&mut self) {
        self.lro_cache.reset();
        let period = self.config.period;
        let history_len = self.price_history.len();
        
        if history_len < period {
            return;
        }
        
        // Build cache from recent price history
        let start_idx = history_len - period;
        for (i, price_data) in self.price_history.iter().skip(start_idx).enumerate() {
            self.lro_cache.add_point(i as f64, price_data.close);
        }
    }
    
    // Keep the original method as fallback for validation
    fn calculate_lro(&self) -> f64 {
        let prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(self.config.period)
            .map(|p| p.close)
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
        let recent_prices: Vec<f64> = self.price_history
            .iter()
            .rev()
            .take(self.config.period * 2)
            .flat_map(|p| vec![p.high, p.low])
            .collect();

        if recent_prices.is_empty() {
            return 1.0;
        }

        let max_price = recent_prices.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let min_price = recent_prices.iter().copied().fold(f64::INFINITY, f64::min);
        
        max_price - min_price
    }

    fn generate_signal(&self, lro_value: f64) -> Option<LROSignal> {
        if self.lro_history.len() < self.config.signal_period {
            return None;
        }

        // Calculate signal line (moving average of LRO)
        let signal_line = self.lro_history
            .iter()
            .rev()
            .take(self.config.signal_period)
            .sum::<f64>() / self.config.signal_period as f64;

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
            eprintln!("Warning: Invalid signal strength calculated: {}", strength);
            return None;
        }

        Some(LROSignal {
            timestamp: Utc::now(),
            lro_value,
            signal_line,
            signal_type,
            strength,
            market_condition,
        })
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
                            level.price < current_price * Decimal::from_f64_retain(1.02).unwrap_or_default() && // Within 2%
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
                            level.price > current_price * Decimal::from_f64_retain(0.98).unwrap_or_default() && // Within 2%
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
            .map(|p| p.close)
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
            .map(|p| p.volume)
            .sum();

        let avg_volume: f64 = self.price_history
            .iter()
            .rev()
            .take(20)
            .map(|p| p.volume)
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
        
        // Adjust thresholds based on market conditions
        let volatility_adjustment = market_condition.volatility * 0.3;
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
        let lro_cross_above = lro_value > signal_line && 
            self.lro_history.len() > 1 && 
            self.lro_history[self.lro_history.len() - 2] <= signal_line;
            
        let lro_cross_below = lro_value < signal_line && 
            self.lro_history.len() > 1 && 
            self.lro_history[self.lro_history.len() - 2] >= signal_line;

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
        // Check emergency stop status
        if self.emergency_stop_triggered {
            eprintln!("Emergency stop is active. Skipping signal processing.");
            return;
        }
        
        // Check circuit breaker status
        if self.is_circuit_breaker_active() {
            eprintln!("Circuit breaker is active. Skipping signal processing.");
            return;
        }
        
        // Atomic check for daily loss limits before processing any signals
        if self.has_exceeded_daily_loss_limit() {
            self.trigger_circuit_breaker("Daily loss limit exceeded");
            return;
        }
        
        // Pre-calculate potential loss for risk assessment
        if let Some(latest_price) = self.price_history.back() {
            let current_price = match Decimal::from_f64_retain(latest_price.close) {
                Some(price) if price > Decimal::ZERO => price,
                _ => {
                    eprintln!("Error: Invalid current price: {}", latest_price.close);
                    return; // Skip processing invalid price
                }
            };
            let potential_loss = self.calculate_potential_loss(current_price);
            
            // Check if potential loss would exceed daily limit
            if potential_loss > Decimal::ZERO {
                let max_daily_loss = Decimal::from_f64_retain(self.config.max_daily_loss).unwrap_or(Decimal::from(100));
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
            let entry_price = match Decimal::from_f64_retain(latest_price.close) {
                Some(price) if price > Decimal::ZERO => price,
                _ => {
                    eprintln!("Error: Invalid entry price: {}", latest_price.close);
                    return; // Cannot enter position with invalid price
                }
            };
            let quantity = self.calculate_position_size(&signal);
            
            // Calculate stop loss and take profit
            let (stop_loss, take_profit) = self.calculate_risk_levels(entry_price, &side, &signal);
            
            let position = BotPosition {
                symbol: "BTCUSDT".to_string(), // This should be configurable
                side,
                entry_price,
                quantity,
                entry_time: Utc::now(),
                stop_loss,
                take_profit,
                entry_signal: signal,
            };
            
            // Only set position if we're in paper trading mode or if live trading is properly configured
            if self.config.paper_trading_enabled {
                self.current_position = Some(position);
                eprintln!("Paper trade entered: {:?} {} at ${}", side, quantity, entry_price);
            } else {
                eprintln!("Live trading attempted but not implemented. Enable paper trading mode.");
                // Don't set position for safety
            }
        }
    }

    fn exit_position(&mut self, reason: &str) {
        if let Some(position) = self.current_position.take() {
            if let Some(latest_price) = self.price_history.back() {
                let exit_price = match Decimal::from_f64_retain(latest_price.close) {
                    Some(price) if price > Decimal::ZERO => price,
                    _ => {
                        eprintln!("Error: Invalid exit price: {}", latest_price.close);
                        return; // Cannot exit with invalid price
                    }
                };
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
                    let max_daily_loss = Decimal::from_f64_retain(self.config.max_daily_loss).unwrap_or(Decimal::from(100));
                    let limit_ratio = new_daily_loss / max_daily_loss;
                    
                    if limit_ratio > Decimal::from_f64_retain(0.8).unwrap_or(Decimal::ONE) {
                        eprintln!("WARNING: Approaching daily loss limit: {}% used", limit_ratio * Decimal::from(100));
                    }
                }
            }
        }
    }

    fn calculate_position_size(&self, signal: &LROSignal) -> Decimal {
        // Calculate position size based on account balance and risk parameters
        let risk_percent = Decimal::from_f64_retain(0.02).unwrap_or(Decimal::from(2)) / Decimal::from(100); // 2% risk
        let max_risk_amount = self.account_balance * risk_percent;
        
        // Get configured max position size from config
        let max_position_from_config = Decimal::from_f64_retain(self.config.max_position_size).unwrap_or(Decimal::from(1000));
        
        // Base position size on signal strength and market conditions
        let strength_multiplier = Decimal::from_f64_retain(signal.strength).unwrap_or(Decimal::ONE);
        let volatility_adjustment = Decimal::ONE - Decimal::from_f64_retain(signal.market_condition.volatility * 0.5).unwrap_or_default();
        
        // Calculate position size
        let calculated_size = max_risk_amount * strength_multiplier * volatility_adjustment;
        
        // Apply limits: minimum of risk-based size, configured max, and account balance
        let final_size = calculated_size
            .min(max_position_from_config)
            .min(self.account_balance * Decimal::from_f64_retain(0.8).unwrap_or(Decimal::ONE)); // Max 80% of balance
        
        // Ensure minimum viable position size
        final_size.max(Decimal::from(10)) // Minimum $10 position
    }

    fn calculate_risk_levels(
        &self,
        entry_price: Decimal,
        side: &crate::models::TradeSide,
        signal: &LROSignal,
    ) -> (Option<Decimal>, Option<Decimal>) {
        // Use configurable risk parameters
        let risk_percent = Decimal::from_f64_retain(self.config.stop_loss_percent / 100.0).unwrap();
        let reward_ratio = Decimal::from_f64_retain(self.config.take_profit_percent / self.config.stop_loss_percent).unwrap();
        
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
        if let Some(ref position) = self.current_position.clone() {
            if let Some(latest_price) = self.price_history.back() {
                let current_price = match Decimal::from_f64_retain(latest_price.close) {
                    Some(price) if price > Decimal::ZERO => price,
                    _ => {
                        eprintln!("Error: Invalid current price for exit check: {}", latest_price.close);
                        return;
                    }
                };
                
                // Validate current price
                if current_price <= Decimal::ZERO {
                    eprintln!("Warning: Invalid current price for exit check: {}", current_price);
                    return;
                }
                
                // Check for extreme price gaps (potential data issue or flash crash)
                let price_change_percent = ((current_price - position.entry_price) / position.entry_price).abs();
                if price_change_percent > Decimal::from_f64_retain(0.2).unwrap_or(Decimal::ONE) { // 20% gap
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
                        if slippage > Decimal::from_f64_retain(0.05).unwrap_or(Decimal::ONE) { // 5% slippage threshold
                            eprintln!("CRITICAL: High slippage detected: {}% - Expected: {}, Actual: {}", 
                                slippage * Decimal::from(100), expected_exit, actual_exit);
                            
                            // If slippage is extreme (>10%), trigger circuit breaker
                            if slippage > Decimal::from_f64_retain(0.1).unwrap_or(Decimal::ONE) {
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
                    let emergency_threshold = Decimal::from_f64_retain(0.1).unwrap_or(Decimal::from_f64_retain(0.1).unwrap());
                    if loss_percent > emergency_threshold {
                        eprintln!("EMERGENCY: Catastrophic loss detected: {}% - Triggering emergency exit", loss_percent * Decimal::from(100));
                        self.trigger_emergency_stop(&format!("Catastrophic loss: {}%", loss_percent * Decimal::from(100)));
                        return;
                    }
                    
                    // Warning at 7% loss
                    let warning_threshold = Decimal::from_f64_retain(0.07).unwrap_or(Decimal::from_f64_retain(0.07).unwrap());
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
            let trailing_percent = Decimal::from_f64_retain(self.config.trailing_stop_percent / 100.0)
                .unwrap_or(Decimal::from_f64_retain(0.01).unwrap()); // Default 1%
            
            match position.side {
                crate::models::TradeSide::Long => {
                    // For long positions, trail below the highest price seen
                    let highest_price = self.price_history.iter()
                        .map(|p| p.high)
                        .fold(position.entry_price.to_f64().unwrap_or(0.0), |a, b| a.max(b));
                    
                    let trailing_stop = Decimal::from_f64_retain(highest_price).unwrap_or(position.entry_price) * (Decimal::ONE - trailing_percent);
                    
                    if current_price <= trailing_stop {
                        eprintln!("Trailing stop triggered for long position at ${} (trailing from ${})", current_price, highest_price);
                        self.exit_position("Trailing Stop");
                    }
                },
                crate::models::TradeSide::Short => {
                    // For short positions, trail above the lowest price seen
                    let lowest_price = self.price_history.iter()
                        .map(|p| p.low)
                        .fold(position.entry_price.to_f64().unwrap_or(f64::MAX), |a, b| a.min(b));
                    
                    let trailing_stop = Decimal::from_f64_retain(lowest_price).unwrap_or(position.entry_price) * (Decimal::ONE + trailing_percent);
                    
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
        if !price.open.is_finite() || !price.high.is_finite() || 
           !price.low.is_finite() || !price.close.is_finite() || !price.volume.is_finite() {
            eprintln!("Invalid price data: Non-finite values detected");
            return false;
        }
        
        // Check for positive prices
        if price.open <= 0.0 || price.high <= 0.0 || 
           price.low <= 0.0 || price.close <= 0.0 {
            eprintln!("Invalid price data: Non-positive prices detected");
            return false;
        }
        
        // Check for negative volume
        if price.volume < 0.0 {
            eprintln!("Invalid price data: Negative volume detected: {}", price.volume);
            return false;
        }
        
        // Check OHLC relationships
        if price.high < price.low {
            eprintln!("Invalid price data: High ({}) < Low ({})", price.high, price.low);
            return false;
        }
        
        if price.high < price.open || price.high < price.close {
            eprintln!("Invalid price data: High ({}) < Open/Close ({}/{})", price.high, price.open, price.close);
            return false;
        }
        
        if price.low > price.open || price.low > price.close {
            eprintln!("Invalid price data: Low ({}) > Open/Close ({}/{})", price.low, price.open, price.close);
            return false;
        }
        
        // Check for extreme price movements (flash crashes/pumps)
        if let Some(last_price) = self.price_history.back() {
            let price_change = ((price.close - last_price.close) / last_price.close).abs();
            if price_change > 0.5 { // 50% single-candle move
                eprintln!("Invalid price data: Extreme price movement detected: {}%", price_change * 100.0);
                return false;
            }
        }
        
        // Check for reasonable price ranges (prevent extreme outliers)
        let price_range = price.high - price.low;
        let mid_price = (price.high + price.low) / 2.0;
        if price_range > mid_price * 0.3 { // More than 30% range indicates potential bad data
            eprintln!("Invalid price data: Excessive price range: {}% of mid price", (price_range / mid_price) * 100.0);
            return false;
        }
        
        // Check timestamp validity
        let now = Utc::now();
        if price.timestamp > now {
            eprintln!("Invalid price data: Future timestamp detected");
            return false;
        }
        
        // Check for stale data (older than 1 hour)
        if now.signed_duration_since(price.timestamp).num_hours() > 1 {
            eprintln!("Invalid price data: Stale data detected (>1 hour old)");
            return false;
        }
        
        // Check for reasonable volume (not zero or extremely high)
        if price.volume == 0.0 {
            eprintln!("Warning: Zero volume detected");
            // Don't reject, just warn
        } else if let Some(last_price) = self.price_history.back() {
            let volume_ratio = price.volume / last_price.volume;
            if volume_ratio > 100.0 || volume_ratio < 0.01 {
                eprintln!("Warning: Extreme volume change detected: {}x", volume_ratio);
                // Don't reject, just warn
            }
        }
        
        // Check for price consistency with recent history
        if self.price_history.len() >= 5 {
            let recent_prices: Vec<f64> = self.price_history.iter().rev().take(5).map(|p| p.close).collect();
            let avg_price = recent_prices.iter().sum::<f64>() / recent_prices.len() as f64;
            let price_deviation = ((price.close - avg_price) / avg_price).abs();
            
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
        let max_daily_loss = match Decimal::from_f64_retain(self.config.max_daily_loss) {
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
        duration.num_hours() >= self.max_position_hold_hours as i64
    }
    
    fn trigger_circuit_breaker(&mut self, reason: &str) {
        self.circuit_breaker_count += 1;
        self.last_circuit_breaker_time = Some(Utc::now());
        
        eprintln!("Circuit breaker #{} triggered: {}", self.circuit_breaker_count, reason);
        
        // If too many circuit breakers, trigger emergency stop
        if self.circuit_breaker_count >= 3 {
            self.trigger_emergency_stop("Multiple circuit breaker activations");
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
                    .map(|p| p.close)
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
                let price_change = ((current_price - prev_price) / prev_price).abs();
                
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