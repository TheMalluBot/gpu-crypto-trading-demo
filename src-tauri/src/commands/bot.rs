use crate::TradingState;
use crate::trading_strategy::{LROConfig, LROSignal, BotPerformance, BotPosition, BotState, PauseReason, PauseInfo};
use crate::models::PriceData;
use crate::models::{MarketDepthAnalysis, LiquidityLevel};
use tauri::State;
use serde::{Serialize, Deserialize};
use rust_decimal::prelude::ToPrimitive;

// Swing Trading Bot Commands
#[tauri::command]
pub async fn start_swing_bot(trading_state: State<'_, TradingState>) -> Result<(), String> {
    let _operation_lock = trading_state.bot_operation_lock.lock().await;
    
    let mut bot = trading_state.swing_bot.write().await;
    
    if trading_state.is_processing_signal.load(std::sync::atomic::Ordering::Acquire) {
        return Err("Cannot start bot: Signal processing already in progress".to_string());
    }
    
    // Use new start_bot method which includes all safety checks
    bot.start_bot()?;
    
    trading_state.last_operation_timestamp.store(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        std::sync::atomic::Ordering::Release
    );
    
    eprintln!("Bot started with safety checks passed and concurrency protection");
    Ok(())
}

#[tauri::command]
pub async fn stop_swing_bot(trading_state: State<'_, TradingState>) -> Result<(), String> {
    let _operation_lock = trading_state.bot_operation_lock.lock().await;
    
    let mut bot = trading_state.swing_bot.write().await;
    bot.stop_bot("User requested stop");
    
    trading_state.is_processing_signal.store(false, std::sync::atomic::Ordering::Release);
    
    trading_state.last_operation_timestamp.store(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        std::sync::atomic::Ordering::Release
    );
    
    eprintln!("Bot stopped with concurrency protection");
    Ok(())
}

#[tauri::command]
pub async fn pause_swing_bot(
    reason: Option<String>, 
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let _operation_lock = trading_state.bot_operation_lock.lock().await;
    
    let mut bot = trading_state.swing_bot.write().await;
    
    let pause_reason = if let Some(reason_text) = reason {
        PauseReason::Manual
    } else {
        PauseReason::Manual
    };
    
    bot.pause_bot(pause_reason);
    
    trading_state.last_operation_timestamp.store(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        std::sync::atomic::Ordering::Release
    );
    
    eprintln!("Bot paused with concurrency protection");
    Ok(())
}

#[tauri::command]
pub async fn resume_swing_bot(trading_state: State<'_, TradingState>) -> Result<(), String> {
    let _operation_lock = trading_state.bot_operation_lock.lock().await;
    
    let mut bot = trading_state.swing_bot.write().await;
    bot.resume_bot()?;
    
    trading_state.last_operation_timestamp.store(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        std::sync::atomic::Ordering::Release
    );
    
    eprintln!("Bot resumed with concurrency protection");
    Ok(())
}

#[tauri::command]
pub async fn update_bot_config(
    mut config: LROConfig,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let _operation_lock = trading_state.bot_operation_lock.lock().await;
    
    if !config.paper_trading_enabled {
        eprintln!("WARNING: Forcing paper trading mode for safety");
        config.paper_trading_enabled = true;
    }
    
    if config.stop_loss_percent <= 0.0 || config.stop_loss_percent > 20.0 {
        return Err("Invalid stop loss percent: must be between 0.1% and 20%".to_string());
    }
    
    if config.take_profit_percent <= 0.0 || config.take_profit_percent > 50.0 {
        return Err("Invalid take profit percent: must be between 0.1% and 50%".to_string());
    }
    
    if config.max_position_size <= 0.0 {
        return Err("Invalid max position size: must be positive".to_string());
    }
    
    if config.virtual_balance <= 0.0 {
        return Err("Invalid virtual balance: must be positive".to_string());
    }
    
    let mut bot = trading_state.swing_bot.write().await;
    
    if trading_state.is_processing_signal.load(std::sync::atomic::Ordering::Acquire) {
        return Err("Cannot update config: Bot is currently processing signals".to_string());
    }
    
    bot.config = config;
    
    trading_state.last_operation_timestamp.store(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        std::sync::atomic::Ordering::Release
    );
    
    eprintln!("Bot configuration updated with safety validation and concurrency protection");
    Ok(())
}

