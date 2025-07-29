// Enhanced Linear Regression Oscillator (LRO) Implementation
// AGENT-TRADER-PRO Phase 2 Advanced Trading Algorithms
// Based on 2025 research findings from Exa search

use std::collections::VecDeque;
use rust_decimal::Decimal;
use rust_decimal::prelude::*;
use serde::{Serialize, Deserialize};
use crate::models::PriceData;

/// Enhanced LRO configuration with dynamic parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LROConfig {
    pub base_period: usize,
    pub min_period: usize,
    pub max_period: usize,
    pub overbought_threshold: f64,
    pub oversold_threshold: f64,
    pub volatility_adjustment: bool,
    pub multi_timeframe: bool,
    pub divergence_detection: bool,
}

impl Default for LROConfig {
    fn default() -> Self {
        Self {
            base_period: 14,
            min_period: 7,
            max_period: 21,
            overbought_threshold: 1.5,
            oversold_threshold: -1.5,
            volatility_adjustment: true,
            multi_timeframe: true,
            divergence_detection: true,
        }
    }
}

/// LRO signal types with confidence levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LROSignal {
    StrongBuy { confidence: f64, deviation: f64 },
    Buy { confidence: f64, deviation: f64 },
    Neutral { deviation: f64 },
    Sell { confidence: f64, deviation: f64 },
    StrongSell { confidence: f64, deviation: f64 },
}

/// Linear regression results with statistical measures
#[derive(Debug, Clone)]
struct RegressionResult {
    slope: f64,
    intercept: f64,
    r_squared: f64,
    standard_error: f64,
    deviation: f64,
}

/// ATR calculator for volatility-based adjustments
#[derive(Debug, Clone)]
struct ATRCalculator {
    period: usize,
    true_ranges: VecDeque<f64>,
    current_atr: f64,
}

impl ATRCalculator {
    fn new(period: usize) -> Self {
        Self {
            period,
            true_ranges: VecDeque::new(),
            current_atr: 0.0,
        }
    }

    fn update(&mut self, high: f64, low: f64, prev_close: f64) -> f64 {
        let true_range = (high - low)
            .max((high - prev_close).abs())
            .max((low - prev_close).abs());

        self.true_ranges.push_back(true_range);

        if self.true_ranges.len() > self.period {
            self.true_ranges.pop_front();
        }

        self.current_atr = self.true_ranges.iter().sum::<f64>() / self.true_ranges.len() as f64;
        self.current_atr
    }

    fn get_current(&self) -> f64 {
        self.current_atr
    }
}

/// Enhanced Linear Regression Oscillator with 2025 improvements
#[derive(Debug, Clone)]
pub struct EnhancedLRO {
    config: LROConfig,
    price_data: VecDeque<f64>,
    volumes: VecDeque<f64>,
    timestamps: VecDeque<i64>,
    atr_calculator: ATRCalculator,
    
    // Multi-timeframe analysis
    short_term_lro: Option<f64>,
    medium_term_lro: Option<f64>,
    long_term_lro: Option<f64>,
    
    // Performance tracking
    calculation_count: u64,
    last_signal: Option<LROSignal>,
    
    // Sliding window statistics for efficiency
    sum_x: f64,
    sum_y: f64,
    sum_xy: f64,
    sum_x2: f64,
    sum_y2: f64,
}

impl EnhancedLRO {
    pub fn new(config: LROConfig) -> Self {
        let atr_period = config.base_period.min(14); // ATR typically uses 14 periods
        
        Self {
            config: config.clone(),
            price_data: VecDeque::new(),
            volumes: VecDeque::new(),
            timestamps: VecDeque::new(),
            atr_calculator: ATRCalculator::new(atr_period),
            short_term_lro: None,
            medium_term_lro: None,
            long_term_lro: None,
            calculation_count: 0,
            last_signal: None,
            sum_x: 0.0,
            sum_y: 0.0,
            sum_xy: 0.0,
            sum_x2: 0.0,
            sum_y2: 0.0,
        }
    }

