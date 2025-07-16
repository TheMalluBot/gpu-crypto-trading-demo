use serde::{Deserialize, Serialize};

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

impl LROConfig {
    /// Validates configuration parameters for safety
    pub fn validate(&self) -> Result<(), String> {
        if self.period < 5 || self.period > 200 {
            return Err("Period must be between 5 and 200".to_string());
        }
        if self.signal_period < 3 || self.signal_period > 50 {
            return Err("Signal period must be between 3 and 50".to_string());
        }
        if self.stop_loss_percent <= 0.0 || self.stop_loss_percent > 20.0 {
            return Err("Stop loss percent must be between 0.1% and 20%".to_string());
        }
        if self.take_profit_percent <= 0.0 || self.take_profit_percent > 50.0 {
            return Err("Take profit percent must be between 0.1% and 50%".to_string());
        }
        if self.max_position_size <= 0.0 {
            return Err("Max position size must be positive".to_string());
        }
        if self.virtual_balance <= 0.0 {
            return Err("Virtual balance must be positive".to_string());
        }
        Ok(())
    }
}