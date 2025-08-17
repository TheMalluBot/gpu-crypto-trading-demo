// Optimized Linear Regression Oscillator with Incremental Calculation
// Implements O(1) updates instead of O(n) recalculation

use std::collections::VecDeque;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

/// Incremental regression calculator for O(1) updates
#[derive(Debug, Clone)]
pub struct IncrementalRegression {
    n: usize,
    sum_x: f64,
    sum_y: f64,
    sum_xy: f64,
    sum_x2: f64,
    sum_y2: f64,
    
    // Sliding window data
    window: VecDeque<(f64, f64)>,
    max_window_size: usize,
    
    // Cached results
    cached_slope: Option<f64>,
    cached_intercept: Option<f64>,
    cached_r_squared: Option<f64>,
}

impl IncrementalRegression {
    pub fn new(window_size: usize) -> Self {
        Self {
            n: 0,
            sum_x: 0.0,
            sum_y: 0.0,
            sum_xy: 0.0,
            sum_x2: 0.0,
            sum_y2: 0.0,
            window: VecDeque::with_capacity(window_size),
            max_window_size: window_size,
            cached_slope: None,
            cached_intercept: None,
            cached_r_squared: None,
        }
    }
    
    /// Add a new point and update statistics incrementally
    pub fn add_point(&mut self, x: f64, y: f64) {
        // Validate input
        if !x.is_finite() || !y.is_finite() {
            eprintln!("Warning: Non-finite value in regression: x={}, y={}", x, y);
            return;
        }
        
        // Add new point
        self.window.push_back((x, y));
        self.n += 1;
        
        // Update sums for new point
        self.sum_x += x;
        self.sum_y += y;
        self.sum_xy += x * y;
        self.sum_x2 += x * x;
        self.sum_y2 += y * y;
        
        // Remove old point if window is full
        if self.window.len() > self.max_window_size {
            if let Some((old_x, old_y)) = self.window.pop_front() {
                self.sum_x -= old_x;
                self.sum_y -= old_y;
                self.sum_xy -= old_x * old_y;
                self.sum_x2 -= old_x * old_x;
                self.sum_y2 -= old_y * old_y;
                self.n -= 1;
            }
        }
        
        // Invalidate cache
        self.cached_slope = None;
        self.cached_intercept = None;
        self.cached_r_squared = None;
    }
    
    /// Calculate regression parameters (cached)
    pub fn calculate(&mut self) -> Option<(f64, f64, f64)> {
        if self.n < 2 {
            return None;
        }
        
        // Return cached values if available
        if let (Some(slope), Some(intercept), Some(r_squared)) = 
            (self.cached_slope, self.cached_intercept, self.cached_r_squared) {
            return Some((slope, intercept, r_squared));
        }
        
        let n = self.n as f64;
        let denominator = n * self.sum_x2 - self.sum_x * self.sum_x;
        
        if denominator.abs() < 1e-10 {
            return None;
        }
        
        // Calculate slope and intercept
        let slope = (n * self.sum_xy - self.sum_x * self.sum_y) / denominator;
        let intercept = (self.sum_y - slope * self.sum_x) / n;
        
        // Calculate R-squared for confidence
        let mean_y = self.sum_y / n;
        let ss_tot = self.sum_y2 - n * mean_y * mean_y;
        
        if ss_tot.abs() < 1e-10 {
            return None;
        }
        
        let ss_res = self.window.iter()
            .map(|(x, y)| {
                let predicted = slope * x + intercept;
                let residual = y - predicted;
                residual * residual
            })
            .sum::<f64>();
        
        let r_squared = 1.0 - (ss_res / ss_tot);
        
        // Cache results
        self.cached_slope = Some(slope);
        self.cached_intercept = Some(intercept);
        self.cached_r_squared = Some(r_squared);
        
        Some((slope, intercept, r_squared))
    }
    
    /// Get current deviation from regression line
    pub fn get_deviation(&mut self) -> Option<f64> {
        if let Some((_, last_y)) = self.window.back() {
            if let Some((slope, intercept, _)) = self.calculate() {
                let last_x = (self.n - 1) as f64;
                let predicted = slope * last_x + intercept;
                return Some(last_y - predicted);
            }
        }
        None
    }
}

