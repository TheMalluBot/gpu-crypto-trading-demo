// Advanced Risk Management System with Kelly Criterion and Dynamic Stops
// Implements sophisticated position sizing and risk control

use rust_decimal::Decimal;
use rust_decimal::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::VecDeque;
use chrono::{DateTime, Utc, Duration};

/// Kelly Criterion position sizer with safety adjustments
#[derive(Debug, Clone)]
pub struct KellyPositionSizer {
    // Kelly parameters
    kelly_fraction: f64,        // Fraction of Kelly to use (typically 0.25)
    max_risk_per_trade: f64,    // Maximum % of capital to risk per trade
    portfolio_heat_limit: f64,  // Maximum total portfolio risk
    
    // Historical performance tracking
    win_history: VecDeque<bool>,
    profit_history: VecDeque<f64>,
    
    // Correlation tracking
    correlation_matrix: Vec<Vec<f64>>,
    active_positions: Vec<String>,
}

impl KellyPositionSizer {
    pub fn new() -> Self {
        Self {
            kelly_fraction: 0.25,  // Conservative Kelly fraction
            max_risk_per_trade: 0.02,  // 2% max risk per trade
            portfolio_heat_limit: 0.06,  // 6% max portfolio heat
            win_history: VecDeque::with_capacity(100),
            profit_history: VecDeque::with_capacity(100),
            correlation_matrix: Vec::new(),
            active_positions: Vec::new(),
        }
    }
    
    /// Calculate optimal position size using Kelly Criterion
    pub fn calculate_position_size(
        &self,
        account_balance: Decimal,
        win_probability: f64,
        avg_win: f64,
        avg_loss: f64,
        current_volatility: f64,
        current_portfolio_heat: f64,
    ) -> Result<Decimal, String> {
        // Validate inputs
        if win_probability <= 0.0 || win_probability >= 1.0 {
            return Err("Win probability must be between 0 and 1".to_string());
        }
        
        if avg_win <= 0.0 || avg_loss <= 0.0 {
            return Err("Average win and loss must be positive".to_string());
        }
        
        // Calculate Kelly percentage
        let loss_probability = 1.0 - win_probability;
        let kelly_percentage = (win_probability * avg_win - loss_probability * avg_loss) / avg_win;
        
        // Apply safety fraction
        let adjusted_kelly = kelly_percentage * self.kelly_fraction;
        
        // Adjust for volatility (reduce size in high volatility)
        let volatility_multiplier = 1.0 / (1.0 + current_volatility);
        let vol_adjusted = adjusted_kelly * volatility_multiplier;
        
        // Apply maximum risk limit
        let risk_limited = vol_adjusted.min(self.max_risk_per_trade);
        
        // Check portfolio heat
        let available_heat = self.portfolio_heat_limit - current_portfolio_heat;
        let heat_limited = risk_limited.min(available_heat);
        
        // Ensure positive and reasonable size
        let final_percentage = heat_limited.max(0.0).min(0.1); // Cap at 10% max
        
        // Calculate position size in base currency
        let position_size = account_balance * Decimal::from_f64(final_percentage)
            .ok_or("Failed to convert percentage to decimal")?;
        
        Ok(position_size)
    }
    
    /// Update win/loss history for adaptive Kelly
    pub fn update_trade_result(&mut self, is_win: bool, profit_percent: f64) {
        self.win_history.push_back(is_win);
        self.profit_history.push_back(profit_percent);
        
        // Keep only last 100 trades
        if self.win_history.len() > 100 {
            self.win_history.pop_front();
        }
        if self.profit_history.len() > 100 {
            self.profit_history.pop_front();
        }
    }
    
    /// Calculate current win rate and profit factors
    pub fn get_performance_metrics(&self) -> (f64, f64, f64) {
        if self.win_history.is_empty() {
            return (0.5, 1.0, 1.0); // Default neutral values
        }
        
        let wins = self.win_history.iter().filter(|&&x| x).count();
        let win_rate = wins as f64 / self.win_history.len() as f64;
        
        let winning_trades: Vec<f64> = self.profit_history.iter()
            .zip(self.win_history.iter())
            .filter(|(_, &is_win)| is_win)
            .map(|(&profit, _)| profit)
            .collect();
        
        let losing_trades: Vec<f64> = self.profit_history.iter()
            .zip(self.win_history.iter())
            .filter(|(_, &is_win)| !is_win)
            .map(|(&profit, _)| profit.abs())
            .collect();
        
        let avg_win = if !winning_trades.is_empty() {
            winning_trades.iter().sum::<f64>() / winning_trades.len() as f64
        } else {
            1.0
        };
        
        let avg_loss = if !losing_trades.is_empty() {
            losing_trades.iter().sum::<f64>() / losing_trades.len() as f64
        } else {
            1.0
        };
        
        (win_rate, avg_win, avg_loss)
    }
}