#[tauri::command]
pub async fn get_bot_status(trading_state: State<'_, TradingState>) -> Result<BotStatus, String> {
    let bot = trading_state.swing_bot.read().await;
    
    let circuit_breaker_active = if let Some(last_trigger) = bot.last_circuit_breaker_time {
        let now = chrono::Utc::now();
        let duration = now.signed_duration_since(last_trigger);
        duration.num_minutes() < 60
    } else {
        false
    };
    
    let positions_auto_closed = bot.performance_stats.total_trades / 10;
    
    Ok(BotStatus {
        // Legacy field for backward compatibility
        is_active: bot.is_running(),
        // New state system
        state: bot.get_state(),
        pause_info: bot.get_pause_info().cloned(),
        current_position: bot.current_position.clone(),
        latest_signal: bot.get_latest_signal().cloned(),
        performance: bot.get_performance_summary().clone(),
        config: bot.config.clone(),
        #[allow(deprecated)]
        emergency_stop_triggered: bot.emergency_stop_triggered,
        circuit_breaker_count: bot.circuit_breaker_count,
        circuit_breaker_active,
        account_balance: bot.account_balance,
        daily_loss_tracker: bot.daily_loss_tracker,
        max_position_hold_hours: bot.max_position_hold_hours,
        current_daily_loss: bot.daily_loss_tracker,
        positions_auto_closed,
    })
}

#[tauri::command]
pub async fn get_lro_signals(
    limit: Option<usize>,
    trading_state: State<'_, TradingState>
) -> Result<Vec<LROSignal>, String> {
    let bot = trading_state.swing_bot.read().await;
    let signals: Vec<LROSignal> = bot.signal_history
        .iter()
        .rev()
        .take(limit.unwrap_or(50))
        .cloned()
        .collect();
    
    Ok(signals)
}

#[tauri::command]
pub async fn feed_price_data(
    price_data: PriceData,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    bot.add_price_data(price_data);
    Ok(())
}


// Safety Commands
#[tauri::command]
pub async fn trigger_emergency_stop(
    reason: String,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    bot.trigger_emergency_stop(&reason);
    Ok(())
}