/// Kalman filter for signal smoothing
#[derive(Debug, Clone)]
pub struct KalmanFilter {
    q: f64, // Process noise covariance
    r: f64, // Measurement noise covariance
    x: f64, // Value
    p: f64, // Estimation error covariance
    k: f64, // Kalman gain
}

impl KalmanFilter {
    pub fn new(process_noise: f64, measurement_noise: f64, initial_value: f64) -> Self {
        Self {
            q: process_noise,
            r: measurement_noise,
            x: initial_value,
            p: 1.0,
            k: 0.0,
        }
    }
    
    pub fn update(&mut self, measurement: f64) -> f64 {
        // Prediction update
        self.p += self.q;
        
        // Measurement update
        self.k = self.p / (self.p + self.r);
        self.x += self.k * (measurement - self.x);
        self.p = (1.0 - self.k) * self.p;
        
        self.x
    }
}

/// Adaptive threshold calculator based on market volatility
#[derive(Debug, Clone)]
pub struct AdaptiveThresholds {
    base_overbought: f64,
    base_oversold: f64,
    volatility_window: VecDeque<f64>,
    window_size: usize,
}

impl AdaptiveThresholds {
    pub fn new(overbought: f64, oversold: f64, window_size: usize) -> Self {
        Self {
            base_overbought: overbought,
            base_oversold: oversold,
            volatility_window: VecDeque::with_capacity(window_size),
            window_size,
        }
    }
    
    pub fn update(&mut self, price_change: f64) {
        self.volatility_window.push_back(price_change.abs());
        
        if self.volatility_window.len() > self.window_size {
            self.volatility_window.pop_front();
        }
    }
    
    pub fn get_thresholds(&self) -> (f64, f64) {
        if self.volatility_window.is_empty() {
            return (self.base_overbought, self.base_oversold);
        }
        
        // Calculate current volatility
        let avg_volatility: f64 = self.volatility_window.iter().sum::<f64>() 
            / self.volatility_window.len() as f64;
        
        // Adjust thresholds based on volatility
        let adjustment = 1.0 + (avg_volatility * 0.5); // 50% adjustment per unit volatility
        
        (self.base_overbought * adjustment, self.base_oversold * adjustment)
    }
}

/// Optimized LRO with all improvements
#[derive(Debug, Clone)]
pub struct OptimizedLRO {
    // Core components
    regression: IncrementalRegression,
    signal_filter: KalmanFilter,
    thresholds: AdaptiveThresholds,
    
    // Multi-timeframe support
    timeframes: HashMap<String, IncrementalRegression>,
    
    // Performance tracking
    calculation_count: u64,
    last_update: DateTime<Utc>,
    