/// ATR-based dynamic stop loss calculator
#[derive(Debug, Clone)]
pub struct DynamicStopLoss {
    atr_multiplier: f64,
    min_stop_percent: f64,
    max_stop_percent: f64,
    trailing_enabled: bool,
    trailing_activation: f64,  // Profit % to activate trailing
    trailing_distance: f64,     // ATR multiples for trailing
    
    // ATR calculation
    atr_period: usize,
    true_ranges: VecDeque<f64>,
    current_atr: f64,
}

impl DynamicStopLoss {
    pub fn new() -> Self {
        Self {
            atr_multiplier: 2.0,      // 2x ATR for stop loss
            min_stop_percent: 0.5,     // Minimum 0.5% stop
            max_stop_percent: 5.0,     // Maximum 5% stop
            trailing_enabled: true,
            trailing_activation: 1.0,  // Activate trailing at 1% profit
            trailing_distance: 1.5,    // 1.5x ATR trailing distance
            atr_period: 14,
            true_ranges: VecDeque::with_capacity(14),
            current_atr: 0.0,
        }
    }
    
    /// Update ATR with new price data
    pub fn update_atr(&mut self, high: f64, low: f64, prev_close: f64) {
        let true_range = (high - low)
            .max((high - prev_close).abs())
            .max((low - prev_close).abs());
        
        self.true_ranges.push_back(true_range);
        
        if self.true_ranges.len() > self.atr_period {
            self.true_ranges.pop_front();
        }
        
        if !self.true_ranges.is_empty() {
            self.current_atr = self.true_ranges.iter().sum::<f64>() / self.true_ranges.len() as f64;
        }
    }
    
    /// Calculate initial stop loss based on ATR
    pub fn calculate_initial_stop(
        &self,
        entry_price: Decimal,
        is_long: bool,
    ) -> Decimal {
        let atr_decimal = Decimal::from_f64(self.current_atr).unwrap_or(Decimal::ZERO);
        let multiplier = Decimal::from_f64(self.atr_multiplier).unwrap_or(Decimal::from(2));
        
        let stop_distance = atr_decimal * multiplier;
        
        // Apply min/max limits
        let min_distance = entry_price * Decimal::from_f64(self.min_stop_percent / 100.0)
            .unwrap_or(Decimal::from_str("0.005").unwrap());
        let max_distance = entry_price * Decimal::from_f64(self.max_stop_percent / 100.0)
            .unwrap_or(Decimal::from_str("0.05").unwrap());
        
        let final_distance = stop_distance.max(min_distance).min(max_distance);
        
        if is_long {
            entry_price - final_distance
        } else {
            entry_price + final_distance
        }
    }
    
    /// Update trailing stop if conditions are met
    pub fn update_trailing_stop(
        &self,
        current_price: Decimal,
        entry_price: Decimal,
        current_stop: Decimal,
        is_long: bool,
    ) -> Option<Decimal> {
        if !self.trailing_enabled {
            return None;
        }
        
        // Calculate current profit percentage
        let profit_percent = if is_long {
            ((current_price - entry_price) / entry_price * Decimal::from(100))
                .to_f64()
                .unwrap_or(0.0)
        } else {
            ((entry_price - current_price) / entry_price * Decimal::from(100))
                .to_f64()
                .unwrap_or(0.0)
        };
        
        // Check if trailing should be activated
        if profit_percent < self.trailing_activation {
            return None;
        }
        
        // Calculate new trailing stop
        let atr_decimal = Decimal::from_f64(self.current_atr).unwrap_or(Decimal::ZERO);
        let trail_distance = atr_decimal * Decimal::from_f64(self.trailing_distance)
            .unwrap_or(Decimal::from_str("1.5").unwrap());
        
        let new_stop = if is_long {
            let potential_stop = current_price - trail_distance;
            if potential_stop > current_stop {
                Some(potential_stop)
            } else {
                None
            }
        } else {
            let potential_stop = current_price + trail_distance;
            if potential_stop < current_stop {
                Some(potential_stop)
            } else {
                None
            }
        };
        
        new_stop
    }
}

/// Portfolio heat tracker for overall risk management
#[derive(Debug, Clone)]
pub struct PortfolioHeatTracker {
    positions: Vec<PositionRisk>,
    max_portfolio_heat: f64,
    correlation_threshold: f64,
}

#[derive(Debug, Clone)]
pub struct PositionRisk {
    pub symbol: String,
    pub entry_price: Decimal,
    pub stop_loss: Decimal,
    pub position_size: Decimal,
    pub risk_amount: Decimal,
    pub risk_percent: f64,
    pub correlation_group: Option<String>,
}