    /// Add new price data and calculate LRO
    pub fn update(&mut self, price_data: &PriceData) -> Option<LROSignal> {
        let price = price_data.close.to_f64().unwrap_or(0.0);
        let high = price_data.high.to_f64().unwrap_or(0.0);
        let low = price_data.low.to_f64().unwrap_or(0.0);
        let volume = price_data.volume.to_f64().unwrap_or(0.0);
        let timestamp = price_data.timestamp.timestamp();

        // Update ATR for volatility-based adjustments
        if !self.price_data.is_empty() {
            if let Some(prev_close) = self.price_data.back() {
                self.atr_calculator.update(high, low, *prev_close);
            }
        }

        // Add new data
        self.price_data.push_back(price);
        self.volumes.push_back(volume);
        self.timestamps.push_back(timestamp);

        // Maintain sliding window
        let current_period = self.get_dynamic_period();
        while self.price_data.len() > current_period * 2 {
            self.price_data.pop_front();
            self.volumes.pop_front();
            self.timestamps.pop_front();
        }

        // Calculate LRO if we have enough data
        if self.price_data.len() >= current_period {
            self.calculation_count += 1;
            self.calculate_multi_timeframe_lro()
        } else {
            None
        }
    }

    /// Calculate dynamic period based on volatility
    fn get_dynamic_period(&self) -> usize {
        if !self.config.volatility_adjustment {
            return self.config.base_period;
        }

        let atr = self.atr_calculator.get_current();
        if atr == 0.0 {
            return self.config.base_period;
        }

        // Adjust period based on volatility
        // High volatility -> shorter period (more responsive)
        // Low volatility -> longer period (more stable)
        let avg_price = self.price_data.iter().sum::<f64>() / self.price_data.len() as f64;
        let volatility_ratio = atr / avg_price;

        let adjustment = if volatility_ratio > 0.02 {
            // High volatility - use shorter period
            -2
        } else if volatility_ratio < 0.01 {
            // Low volatility - use longer period
            2
        } else {
            0
        };

        let adjusted_period = (self.config.base_period as i32 + adjustment) as usize;
        adjusted_period
            .max(self.config.min_period)
            .min(self.config.max_period)
    }

    /// Calculate multi-timeframe LRO analysis
    fn calculate_multi_timeframe_lro(&mut self) -> Option<LROSignal> {
        if !self.config.multi_timeframe {
            return self.calculate_single_lro(self.get_dynamic_period());
        }

        // Calculate LRO for different periods
        let short_period = self.config.base_period / 2;
        let medium_period = self.config.base_period;
        let long_period = self.config.base_period * 2;

        self.short_term_lro = self.calculate_lro_value(short_period);
        self.medium_term_lro = self.calculate_lro_value(medium_period);
        self.long_term_lro = self.calculate_lro_value(long_period);

        // Generate signal based on multi-timeframe confluence
        self.generate_multi_timeframe_signal()
    }

    /// Calculate single LRO for a specific period
    fn calculate_single_lro(&self, period: usize) -> Option<LROSignal> {
        if let Some(deviation) = self.calculate_lro_value(period) {
            self.generate_signal_from_deviation(deviation, 1.0)
        } else {
            None
        }
    }

    /// Calculate LRO value using efficient sliding window algorithm
    fn calculate_lro_value(&self, period: usize) -> Option<f64> {
        if self.price_data.len() < period {
            return None;
        }

        let data: Vec<f64> = self.price_data.iter().rev().take(period).copied().collect();
        let regression = self.calculate_linear_regression(&data)?;
        
        // Current price deviation from regression line (in standard deviations)
        let current_price = *self.price_data.back()?;
        let predicted_price = regression.slope * (period as f64 - 1.0) + regression.intercept;
        
        if regression.standard_error > 0.0 {
            Some((current_price - predicted_price) / regression.standard_error)
        } else {
            Some(0.0)
        }
    }

    /// Efficient linear regression calculation
    fn calculate_linear_regression(&self, data: &[f64]) -> Option<RegressionResult> {
        let n = data.len() as f64;
        if n < 2.0 {
            return None;
        }

        // Calculate sums using single pass
        let mut sum_x = 0.0;
        let mut sum_y = 0.0;
        let mut sum_xy = 0.0;
        let mut sum_x2 = 0.0;
        let mut sum_y2 = 0.0;

        for (i, &price) in data.iter().enumerate() {
            let x = i as f64;
            sum_x += x;
            sum_y += price;
            sum_xy += x * price;
            sum_x2 += x * x;
            sum_y2 += price * price;
        }

        // Calculate slope and intercept
        let denominator = n * sum_x2 - sum_x * sum_x;
        if denominator.abs() < f64::EPSILON {
            return None;
        }

        let slope = (n * sum_xy - sum_x * sum_y) / denominator;
        let intercept = (sum_y - slope * sum_x) / n;

        // Calculate R-squared and standard error
        let mean_y = sum_y / n;
        let mut ss_tot = 0.0;
        let mut ss_res = 0.0;

        for (i, &price) in data.iter().enumerate() {
            let predicted = slope * i as f64 + intercept;
            ss_res += (price - predicted).powi(2);
            ss_tot += (price - mean_y).powi(2);
        }

        let r_squared = if ss_tot > 0.0 { 1.0 - (ss_res / ss_tot) } else { 0.0 };
        let standard_error = (ss_res / (n - 2.0)).sqrt();

        Some(RegressionResult {
            slope,
            intercept,
            r_squared,
            standard_error,
            deviation: 0.0, // Will be calculated separately
        })
    }

