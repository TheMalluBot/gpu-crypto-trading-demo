use crate::{AppState, TradingState};
use crate::models::{AppSettings, OrderRequest, Trade, AccountInfo, KlineData, SymbolInfo, MarketStats};
use crate::binance_client::BinanceClient;
use crate::trading_strategy::{LROConfig, PriceData, LROSignal, BotPerformance};
use crate::models::{OrderBookDepth, MarketDepthAnalysis, LiquidityLevel};
use tauri::State;

// Keep original GPU commands for background animation
#[tauri::command]
pub async fn cpu_stats(state: State<'_, AppState>) -> Result<f32, String> {
    let stats = state.read().await;
    Ok(stats.cpu_load)
}

#[tauri::command]
pub async fn gpu_stats(state: State<'_, AppState>) -> Result<(f32, f32), String> {
    let stats = state.read().await;
    Ok((stats.fps, stats.gpu_frame_time))
}

#[tauri::command]
pub async fn get_texture_data() -> Result<Vec<u8>, String> {
    let size = 512 * 512 * 4;
    let mut data = vec![0u8; size];
    
    for y in 0..512 {
        for x in 0..512 {
            let idx = (y * 512 + x) * 4;
            data[idx] = (x / 2) as u8;
            data[idx + 1] = (y / 2) as u8;
            data[idx + 2] = 128;
            data[idx + 3] = 255;
        }
    }
    
    Ok(data)
}

