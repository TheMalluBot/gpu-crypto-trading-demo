use tauri::Manager;
use std::sync::Arc;
use tokio::sync::{RwLock, Mutex};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

mod gpu_renderer;
mod cpu_worker;
mod commands;
mod models;
mod websocket;
mod binance_client;
mod trading_strategy;

use gpu_renderer::GpuRenderer;
use cpu_worker::CpuWorker;
use websocket::BinanceWebSocket;
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
    pub websocket: Arc<BinanceWebSocket>,
    pub swing_bot: Arc<RwLock<SwingTradingBot>>,
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
            websocket: Arc::new(BinanceWebSocket::new()),
            swing_bot: Arc::new(RwLock::new(SwingTradingBot::new(LROConfig::default()))),
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
            commands::update_bot_config,
            commands::get_bot_status,
            commands::get_lro_signals,
            commands::feed_price_data,
            commands::simulate_market_data,
            commands::get_all_symbols,
            commands::search_symbols,
            commands::get_market_stats,
            commands::get_popular_symbols
        ])
        .setup(|app| {
            let app_handle = app.handle();
            let state = app_handle.state::<AppState>();
            let trading_state = app_handle.state::<TradingState>();
            
            // Spawn GPU renderer thread (keep for background animation)
            let gpu_state = state.clone();
            let gpu_app_handle = app_handle.clone();
            tokio::spawn(async move {
                let mut renderer = GpuRenderer::new().await;
                loop {
                    let frame_time = renderer.render_frame().await;
                    
                    // Update GPU stats
                    {
                        let mut stats = gpu_state.write().await;
                        stats.gpu_frame_time = frame_time;
                        stats.fps = 1000.0 / frame_time;
                    }
                    
                    // Emit stats to frontend
                    let stats = gpu_state.read().await;
                    let _ = gpu_app_handle.emit_all("stats-update", &*stats);
                    
                    tokio::time::sleep(tokio::time::Duration::from_millis(16)).await;
                }
            });
            
            // Spawn CPU worker thread
            let cpu_state = state.clone();
            let cpu_app_handle = app_handle.clone();
            tokio::spawn(async move {
                let mut worker = CpuWorker::new();
                loop {
                    let cpu_load = worker.generate_samples().await;
                    
                    // Update CPU stats
                    {
                        let mut stats = cpu_state.write().await;
                        stats.cpu_load = cpu_load;
                    }
                    
                    // Emit stats to frontend
                    let stats = cpu_state.read().await;
                    let _ = cpu_app_handle.emit_all("stats-update", &*stats);
                    
                    tokio::time::sleep(tokio::time::Duration::from_millis(16)).await;
                }
            });
            
            // Initialize WebSocket connection for price feeds
            let ws_handle = app_handle.clone();
            let websocket = trading_state.websocket.clone();
            tokio::spawn(async move {
                if let Err(e) = websocket.connect(ws_handle).await {
                    eprintln!("WebSocket connection failed: {}", e);
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}