    /// Generate signal based on multi-timeframe confluence
    fn generate_multi_timeframe_signal(&mut self) -> Option<LROSignal> {
        let short = self.short_term_lro?;
        let medium = self.medium_term_lro?;
        let long = self.long_term_lro?;

        // Calculate weighted average with recency bias
        let weighted_lro = (short * 0.5) + (medium * 0.3) + (long * 0.2);
        
        // Calculate confluence score (agreement between timeframes)
        let confluence = self.calculate_confluence_score(short, medium, long);
        
        self.generate_signal_from_deviation(weighted_lro, confluence)
    }

    /// Calculate confluence score between different timeframes
    fn calculate_confluence_score(&self, short: f64, medium: f64, long: f64) -> f64 {
        let values = [short, medium, long];
        let mean = values.iter().sum::<f64>() / values.len() as f64;
        let variance = values.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / values.len() as f64;
        let std_dev = variance.sqrt();
        
        // Higher confluence when standard deviation is lower
        if std_dev > 0.0 {
            (2.0 / (1.0 + std_dev)).min(1.0)
        } else {
            1.0
        }
    }

    /// Generate trading signal from LRO deviation
    fn generate_signal_from_deviation(&self, deviation: f64, confidence: f64) -> Option<LROSignal> {
        // Adjust thresholds based on current volatility
        let (overbought, oversold) = self.get_dynamic_thresholds();
        
        let signal = if deviation >= overbought * 1.5 {
            LROSignal::StrongSell { confidence, deviation }
        } else if deviation >= overbought {
            LROSignal::Sell { confidence, deviation }
        } else if deviation <= oversold * 1.5 {
            LROSignal::StrongBuy { confidence, deviation }
        } else if deviation <= oversold {
            LROSignal::Buy { confidence, deviation }
        } else {
            LROSignal::Neutral { deviation }
        };

        Some(signal)
    }

    /// Get dynamic thresholds based on market volatility
    fn get_dynamic_thresholds(&self) -> (f64, f64) {
        let base_overbought = self.config.overbought_threshold;
        let base_oversold = self.config.oversold_threshold;

        if !self.config.volatility_adjustment {
            return (base_overbought, base_oversold);
        }

        let atr = self.atr_calculator.get_current();
        if atr == 0.0 || self.price_data.is_empty() {
            return (base_overbought, base_oversold);
        }

        let avg_price = self.price_data.iter().sum::<f64>() / self.price_data.len() as f64;
        let volatility_ratio = atr / avg_price;

        // Adjust thresholds based on volatility
        let multiplier = if volatility_ratio > 0.02 {
            1.3 // Wider thresholds for high volatility
        } else if volatility_ratio < 0.01 {
            0.8 // Tighter thresholds for low volatility
        } else {
            1.0
        };

        (base_overbought * multiplier, base_oversold * multiplier)
    }

    /// Check for divergence patterns
    pub fn detect_divergence(&self, price_highs: &[f64], price_lows: &[f64], lro_values: &[f64]) -> Option<String> {
        if !self.config.divergence_detection || price_highs.len() < 2 || lro_values.len() < 2 {
            return None;
        }

        // Bullish divergence: price makes lower low, LRO makes higher low
        if price_lows.len() >= 2 && lro_values.len() >= 2 {
            let recent_price_low = price_lows[price_lows.len() - 1];
            let prev_price_low = price_lows[price_lows.len() - 2];
            let recent_lro = lro_values[lro_values.len() - 1];
            let prev_lro = lro_values[lro_values.len() - 2];

            if recent_price_low < prev_price_low && recent_lro > prev_lro {
                return Some("Bullish Divergence".to_string());
            }
        }

        // Bearish divergence: price makes higher high, LRO makes lower high
        if price_highs.len() >= 2 && lro_values.len() >= 2 {
            let recent_price_high = price_highs[price_highs.len() - 1];
            let prev_price_high = price_highs[price_highs.len() - 2];
            let recent_lro = lro_values[lro_values.len() - 1];
            let prev_lro = lro_values[lro_values.len() - 2];

            if recent_price_high > prev_price_high && recent_lro < prev_lro {
                return Some("Bearish Divergence".to_string());
            }
        }

        None
    }