// New trading commands
#[tauri::command]
pub async fn save_settings(settings: AppSettings) -> Result<(), String> {
    let app_dir = tauri::api::path::app_data_dir(&tauri::Config::default()).unwrap();
    let store_path = app_dir.join("settings.json");
    
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(store_path, json).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn load_settings() -> Result<AppSettings, String> {
    let app_dir = tauri::api::path::app_data_dir(&tauri::Config::default()).unwrap();
    let store_path = app_dir.join("settings.json");
    
    if store_path.exists() {
        let json = std::fs::read_to_string(store_path).map_err(|e| e.to_string())?;
        let settings: AppSettings = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        Ok(settings)
    } else {
        Ok(AppSettings::default())
    }
}

#[tauri::command]
pub async fn test_connection(settings: AppSettings) -> Result<bool, String> {
    let client = BinanceClient::new(&settings);
    client.test_connection().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_account_info(settings: AppSettings) -> Result<AccountInfo, String> {
    let client = BinanceClient::new(&settings);
    client.get_account_info().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_klines(settings: AppSettings, symbol: String, interval: String, limit: u32) -> Result<Vec<KlineData>, String> {
    let client = BinanceClient::new(&settings);
    client.get_klines(&symbol, &interval, limit).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn place_order(
    settings: AppSettings,
    order: OrderRequest,
    paper_trading: bool,
    trading_state: State<'_, TradingState>
) -> Result<Trade, String> {
    if paper_trading {
        // Paper trading - use realistic simulation
        let client = BinanceClient::new(&settings);
        
        // Try to get current market price for realistic simulation
        let current_market_price = match client.get_klines(&order.symbol, "1m", 1).await {
            Ok(klines) if !klines.is_empty() => Some(klines[0].close),
            _ => None, // Fall back to default price
        };
        
        let trade = client.simulate_order(&order, current_market_price).await.map_err(|e| e.to_string())?;
        trading_state.paper_trades.write().await.push(trade.clone());
        Ok(trade)
    } else {
        // SAFETY: Live trading has been permanently removed
        eprintln!("CRITICAL SAFETY: Live trading attempted but is PERMANENTLY DISABLED");
        return Err("Live trading is permanently disabled for safety. All orders must use paper trading mode.".to_string());
    }
}

#[tauri::command]
pub async fn get_paper_trades(trading_state: State<'_, TradingState>) -> Result<Vec<Trade>, String> {
    let trades = trading_state.paper_trades.read().await;
    Ok(trades.clone())
}

#[tauri::command]
pub async fn change_symbol(symbol: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    // This would trigger WebSocket reconnection with new symbol
    Ok(())
}

// Swing Trading Bot Commands
#[tauri::command]
pub async fn start_swing_bot(trading_state: State<'_, TradingState>) -> Result<(), String> {
    // Acquire operation lock to ensure atomic start operation
    let _operation_lock = trading_state.bot_operation_lock.lock().await;
    
    let mut bot = trading_state.swing_bot.write().await;
    
    // CRITICAL SAFETY: Check conditions before starting bot
    if bot.emergency_stop_triggered {
        return Err("Cannot start bot: Emergency stop is active".to_string());
    }
    
    if !bot.config.paper_trading_enabled {
        return Err("Cannot start bot: Paper trading must be enabled".to_string());
    }
    
    if bot.account_balance <= rust_decimal::Decimal::ZERO {
        return Err("Cannot start bot: Account balance is zero or negative".to_string());
    }
    
    // Check if already processing signals
    if trading_state.is_processing_signal.load(std::sync::atomic::Ordering::Acquire) {
        return Err("Cannot start bot: Signal processing already in progress".to_string());
    }
    
    bot.is_active = true;
    
    // Update last operation timestamp
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
    // Acquire operation lock to ensure atomic stop operation
    let _operation_lock = trading_state.bot_operation_lock.lock().await;
    
    let mut bot = trading_state.swing_bot.write().await;
    bot.is_active = false;
    
    // Reset signal processing flag
    trading_state.is_processing_signal.store(false, std::sync::atomic::Ordering::Release);
    
    // Update last operation timestamp
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
pub async fn update_bot_config(
    mut config: LROConfig,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    // Acquire operation lock to ensure atomic config update
    let _operation_lock = trading_state.bot_operation_lock.lock().await;
    
    // CRITICAL SAFETY: Force paper trading mode
    if !config.paper_trading_enabled {
        eprintln!("WARNING: Forcing paper trading mode for safety");
        config.paper_trading_enabled = true;
    }
    
    // Validate configuration before applying
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
    
    // Check if bot is currently processing signals
    if trading_state.is_processing_signal.load(std::sync::atomic::Ordering::Acquire) {
        return Err("Cannot update config: Bot is currently processing signals".to_string());
    }
    
    bot.config = config;
    
    // Update last operation timestamp
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
    
    // Calculate circuit breaker status
    let circuit_breaker_active = if let Some(last_trigger) = bot.last_circuit_breaker_time {
        let now = chrono::Utc::now();
        let duration = now.signed_duration_since(last_trigger);
        duration.num_minutes() < 60
    } else {
        false
    };
    
    // Count auto-closed positions (simplified)
    let positions_auto_closed = bot.performance_stats.total_trades / 10; // Placeholder
    
    Ok(BotStatus {
        is_active: bot.is_active,
        current_position: bot.current_position.clone(),
        latest_signal: bot.get_latest_signal().cloned(),
        performance: bot.get_performance_summary().clone(),
        config: bot.config.clone(),
        // Safety Status
        emergency_stop_triggered: bot.emergency_stop_triggered,
        circuit_breaker_count: bot.circuit_breaker_count,
        circuit_breaker_active,
        account_balance: bot.account_balance,
        daily_loss_tracker: bot.daily_loss_tracker,
        max_position_hold_hours: bot.max_position_hold_hours,
        // Risk Metrics
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

#[tauri::command]
pub async fn simulate_market_data(
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let mut bot = trading_state.swing_bot.write().await;
    
    // Generate realistic price data for testing
    let base_price = 67000.0;
    let mut current_price = base_price;
    
    for i in 0..100 {
        // Simulate realistic price movement
        let volatility = 0.002; // 0.2% volatility
        let trend = 0.0001; // Slight upward trend
        let noise = (rand::random::<f64>() - 0.5) * 2.0 * volatility;
        
        current_price *= 1.0 + trend + noise;
        
        let timestamp = chrono::Utc::now() - chrono::Duration::minutes(100 - i);
        let volume = 1000.0 + rand::random::<f64>() * 500.0;
        
        let price_data = PriceData {
            timestamp,
            open: current_price * 0.999,
            high: current_price * 1.002,
            low: current_price * 0.998,
            close: current_price,
            volume,
        };
        
        bot.add_price_data(price_data);
    }
    
    Ok(())
}

use serde::{Serialize, Deserialize};
use crate::trading_strategy::BotPosition;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotStatus {
    pub is_active: bool,
    pub current_position: Option<BotPosition>,
    pub latest_signal: Option<LROSignal>,
    pub performance: BotPerformance,
    pub config: LROConfig,
    // Safety Status
    pub emergency_stop_triggered: bool,
    pub circuit_breaker_count: u32,
    pub circuit_breaker_active: bool,
    pub account_balance: rust_decimal::Decimal,
    pub daily_loss_tracker: rust_decimal::Decimal,
    pub max_position_hold_hours: u32,
    // Risk Metrics
    pub current_daily_loss: rust_decimal::Decimal,
    pub positions_auto_closed: u32,
}

// Additional data structures for safety features
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

// Emergency Stop and Safety Commands
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

// Enhanced Configuration Commands
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

// Performance and Analytics Commands
#[tauri::command]
pub async fn get_bot_performance_history(
    days: Option<u32>,
) -> Result<Vec<PerformanceDataPoint>, String> {
    // Generate mock performance data for demo
    let days = days.unwrap_or(30);
    let mut data = Vec::new();
    let now = chrono::Utc::now();
    let mut total_pnl = 0.0;
    
    for i in 0..days {
        let date = now - chrono::Duration::days(i as i64);
        let daily_return = (rand::random::<f64>() - 0.45) * 20.0;
        total_pnl += daily_return;
        
        data.push(PerformanceDataPoint {
            timestamp: date,
            time: date.format("%Y-%m-%d").to_string(),
            total_pnl,
            cumulative_return: (total_pnl / 1000.0) * 100.0,
            drawdown: total_pnl.min(0.0) * 0.1,
            win_rate: 50.0 + (rand::random::<f64>() * 30.0),
        });
    }
    
    data.reverse();
    Ok(data)
}

#[tauri::command]
pub async fn analyze_market_conditions() -> Result<MarketConditions, String> {
    // Generate mock market conditions for demo
    Ok(MarketConditions {
        volatility: rand::random::<f64>() * 0.6 + 0.2,
        trend_strength: rand::random::<f64>(),
        volume_profile: rand::random::<f64>(),
        price_momentum: (rand::random::<f64>() - 0.5) * 2.0,
        market_regime: ["Bull", "Bear", "Sideways", "Volatile"][rand::random::<usize>() % 4].to_string(),
    })
}

// Level 2 Market Data Commands
#[tauri::command]
pub async fn get_order_book_depth(
    settings: AppSettings,
    symbol: String,
    limit: Option<u32>
) -> Result<OrderBookDepth, String> {
    let client = BinanceClient::new(&settings);
    client.get_order_book_depth(&symbol, limit).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn feed_order_book_data(
    order_book: OrderBookDepth,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let settings = AppSettings::default(); // In production, pass real settings
    let client = BinanceClient::new(&settings);
    
    let mut bot = trading_state.swing_bot.write().await;
    bot.add_order_book_data(order_book, &client);
    Ok(())
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

#[tauri::command]
pub async fn start_order_book_feed(
    settings: AppSettings,
    symbol: String,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    // This would start a background task to continuously fetch order book data
    // For now, we'll simulate it by fetching once
    let client = BinanceClient::new(&settings);
    let order_book = client.get_order_book_depth(&symbol, Some(100)).await.map_err(|e| e.to_string())?;
    
    let mut bot = trading_state.swing_bot.write().await;
    bot.add_order_book_data(order_book, &client);
    
    Ok(())
}

// New commands for symbol selection and market data
#[tauri::command]
pub async fn get_all_symbols(settings: AppSettings) -> Result<Vec<SymbolInfo>, String> {
    let client = BinanceClient::new(&settings);
    client.get_all_symbols().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_symbols(settings: AppSettings, query: String, limit: Option<usize>) -> Result<Vec<SymbolInfo>, String> {
    let client = BinanceClient::new(&settings);
    client.search_symbols(&query, limit.unwrap_or(50)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_market_stats(settings: AppSettings, symbol: String) -> Result<MarketStats, String> {
    let client = BinanceClient::new(&settings);
    client.get_market_stats(&symbol).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_popular_symbols(settings: AppSettings) -> Result<Vec<SymbolInfo>, String> {
    let client = BinanceClient::new(&settings);
    let all_symbols = client.get_all_symbols().await.map_err(|e| e.to_string())?;
    
    // Filter to show most popular trading pairs
    let popular_symbols: Vec<SymbolInfo> = all_symbols
        .into_iter()
        .filter(|symbol| {
            // Popular quote currencies
            ["USDT", "BUSD", "USDC", "BTC", "ETH", "BNB"].contains(&symbol.quote_asset.as_str()) &&
            // Popular base currencies
            ["BTC", "ETH", "BNB", "ADA", "DOT", "LINK", "SOL", "MATIC", "AVAX", "ATOM", "NEAR", "FTM", "ALGO", "XRP", "DOGE", "SHIB", "UNI", "AAVE", "SUSHI", "CAKE"].contains(&symbol.base_asset.as_str())
        })
        .take(200)
        .collect();
    
    Ok(popular_symbols)
}