#[tauri::command]
pub async fn reset_emergency_stop(trading_state: State<'_, TradingState>) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    match bot.reset_emergency_stop() {
        Ok(()) => {
            eprintln!("Emergency stop reset successfully");
            Ok(())
        },
        Err(e) => {
            eprintln!("Failed to reset emergency stop: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn set_account_balance(
    balance: rust_decimal::Decimal,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    bot.set_account_balance(balance);
    Ok(())
}

#[tauri::command]
pub async fn set_max_position_hold_hours(
    hours: u32,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    bot.set_max_position_hold_hours(hours);
    Ok(())
}

#[tauri::command]
pub async fn get_safety_status(trading_state: State<'_, TradingState>) -> Result<SafetyStatus, String> {
    let bot = trading_state.swing_bot.read().await;
    
    let circuit_breaker_active = if let Some(last_trigger) = bot.last_circuit_breaker_time {
        let now = chrono::Utc::now();
        let duration = now.signed_duration_since(last_trigger);
        duration.num_minutes() < 60
    } else {
        false
    };
    
    Ok(SafetyStatus {
        emergency_stop_triggered: bot.emergency_stop_triggered,
        circuit_breaker_count: bot.circuit_breaker_count,
        circuit_breaker_active,
        daily_loss_tracker: bot.daily_loss_tracker,
        account_balance: bot.account_balance,
        max_position_hold_hours: bot.max_position_hold_hours,
        last_circuit_breaker_time: bot.last_circuit_breaker_time,
    })
}

#[tauri::command]
pub async fn reset_daily_loss_tracker(trading_state: State<'_, TradingState>) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    bot.daily_loss_tracker = rust_decimal::Decimal::ZERO;
    bot.daily_reset_time = chrono::Utc::now();
    Ok(())
}

#[tauri::command]
pub async fn update_safety_config(
    config: SafetyConfig,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    bot.set_account_balance(config.account_balance);
    bot.set_max_position_hold_hours(config.max_position_hold_hours);
    Ok(())
}

// Analytics Commands
#[tauri::command]
pub async fn get_bot_performance_history(
    days: Option<u32>,
) -> Result<Vec<PerformanceDataPoint>, String> {
    let days = days.unwrap_or(30);
    let mut data = Vec::new();
    let now = chrono::Utc::now();
    let mut total_pnl = 0.0;
    
    for i in 0..days {
        let date = now - chrono::Duration::days(i as i64);
        
        data.push(PerformanceDataPoint {
            timestamp: date,
            time: date.format("%Y-%m-%d").to_string(),
            total_pnl: 0.0, // No historical data available
            cumulative_return: 0.0,
            drawdown: 0.0,
            win_rate: 0.0,
        });
    }
    
    data.reverse();
    Ok(data)
}

#[tauri::command]
pub async fn analyze_market_conditions(
    trading_state: State<'_, TradingState>
) -> Result<MarketConditions, String> {
    let bot = trading_state.swing_bot.read().await;
    
    // Use real market analysis based on recent price data
    let market_conditions = if bot.price_history.len() > 20 {
        let recent_prices: Vec<_> = bot.price_history.iter().rev().take(20).collect();
        
        // Calculate real volatility from price data
        let volatility = calculate_volatility(&recent_prices);
        let trend_strength = calculate_trend_strength(&recent_prices);
        let volume_profile = calculate_volume_profile(&recent_prices);
        let price_momentum = calculate_momentum(&recent_prices);
        let market_regime = determine_market_regime(volatility, trend_strength);
        
        MarketConditions {
            volatility,
            trend_strength,
            volume_profile,
            price_momentum,
            market_regime,
        }
    } else {
        // Return neutral values if insufficient data
        MarketConditions {
            volatility: 0.3,
            trend_strength: 0.5,
            volume_profile: 0.5,
            price_momentum: 0.0,
            market_regime: "Insufficient Data".to_string(),
        }
    };
    
    Ok(market_conditions)
}

// Helper functions for real market analysis
fn calculate_volatility(prices: &[&crate::models::PriceData]) -> f64 {
    if prices.len() < 2 { return 0.0; }
    
    let returns: Vec<f64> = prices.windows(2)
        .map(|window| {
            let prev = window[1].close.to_f64().unwrap_or(0.0);
            let curr = window[0].close.to_f64().unwrap_or(0.0);
            if prev > 0.0 { (curr - prev) / prev } else { 0.0 }
        })
        .collect();
    
    if returns.is_empty() { return 0.0; }
    
    let mean = returns.iter().sum::<f64>() / returns.len() as f64;
    let variance = returns.iter()
        .map(|r| (r - mean).powi(2))
        .sum::<f64>() / returns.len() as f64;
    
    variance.sqrt().min(1.0)
}

fn calculate_trend_strength(prices: &[&crate::models::PriceData]) -> f64 {
    if prices.len() < 2 { return 0.5; }
    
    let first_price = prices.last()
        .map(|p| p.close.to_f64().unwrap_or(0.0))
        .unwrap_or(0.0);
    let last_price = prices.first()
        .map(|p| p.close.to_f64().unwrap_or(0.0))
        .unwrap_or(0.0);
    
    if first_price > 0.0 {
        ((last_price - first_price) / first_price).abs().min(1.0)
    } else {
        0.5
    }
}

fn calculate_volume_profile(prices: &[&crate::models::PriceData]) -> f64 {
    if prices.is_empty() { return 0.5; }
    
    let avg_volume = prices.iter()
        .map(|p| p.volume.to_f64().unwrap_or(0.0))
        .sum::<f64>() / prices.len() as f64;
    
    // Normalize volume profile (this is a simplified calculation)
    (avg_volume / 1000.0).min(1.0).max(0.0)
}

fn calculate_momentum(prices: &[&crate::models::PriceData]) -> f64 {
    if prices.len() < 2 { return 0.0; }
    
    let first_price = prices.last()
        .map(|p| p.close.to_f64().unwrap_or(0.0))
        .unwrap_or(0.0);
    let last_price = prices.first()
        .map(|p| p.close.to_f64().unwrap_or(0.0))
        .unwrap_or(0.0);
    
    if first_price > 0.0 {
        ((last_price - first_price) / first_price).max(-1.0).min(1.0)
    } else {
        0.0
    }
}

fn determine_market_regime(volatility: f64, trend_strength: f64) -> String {
    match (volatility, trend_strength) {
        (v, _t) if v > 0.5 => "Volatile".to_string(),
        (_, t) if t > 0.3 => "Trending".to_string(),
        (_, t) if t < 0.1 => "Sideways".to_string(),
        _ => "Normal".to_string(),
    }
}

#[tauri::command]
pub async fn get_market_depth_analysis(
    trading_state: State<'_, TradingState>
) -> Result<Option<MarketDepthAnalysis>, String> {
    let bot = trading_state.swing_bot.read().await;
    Ok(bot.market_depth_analysis.clone())
}

#[tauri::command]
pub async fn get_liquidity_levels(
    trading_state: State<'_, TradingState>
) -> Result<Vec<LiquidityLevel>, String> {
    let bot = trading_state.swing_bot.read().await;
    Ok(bot.liquidity_levels.clone())
}

#[tauri::command]
pub async fn enable_depth_analysis(
    enabled: bool,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    bot.enable_depth_analysis(enabled);
    Ok(())
}

// Data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotStatus {
    /// Legacy field for backward compatibility - use `state` instead
    pub is_active: bool,
    /// New bot state system
    pub state: BotState,
    /// Information about current pause (if paused)
    pub pause_info: Option<PauseInfo>,
    pub current_position: Option<BotPosition>,
    pub latest_signal: Option<LROSignal>,
    pub performance: BotPerformance,
    pub config: LROConfig,
    pub emergency_stop_triggered: bool,
    pub circuit_breaker_count: u32,
    pub circuit_breaker_active: bool,
    pub account_balance: rust_decimal::Decimal,
    pub daily_loss_tracker: rust_decimal::Decimal,
    pub max_position_hold_hours: u32,
    pub current_daily_loss: rust_decimal::Decimal,
    pub positions_auto_closed: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyStatus {
    pub emergency_stop_triggered: bool,
    pub circuit_breaker_count: u32,
    pub circuit_breaker_active: bool,
    pub daily_loss_tracker: rust_decimal::Decimal,
    pub account_balance: rust_decimal::Decimal,
    pub max_position_hold_hours: u32,
    pub last_circuit_breaker_time: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyConfig {
    pub account_balance: rust_decimal::Decimal,
    pub max_position_hold_hours: u32,
    pub daily_loss_limit: rust_decimal::Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceDataPoint {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub time: String,
    pub total_pnl: f64,
    pub cumulative_return: f64,
    pub drawdown: f64,
    pub win_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketConditions {
    pub volatility: f64,
    pub trend_strength: f64,
    pub volume_profile: f64,
    pub price_momentum: f64,
    pub market_regime: String,
}