    /// Get current LRO statistics for analysis
    pub fn get_statistics(&self) -> LROStatistics {
        LROStatistics {
            calculation_count: self.calculation_count,
            current_period: self.get_dynamic_period(),
            current_atr: self.atr_calculator.get_current(),
            short_term_lro: self.short_term_lro,
            medium_term_lro: self.medium_term_lro,
            long_term_lro: self.long_term_lro,
            last_signal: self.last_signal.clone(),
            data_points: self.price_data.len(),
            dynamic_thresholds: self.get_dynamic_thresholds(),
        }
    }

    /// Reset the LRO calculator
    pub fn reset(&mut self) {
        self.price_data.clear();
        self.volumes.clear();
        self.timestamps.clear();
        self.atr_calculator = ATRCalculator::new(self.config.base_period.min(14));
        self.short_term_lro = None;
        self.medium_term_lro = None;
        self.long_term_lro = None;
        self.calculation_count = 0;
        self.last_signal = None;
        self.sum_x = 0.0;
        self.sum_y = 0.0;
        self.sum_xy = 0.0;
        self.sum_x2 = 0.0;
        self.sum_y2 = 0.0;
    }
}

/// LRO performance and diagnostic statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LROStatistics {
    pub calculation_count: u64,
    pub current_period: usize,
    pub current_atr: f64,
    pub short_term_lro: Option<f64>,
    pub medium_term_lro: Option<f64>,
    pub long_term_lro: Option<f64>,
    pub last_signal: Option<LROSignal>,
    pub data_points: usize,
    pub dynamic_thresholds: (f64, f64),
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_lro_basic_functionality() {
        let mut lro = EnhancedLRO::new(LROConfig::default());
        
        // Test with simple uptrend data
        let prices = vec![100.0, 101.0, 102.0, 103.0, 104.0, 105.0, 106.0, 107.0, 108.0, 109.0, 110.0, 111.0, 112.0, 113.0, 114.0];
        
        for (i, price) in prices.iter().enumerate() {
            let price_data = PriceData {
                timestamp: Utc::now(),
                open: Decimal::from_f64(*price).unwrap_or_default(),
                high: Decimal::from_f64(*price + 0.5).unwrap_or_default(),
                low: Decimal::from_f64(*price - 0.5).unwrap_or_default(),
                close: Decimal::from_f64(*price).unwrap_or_default(),
                volume: Decimal::from_f64(1000.0).unwrap_or_default(),
            };
            
            let signal = lro.update(&price_data);
            
            if i >= 13 { // After we have enough data
                assert!(signal.is_some());
            }
        }
        
        let stats = lro.get_statistics();
        assert!(stats.calculation_count > 0);
        assert!(stats.data_points > 0);
    }

    #[test]
    fn test_dynamic_thresholds() {
        let config = LROConfig {
            volatility_adjustment: true,
            ..Default::default()
        };
        let lro = EnhancedLRO::new(config);
        let (overbought, oversold) = lro.get_dynamic_thresholds();
        
        // Should return default thresholds when no data
        assert_eq!(overbought, 1.5);
        assert_eq!(oversold, -1.5);
    }

    #[test]
    fn test_signal_generation() {
        let lro = EnhancedLRO::new(LROConfig::default());
        
        // Test strong overbought signal
        let signal = lro.generate_signal_from_deviation(3.0, 0.8);
        match signal {
            Some(LROSignal::StrongSell { confidence, deviation }) => {
                assert_eq!(confidence, 0.8);
                assert_eq!(deviation, 3.0);
            },
            _ => panic!("Expected StrongSell signal"),
        }
        
        // Test strong oversold signal
        let signal = lro.generate_signal_from_deviation(-3.0, 0.9);
        match signal {
            Some(LROSignal::StrongBuy { confidence, deviation }) => {
                assert_eq!(confidence, 0.9);
                assert_eq!(deviation, -3.0);
            },
            _ => panic!("Expected StrongBuy signal"),
        }
    }

    #[test]
    fn test_confluence_calculation() {
        let lro = EnhancedLRO::new(LROConfig::default());
        
        // Test high confluence (all values similar)
        let confluence = lro.calculate_confluence_score(1.0, 1.1, 0.9);
        assert!(confluence > 0.8); // Should be high
        
        // Test low confluence (values spread apart)
        let confluence = lro.calculate_confluence_score(1.0, 2.0, -1.0);
        assert!(confluence < 0.5); // Should be lower
    }
}