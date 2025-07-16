use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::VecDeque;

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
pub struct PriceData {
    pub timestamp: DateTime<Utc>,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

pub struct MarketAnalyzer {
    price_history: VecDeque<PriceData>,
}

impl MarketAnalyzer {
    pub fn new() -> Self {
        Self {
            price_history: VecDeque::with_capacity(200),
        }
    }

    pub fn add_price_data(&mut self, price: PriceData) {
        self.price_history.push_back(price);
        if self.price_history.len() > 200 {
            self.price_history.pop_front();
        }
    }

    pub fn analyze_market_condition(&self) -> MarketCondition {
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

        let trend_strength = self.calculate_trend_strength(&recent_prices);
        let volatility = self.calculate_volatility(&recent_prices);
        let volume_profile = self.calculate_volume_profile();
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

        let denominator = n * x2_sum - x_sum.powi(2);
        if denominator.abs() < f64::EPSILON {
            return 0.0;
        }
        
        let slope = (n * xy_sum - x_sum * y_sum) / denominator;
        let avg_price = y_sum / n;
        let normalized_slope = slope / avg_price;
        
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
            1.0
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

    pub fn check_market_conditions_for_circuit_breaker(&self) -> Option<String> {
        if let Some(latest_price) = self.price_history.back() {
            if self.price_history.len() >= 10 {
                let recent_prices: Vec<f64> = self.price_history
                    .iter()
                    .rev()
                    .take(10)
                    .map(|p| p.close)
                    .collect();
                
                let volatility = self.calculate_volatility(&recent_prices);
                if volatility > 0.8 {
                    return Some("Extreme market volatility detected".to_string());
                }
            }
            
            if self.price_history.len() >= 2 {
                let current_price = latest_price.close;
                let prev_price = self.price_history[self.price_history.len() - 2].close;
                let price_change = ((current_price - prev_price) / prev_price).abs();
                
                if price_change > 0.15 {
                    return Some("Flash crash/pump detected".to_string());
                }
            }
        }
        None
    }

    pub fn is_market_data_stale(&self) -> bool {
        if let Some(last_price) = self.price_history.back() {
            let now = Utc::now();
            let duration = now.signed_duration_since(last_price.timestamp);
            duration.num_minutes() > 5
        } else {
            true
        }
    }
}