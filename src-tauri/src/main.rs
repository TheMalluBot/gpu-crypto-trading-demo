use tauri::{Manager, Emitter};
use std::sync::Arc;
use tokio::sync::{RwLock, Mutex};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

mod gpu_renderer;
mod gpu_trading;
mod gpu_risk_manager;
mod cpu_worker;
mod commands;
mod models;
mod websocket;
mod trading_strategy;
mod rate_limiter;
mod secure_storage;
mod binance_client;
mod secure_commands;
mod logging;
mod errors;
mod validation;
mod config;
mod cache;
mod connection_pool;

use gpu_renderer::GpuRenderer;
use gpu_trading::GpuTradingAccelerator;
use cpu_worker::CpuWorker;
use websocket::ImprovedBinanceWebSocket;
use models::Trade;
use trading_strategy::{SwingTradingBot, LROConfig};

#[derive(Debug, Clone, serde::Serialize)]
struct SystemStats {
    fps: f32,
    cpu_load: f32,
    gpu_frame_time: f32,
}

type AppState = Arc<RwLock<SystemStats>>;

pub struct TradingState {
    pub paper_trades: Arc<RwLock<Vec<Trade>>>,
    pub websocket: Arc<ImprovedBinanceWebSocket>,
    pub swing_bot: Arc<RwLock<SwingTradingBot>>,
    pub gpu_accelerator: Arc<RwLock<Option<GpuTradingAccelerator>>>,
    // Concurrency control
    pub bot_operation_lock: Arc<Mutex<()>>, // Ensures atomic bot operations
    pub is_processing_signal: Arc<AtomicBool>, // Prevents concurrent signal processing
    pub last_operation_timestamp: Arc<AtomicU64>, // Tracks last operation time
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new(RwLock::new(SystemStats {
            fps: 0.0,
            cpu_load: 0.0,
            gpu_frame_time: 0.0,
        })))
        .manage(TradingState {
            paper_trades: Arc::new(RwLock::new(Vec::new())),
            websocket: Arc::new(ImprovedBinanceWebSocket::new()),
            swing_bot: Arc::new(RwLock::new(SwingTradingBot::new(LROConfig::default()))),
            gpu_accelerator: Arc::new(RwLock::new(None)), // Initialize as None, will be set up in setup
            // Initialize concurrency control
            bot_operation_lock: Arc::new(Mutex::new(())),
            is_processing_signal: Arc::new(AtomicBool::new(false)),
            last_operation_timestamp: Arc::new(AtomicU64::new(0)),
        })
        .invoke_handler(tauri::generate_handler![
            commands::cpu_stats,
            commands::gpu_stats,
            commands::get_texture_data,
            commands::save_settings,
            commands::load_settings,
            commands::test_connection,
            commands::get_account_info,
            commands::get_klines,
            commands::place_order,
            commands::get_paper_trades,
            commands::change_symbol,
            commands::start_swing_bot,
            commands::stop_swing_bot,
            commands::pause_swing_bot,
            commands::resume_swing_bot,
            commands::update_bot_config,
            commands::get_bot_status,
            commands::get_lro_signals,
            commands::feed_price_data,
            commands::get_all_symbols,
            commands::search_symbols,
            commands::get_market_stats,
            commands::get_popular_symbols,
            commands::trigger_emergency_stop,
            commands::reset_emergency_stop,
            commands::set_account_balance,
            commands::set_max_position_hold_hours,
            commands::get_safety_status,
            commands::reset_daily_loss_tracker,
            commands::update_safety_config,
            commands::get_bot_performance_history,
            commands::analyze_market_conditions,
            commands::get_order_book_depth,
            commands::feed_order_book_data,
            commands::get_market_depth_analysis,
            commands::get_liquidity_levels,
            commands::enable_depth_analysis,
            commands::start_order_book_feed
        ])
        .setup(|app| {
            // Initialize logging system
            let log_file_path = app.path().app_data_dir()
                .ok()
                .map(|dir| dir.join("trading_bot.log"))
                .and_then(|path| path.to_str().map(|s| s.to_string()));
            
            let _ = logging::init_logger(
                logging::LogLevel::Info,
                log_file_path.as_deref(),
                true // console enabled for development
            );
            
            log_info!(logging::LogCategory::Configuration, "Trading bot starting up...");
            
            // Initialization will be handled by commands when needed
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}