impl PortfolioHeatTracker {
    pub fn new() -> Self {
        Self {
            positions: Vec::new(),
            max_portfolio_heat: 0.06,  // 6% maximum portfolio heat
            correlation_threshold: 0.7,  // Correlation threshold for grouping
        }
    }
    
    /// Add a new position to track
    pub fn add_position(
        &mut self,
        symbol: String,
        entry_price: Decimal,
        stop_loss: Decimal,
        position_size: Decimal,
        account_balance: Decimal,
    ) {
        let risk_amount = (entry_price - stop_loss).abs() * position_size / entry_price;
        let risk_percent = (risk_amount / account_balance * Decimal::from(100))
            .to_f64()
            .unwrap_or(0.0);
        
        let position = PositionRisk {
            symbol: symbol.clone(),
            entry_price,
            stop_loss,
            position_size,
            risk_amount,
            risk_percent,
            correlation_group: self.determine_correlation_group(&symbol),
        };
        
        self.positions.push(position);
    }
    
    /// Remove a closed position
    pub fn remove_position(&mut self, symbol: &str) {
        self.positions.retain(|p| p.symbol != symbol);
    }
    
    /// Calculate total portfolio heat
    pub fn calculate_total_heat(&self) -> f64 {
        self.positions.iter().map(|p| p.risk_percent).sum()
    }
    
    /// Check if new position would exceed heat limit
    pub fn can_add_position(&self, new_risk_percent: f64) -> bool {
        self.calculate_total_heat() + new_risk_percent <= self.max_portfolio_heat
    }
    
    /// Get correlated positions for risk adjustment
    pub fn get_correlated_positions(&self, symbol: &str) -> Vec<&PositionRisk> {
        let group = self.determine_correlation_group(symbol);
        
        self.positions.iter()
            .filter(|p| p.correlation_group == group)
            .collect()
    }
    
    /// Simple correlation grouping (can be enhanced with actual correlation calculation)
    fn determine_correlation_group(&self, symbol: &str) -> Option<String> {
        // Group by asset class or sector
        if symbol.contains("BTC") || symbol.contains("ETH") {
            Some("CRYPTO_MAJOR".to_string())
        } else if symbol.contains("USD") {
            Some("FOREX_USD".to_string())
        } else {
            Some("OTHER".to_string())
        }
    }
    
    /// Get risk summary for monitoring
    pub fn get_risk_summary(&self) -> RiskSummary {
        let total_heat = self.calculate_total_heat();
        let position_count = self.positions.len();
        let largest_risk = self.positions.iter()
            .map(|p| p.risk_percent)
            .fold(0.0, f64::max);
        
        let grouped_risks = self.calculate_grouped_risks();
        
        RiskSummary {
            total_heat,
            position_count,
            largest_risk,
            grouped_risks,
            heat_available: self.max_portfolio_heat - total_heat,
        }
    }
    
    /// Calculate risk by correlation groups
    fn calculate_grouped_risks(&self) -> Vec<(String, f64)> {
        let mut groups: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
        
        for position in &self.positions {
            if let Some(group) = &position.correlation_group {
                *groups.entry(group.clone()).or_insert(0.0) += position.risk_percent;
            }
        }
        
        groups.into_iter().collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskSummary {
    pub total_heat: f64,
    pub position_count: usize,
    pub largest_risk: f64,
    pub grouped_risks: Vec<(String, f64)>,
    pub heat_available: f64,
}

/// Maximum Adverse Excursion (MAE) tracker
#[derive(Debug, Clone)]
pub struct MAETracker {
    trades: VecDeque<TradeMAE>,
    max_history: usize,
}

#[derive(Debug, Clone)]
pub struct TradeMAE {
    pub entry_time: DateTime<Utc>,
    pub exit_time: Option<DateTime<Utc>>,
    pub max_adverse_excursion: f64,
    pub max_favorable_excursion: f64,
    pub final_result: Option<f64>,
}

impl MAETracker {
    pub fn new() -> Self {
        Self {
            trades: VecDeque::with_capacity(100),
            max_history: 100,
        }
    }
    
    /// Get average MAE for losing trades
    pub fn get_average_mae(&self) -> f64 {
        let losing_trades: Vec<f64> = self.trades.iter()
            .filter(|t| t.final_result.map(|r| r < 0.0).unwrap_or(false))
            .map(|t| t.max_adverse_excursion)
            .collect();
        
        if losing_trades.is_empty() {
            return 2.0; // Default 2% if no history
        }
        
        losing_trades.iter().sum::<f64>() / losing_trades.len() as f64
    }
    
    /// Suggest optimal stop loss based on MAE analysis
    pub fn suggest_stop_loss(&self) -> f64 {
        let avg_mae = self.get_average_mae();
        
        // Add 20% buffer to average MAE
        avg_mae * 1.2
    }
}