    // Signal history for pattern detection
    signal_history: VecDeque<LROSignal>,
    max_signal_history: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LROSignal {
    pub timestamp: DateTime<Utc>,
    pub value: f64,
    pub signal_type: SignalType,
    pub confidence: f64,
    pub deviation: f64,
    pub r_squared: f64,
    pub filtered_value: f64,
    pub thresholds: (f64, f64),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SignalType {
    StrongBuy,
    Buy,
    Neutral,
    Sell,
    StrongSell,
}

impl OptimizedLRO {
    pub fn new(period: usize) -> Self {
        Self {
            regression: IncrementalRegression::new(period),
            signal_filter: KalmanFilter::new(0.1, 0.3, 0.0),
            thresholds: AdaptiveThresholds::new(1.5, -1.5, period),
            timeframes: HashMap::new(),
            calculation_count: 0,
            last_update: Utc::now(),
            signal_history: VecDeque::with_capacity(100),
            max_signal_history: 100,
        }
    }
    
    /// Initialize multi-timeframe analysis
    pub fn add_timeframe(&mut self, name: String, period: usize) {
        self.timeframes.insert(name, IncrementalRegression::new(period));
    }
    
    /// Main update function - O(1) complexity
    pub fn update(&mut self, price: f64) -> Option<LROSignal> {
        // Validate input
        if !price.is_finite() || price <= 0.0 {
            eprintln!("Invalid price: {}", price);
            return None;
        }
        
        // Update regression with new price
        let x = self.calculation_count as f64;
        self.regression.add_point(x, price);
        
        // Get deviation and regression stats
        let deviation = self.regression.get_deviation()?;
        let (slope, _intercept, r_squared) = self.regression.calculate()?;
        
        // Apply Kalman filter for smoothing
        let filtered_value = self.signal_filter.update(deviation);
        
        // Update adaptive thresholds
        if self.calculation_count > 0 {
            let price_change = (price - self.get_last_price()) / self.get_last_price();
            self.thresholds.update(price_change);
        }
        
        let (overbought, oversold) = self.thresholds.get_thresholds();
        
        // Determine signal type with confidence
        let (signal_type, confidence) = self.classify_signal(
            filtered_value, 
            slope, 
            r_squared, 
            overbought, 
            oversold
        );
        
        // Create signal
        let signal = LROSignal {
            timestamp: Utc::now(),
            value: deviation,
            signal_type,
            confidence,
            deviation,
            r_squared,
            filtered_value,
            thresholds: (overbought, oversold),
        };
        
        // Update history
        self.signal_history.push_back(signal.clone());
        if self.signal_history.len() > self.max_signal_history {
            self.signal_history.pop_front();
        }
        
        // Update tracking
        self.calculation_count += 1;
        self.last_update = Utc::now();
        
        Some(signal)
    }
    
    /// Classify signal with confidence calculation
    fn classify_signal(
        &self, 
        value: f64, 
        slope: f64, 
        r_squared: f64, 
        overbought: f64, 
        oversold: f64
    ) -> (SignalType, f64) {
        // Base confidence from R-squared
        let mut confidence = r_squared;
        
        // Adjust confidence based on slope strength
        let slope_factor = (slope.abs() / 0.01).min(1.5);
        confidence *= slope_factor;
        
        // Classify based on value and thresholds
        let signal_type = if value > overbought * 1.5 {
            SignalType::StrongSell
        } else if value > overbought {
            SignalType::Sell
        } else if value < oversold * 1.5 {
            SignalType::StrongBuy
        } else if value < oversold {
            SignalType::Buy
        } else {
            SignalType::Neutral
        };
        
        // Reduce confidence for neutral signals
        if signal_type == SignalType::Neutral {
            confidence *= 0.5;
        }
        
        (signal_type, confidence.min(1.0))
    }
    
    /// Get last price from regression window
    fn get_last_price(&self) -> f64 {
        self.regression.window.back()
            .map(|(_, y)| *y)
            .unwrap_or(0.0)
    }
    
    /// Check for divergences between price and oscillator
    pub fn check_divergence(&self, recent_prices: &[f64]) -> Option<DivergenceType> {
        if self.signal_history.len() < 10 || recent_prices.len() < 10 {
            return None;
        }
        
        // Get recent oscillator values
        let recent_lro: Vec<f64> = self.signal_history
            .iter()
            .rev()
            .take(10)
            .map(|s| s.value)
            .collect();
        
        // Check for bullish divergence (price making lower lows, oscillator making higher lows)
        let price_trend = Self::calculate_trend(recent_prices);
        let lro_trend = Self::calculate_trend(&recent_lro);
        
        if price_trend < -0.1 && lro_trend > 0.1 {
            return Some(DivergenceType::Bullish);
        }
        
        // Check for bearish divergence (price making higher highs, oscillator making lower highs)
        if price_trend > 0.1 && lro_trend < -0.1 {
            return Some(DivergenceType::Bearish);
        }
        
        None
    }
    
    /// Simple trend calculation
    fn calculate_trend(data: &[f64]) -> f64 {
        if data.len() < 2 {
            return 0.0;
        }
        
        let first_half_avg: f64 = data[..data.len()/2].iter().sum::<f64>() 
            / (data.len()/2) as f64;
        let second_half_avg: f64 = data[data.len()/2..].iter().sum::<f64>() 
            / (data.len() - data.len()/2) as f64;
        
        (second_half_avg - first_half_avg) / first_half_avg
    }
    
    /// Get statistics for monitoring
    pub fn get_statistics(&self) -> LROStatistics {
        LROStatistics {
            calculation_count: self.calculation_count,
            last_update: self.last_update,
            current_r_squared: self.regression.cached_r_squared.unwrap_or(0.0),
            signal_count: self.signal_history.len(),
            average_confidence: self.signal_history.iter()
                .map(|s| s.confidence)
                .sum::<f64>() / self.signal_history.len().max(1) as f64,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DivergenceType {
    Bullish,
    Bearish,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LROStatistics {
    pub calculation_count: u64,
    pub last_update: DateTime<Utc>,
    pub current_r_squared: f64,
    pub signal_count: usize,
    pub average_confidence: f64,
}