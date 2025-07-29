// Comprehensive test suite for AGENT-TRADER-PRO
// Phase 1: Core trading logic, risk management, and GPU operations

pub mod trading_strategy_tests;
pub mod enhanced_lro_tests;
pub mod risk_management_tests;
pub mod gpu_operations_tests;
pub mod backtesting_tests;
pub mod validation_tests;
pub mod security_tests;
pub mod integration_tests;

// Test utilities and common fixtures
pub mod test_utils;

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use crate::models::PriceData;

/// Generate test price data for consistent testing
pub fn create_test_price_data(timestamp: DateTime<Utc>, ohlc: (f64, f64, f64, f64), volume: f64) -> PriceData {
    PriceData {
        timestamp,
        open: Decimal::from_f64(ohlc.0).unwrap_or_default(),
        high: Decimal::from_f64(ohlc.1).unwrap_or_default(),
        low: Decimal::from_f64(ohlc.2).unwrap_or_default(),
        close: Decimal::from_f64(ohlc.3).unwrap_or_default(),
        volume: Decimal::from_f64(volume).unwrap_or_default(),
    }
}

/// Generate uptrend price data for testing
pub fn generate_uptrend_data(start_price: f64, periods: usize, increment: f64) -> Vec<PriceData> {
    let mut data = Vec::new();
    let base_time = Utc::now();
    
    for i in 0..periods {
        let price = start_price + (i as f64 * increment);
        let high = price + (increment * 0.5);
        let low = price - (increment * 0.3);
        
        data.push(create_test_price_data(
            base_time + chrono::Duration::minutes(i as i64),
            (price, high, low, price + (increment * 0.2)),
            1000.0 + (i as f64 * 10.0)
        ));
    }
    
    data
}

/// Generate downtrend price data for testing
pub fn generate_downtrend_data(start_price: f64, periods: usize, decrement: f64) -> Vec<PriceData> {
    let mut data = Vec::new();
    let base_time = Utc::now();
    
    for i in 0..periods {
        let price = start_price - (i as f64 * decrement);
        let high = price + (decrement * 0.3);
        let low = price - (decrement * 0.5);
        
        data.push(create_test_price_data(
            base_time + chrono::Duration::minutes(i as i64),
            (price, high, low, price - (decrement * 0.2)),
            1000.0 + (i as f64 * 10.0)
        ));
    }
    
    data
}

/// Generate sideways/ranging price data for testing
pub fn generate_sideways_data(base_price: f64, periods: usize, range: f64) -> Vec<PriceData> {
    let mut data = Vec::new();
    let base_time = Utc::now();
    
    for i in 0..periods {
        let variation = (i as f64 * 0.1).sin() * range;
        let price = base_price + variation;
        let high = price + (range * 0.2);
        let low = price - (range * 0.2);
        
        data.push(create_test_price_data(
            base_time + chrono::Duration::minutes(i as i64),
            (price, high, low, price + (variation * 0.1)),
            1000.0
        ));
    }
    
    data
}

/// Generate volatile price data for stress testing
pub fn generate_volatile_data(base_price: f64, periods: usize, volatility: f64) -> Vec<PriceData> {
    let mut data = Vec::new();
    let base_time = Utc::now();
    let mut current_price = base_price;
    
    for i in 0..periods {
        let change_pct = (((i as f64 * 17.0) % 100.0) - 50.0) / 100.0 * volatility;
        current_price *= 1.0 + change_pct;
        
        let high = current_price * (1.0 + volatility * 0.3);
        let low = current_price * (1.0 - volatility * 0.3);
        
        data.push(create_test_price_data(
            base_time + chrono::Duration::minutes(i as i64),
            (current_price, high, low, current_price),
            1000.0 + (i as f64 * 50.0)
        ));
    }
    
    data
}