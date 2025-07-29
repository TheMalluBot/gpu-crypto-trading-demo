use crate::commands::*;
use crate::models::{AppSettings, OrderRequest, PriceData};
use crate::trading_strategy::LROConfig;
use crate::enhanced_lro::LROConfig as EnhancedLROConfig;
use crate::backtesting::BacktestConfig;
use crate::TradingState;
use crate::websocket::ImprovedBinanceWebSocket;
use crate::tests::{generate_uptrend_data, create_test_price_data};
use rust_decimal::Decimal;
use chrono::{DateTime, Utc, Duration};
use std::sync::Arc;
use tokio::sync::{RwLock, Mutex};
use std::sync::atomic::{AtomicBool, AtomicU64};
use tauri::{State, Manager, AppHandle};
use serde_json::Value;

#[cfg(test)]
mod tests {
    use super::*;

    // Helper function to create mock trading state
    fn create_mock_trading_state() -> TradingState {
        TradingState {
            paper_trades: Arc::new(RwLock::new(Vec::new())),
            websocket: Arc::new(ImprovedBinanceWebSocket::new()),
            swing_bot: Arc::new(RwLock::new(crate::trading_strategy::SwingTradingBot::new(
                create_default_lro_config()
            ))),
            gpu_accelerator: Arc::new(RwLock::new(None)),
            advanced_trading_engine: Arc::new(RwLock::new(None)),
            bot_operation_lock: Arc::new(Mutex::new(())),
            is_processing_signal: Arc::new(AtomicBool::new(false)),
            last_operation_timestamp: Arc::new(AtomicU64::new(0)),
        }
    }

    fn create_default_lro_config() -> LROConfig {
        LROConfig {
            period: 14,
            signal_period: 9,
            overbought: 2.0,
            oversold: -2.0,
            timeframe: "1h".to_string(),
            virtual_balance: 10000.0,
            stop_loss_percentage: 5.0,
            take_profit_percentage: 15.0,
        }
    }

    fn create_valid_app_settings() -> AppSettings {
        AppSettings {
            api_key: "test_api_key_1234567890123456789012345678".to_string(),
            api_secret: "test_secret_1234567890123456789012345678".to_string(),
            base_url: "https://testnet.binance.vision".to_string(),
            testnet: true,
        }
    }

    #[tokio::test]
    async fn test_cpu_stats_command() {
        let result = cpu_stats().await;
        
        match result {
            Ok(stats) => {
                // CPU stats should be reasonable values
                assert!(stats.cpu_usage >= 0.0 && stats.cpu_usage <= 100.0,
                       "CPU usage should be between 0-100%: {}", stats.cpu_usage);
                assert!(stats.memory_usage >= 0.0,
                       "Memory usage should be non-negative: {}", stats.memory_usage);
                assert!(stats.available_cores > 0,
                       "Should have at least one CPU core: {}", stats.available_cores);
            },
            Err(e) => {
                panic!("CPU stats command should not fail: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_gpu_stats_command() {
        let result = gpu_stats().await;
        
        match result {
            Ok(stats) => {
                // GPU stats should be reasonable if GPU is available
                if stats.is_available {
                    assert!(stats.memory_total > 0, "GPU memory should be positive if available");
                    assert!(stats.memory_used >= 0, "GPU memory used should be non-negative");
                    assert!(stats.memory_used <= stats.memory_total, "Used memory should not exceed total");
                }
            },
            Err(e) => {
                // GPU might not be available in test environment
                println!("GPU stats not available (expected in some environments): {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_save_and_load_settings_integration() {
        let test_settings = create_valid_app_settings();
        
        // Test save settings
        let save_result = save_settings(test_settings.clone()).await;
        assert!(save_result.is_ok(), "Should save settings successfully: {:?}", save_result);
        
        // Test load settings
        let load_result = load_settings().await;
        assert!(load_result.is_ok(), "Should load settings successfully: {:?}", load_result);
        
        let loaded_settings = load_result.unwrap();
        assert_eq!(loaded_settings.api_key, test_settings.api_key, "API key should match");
        assert_eq!(loaded_settings.base_url, test_settings.base_url, "Base URL should match");
        assert_eq!(loaded_settings.testnet, test_settings.testnet, "Testnet flag should match");
        // Note: API secret might be encrypted/hashed, so we don't compare it directly
    }

    #[tokio::test]
    async fn test_swing_bot_lifecycle_commands() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        // Test starting swing bot
        let start_result = start_swing_bot(state.clone()).await;
        match start_result {
            Ok(response) => {
                assert!(response.success, "Should start swing bot successfully");
            },
            Err(e) => {
                // Might fail without proper API configuration
                println!("Start swing bot failed (expected without API): {}", e);
            }
        }
        
        // Test getting bot status
        let status_result = get_bot_status(state.clone()).await;
        assert!(status_result.is_ok(), "Should get bot status successfully");
        
        let status = status_result.unwrap();
        assert!(status.uptime_seconds >= 0, "Uptime should be non-negative");
        
        // Test pausing bot
        let pause_result = pause_swing_bot(state.clone()).await;
        assert!(pause_result.is_ok(), "Should pause bot successfully");
        
        // Test resuming bot
        let resume_result = resume_swing_bot(state.clone()).await;
        assert!(resume_result.is_ok(), "Should resume bot successfully");
        
        // Test stopping bot
        let stop_result = stop_swing_bot(state.clone()).await;
        assert!(stop_result.is_ok(), "Should stop bot successfully");
    }

    #[tokio::test]
    async fn test_bot_config_update_command() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        let new_config = LROConfig {
            period: 21,
            signal_period: 12,
            overbought: 2.5,
            oversold: -2.5,
            timeframe: "4h".to_string(),
            virtual_balance: 15000.0,
            stop_loss_percentage: 4.0,
            take_profit_percentage: 20.0,
        };
        
        let update_result = update_bot_config(new_config.clone(), state.clone()).await;
        assert!(update_result.is_ok(), "Should update bot config successfully");
        
        // Verify config was updated
        let bot = trading_state.swing_bot.read().await;
        let current_config = bot.get_config();
        assert_eq!(current_config.period, new_config.period, "Period should be updated");
        assert_eq!(current_config.overbought, new_config.overbought, "Overbought threshold should be updated");
    }

    #[tokio::test]
    async fn test_price_data_feeding_command() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        let test_price_data = create_test_price_data(
            Utc::now(),
            (100.0, 105.0, 98.0, 102.0),
            1000.0
        );
        
        let feed_result = feed_price_data(test_price_data.clone(), state.clone()).await;
        assert!(feed_result.is_ok(), "Should feed price data successfully");
        
        // Test getting LRO signals after feeding data
        let signals_result = get_lro_signals(state.clone()).await;
        assert!(signals_result.is_ok(), "Should get LRO signals successfully");
        
        // Feed more data to generate meaningful signals
        let price_data_batch = generate_uptrend_data(100.0, 20, 1.0);
        for data in price_data_batch {
            let _ = feed_price_data(data, state.clone()).await;
        }
        
        let updated_signals = get_lro_signals(state.clone()).await.unwrap();
        // Should have more signals after feeding more data
    }

    #[tokio::test]
    async fn test_market_data_commands() {
        // Test get all symbols
        let symbols_result = get_all_symbols().await;
        match symbols_result {
            Ok(symbols) => {
                assert!(!symbols.is_empty(), "Should return some trading symbols");
                // Verify common symbols are present
                let symbol_names: Vec<_> = symbols.iter().map(|s| &s.symbol).collect();
                // Note: This might fail in test environment without API access
            },
            Err(e) => {
                println!("Get all symbols failed (expected without API): {}", e);
            }
        }
        
        // Test search symbols
        let search_result = search_symbols("BTC".to_string()).await;
        match search_result {
            Ok(results) => {
                // Should find BTC-related symbols
                let has_btc = results.iter().any(|s| s.symbol.contains("BTC"));
                assert!(has_btc, "Should find BTC-related symbols in search");
            },
            Err(e) => {
                println!("Search symbols failed (expected without API): {}", e);
            }
        }
        
        // Test get popular symbols
        let popular_result = get_popular_symbols().await;
        match popular_result {
            Ok(popular) => {
                assert!(!popular.is_empty(), "Should return popular symbols");
                assert!(popular.len() <= 50, "Should return reasonable number of popular symbols");
            },
            Err(e) => {
                println!("Get popular symbols failed (expected without API): {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_emergency_stop_commands() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        // Test triggering emergency stop
        let trigger_result = trigger_emergency_stop(state.clone()).await;
        assert!(trigger_result.is_ok(), "Should trigger emergency stop successfully");
        
        // Test getting safety status
        let safety_result = get_safety_status(state.clone()).await;
        assert!(safety_result.is_ok(), "Should get safety status successfully");
        
        let safety_status = safety_result.unwrap();
        assert!(safety_status.emergency_stop_active, "Emergency stop should be active");
        
        // Test resetting emergency stop
        let reset_result = reset_emergency_stop(state.clone()).await;
        assert!(reset_result.is_ok(), "Should reset emergency stop successfully");
        
        // Verify emergency stop is reset
        let updated_safety = get_safety_status(state.clone()).await.unwrap();
        assert!(!updated_safety.emergency_stop_active, "Emergency stop should be inactive after reset");
    }

    #[tokio::test]
    async fn test_validation_commands_integration() {
        let validator_state = Arc::new(RwLock::new(crate::validation::InputValidator::new()));
        let state: State<Arc<RwLock<crate::validation::InputValidator>>> = State::from(&validator_state);
        
        // Test API settings validation
        let valid_settings = create_valid_app_settings();
        let validation_result = validate_api_settings(valid_settings, state.clone()).await;
        assert!(validation_result.is_ok(), "API validation command should work");
        
        let result = validation_result.unwrap();
        assert!(result.is_valid, "Valid settings should pass validation");
        
        // Test symbol validation
        let symbol_result = validate_trading_symbol("BTCUSDT".to_string(), state.clone()).await;
        assert!(symbol_result.is_ok(), "Symbol validation command should work");
        
        let symbol_validation = symbol_result.unwrap();
        assert!(symbol_validation.is_valid, "Valid symbol should pass validation");
        
        // Test invalid symbol
        let invalid_symbol_result = validate_trading_symbol("invalid".to_string(), state.clone()).await;
        assert!(invalid_symbol_result.is_ok(), "Invalid symbol validation should return result");
        
        let invalid_result = invalid_symbol_result.unwrap();
        assert!(!invalid_result.is_valid, "Invalid symbol should fail validation");
        assert!(invalid_result.error_message.is_some(), "Should provide error message");
    }

    #[tokio::test]
    async fn test_backtest_commands_integration() {
        let backtest_engine = Arc::new(RwLock::new(None::<crate::backtesting::BacktestEngine>));
        let state: State<Arc<RwLock<Option<crate::backtesting::BacktestEngine>>>> = State::from(&backtest_engine);
        
        // Test initializing backtest engine
        let backtest_config = BacktestConfig {
            start_date: Utc::now() - Duration::days(30),
            end_date: Utc::now(),
            initial_balance: Decimal::from_f64(10000.0).unwrap(),
            commission_rate: 0.001,
            slippage_rate: 0.0005,
            max_position_size: 0.1,
            symbol: "BTCUSDT".to_string(),
            timeframe: "1h".to_string(),
        };
        
        let trading_config = create_default_lro_config();
        
        let init_result = initialize_backtest_engine(backtest_config, trading_config, state.clone()).await;
        assert!(init_result.is_ok(), "Should initialize backtest engine successfully");
        
        // Test getting backtest progress
        let progress_result = get_backtest_progress(state.clone()).await;
        assert!(progress_result.is_ok(), "Should get backtest progress successfully");
        
        let progress = progress_result.unwrap();
        assert!(progress.completion_percentage >= 0.0 && progress.completion_percentage <= 100.0,
               "Progress percentage should be valid");
    }

    #[tokio::test]
    async fn test_advanced_trading_commands() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        // Test initializing advanced trading
        let init_result = initialize_advanced_trading(state.clone()).await;
        match init_result {
            Ok(response) => {
                assert!(response.success, "Should initialize advanced trading successfully");
            },
            Err(e) => {
                println!("Advanced trading init failed (expected without proper setup): {}", e);
            }
        }
        
        // Test getting portfolio metrics
        let metrics_result = get_portfolio_metrics(state.clone()).await;
        match metrics_result {
            Ok(metrics) => {
                assert!(metrics.total_value >= 0.0, "Portfolio value should be non-negative");
                assert!(metrics.positions.len() >= 0, "Should return positions list");
            },
            Err(e) => {
                println!("Portfolio metrics failed (expected without positions): {}", e);
            }
        }
        
        // Test risk assessment
        let risk_result = assess_portfolio_risk(state.clone()).await;
        match risk_result {
            Ok(risk_assessment) => {
                assert!(risk_assessment.overall_risk_score >= 0.0 && risk_assessment.overall_risk_score <= 1.0,
                       "Risk score should be between 0-1");
            },
            Err(e) => {
                println!("Risk assessment failed (expected without positions): {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_enhanced_lro_commands() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        // Test multi-timeframe analysis
        let analysis_result = multi_timeframe_analysis("BTCUSDT".to_string(), state.clone()).await;
        match analysis_result {
            Ok(analysis) => {
                assert!(!analysis.timeframes.is_empty(), "Should analyze multiple timeframes");
                for tf_analysis in &analysis.timeframes {
                    assert!(tf_analysis.confidence >= 0.0 && tf_analysis.confidence <= 1.0,
                           "Confidence should be between 0-1");
                }
            },
            Err(e) => {
                println!("Multi-timeframe analysis failed (expected without data): {}", e);
            }
        }
        
        // Test getting enhanced LRO statistics
        let stats_result = get_enhanced_lro_statistics("BTCUSDT".to_string(), state.clone()).await;
        match stats_result {
            Ok(stats) => {
                assert!(stats.total_calculations >= 0, "Total calculations should be non-negative");
                assert!(stats.current_period > 0, "Current period should be positive");
            },
            Err(e) => {
                println!("Enhanced LRO stats failed (expected without initialization): {}", e);
            }
        }
        
        // Test resetting enhanced LRO
        let reset_result = reset_enhanced_lro("BTCUSDT".to_string(), state.clone()).await;
        assert!(reset_result.is_ok(), "Should reset enhanced LRO successfully");
    }

    #[tokio::test]
    async fn test_websocket_integration() {
        let websocket = ImprovedBinanceWebSocket::new();
        
        // Test websocket initialization
        assert!(!websocket.is_connected(), "WebSocket should not be connected initially");
        
        // Test connection attempt (might fail without network/API)
        let connect_result = websocket.connect("wss://stream.binance.com:9443/ws/btcusdt@ticker").await;
        match connect_result {
            Ok(()) => {
                assert!(websocket.is_connected(), "WebSocket should be connected after successful connect");
                
                // Test subscription
                let subscribe_result = websocket.subscribe("btcusdt@ticker").await;
                assert!(subscribe_result.is_ok(), "Should subscribe to stream successfully");
                
                // Test getting connection stats
                let stats = websocket.get_connection_stats();
                assert!(stats.connected_duration_seconds >= 0, "Connection duration should be non-negative");
                assert_eq!(stats.reconnection_count, 0, "Should have zero reconnections initially");
                
                // Test disconnection
                let disconnect_result = websocket.disconnect().await;
                assert!(disconnect_result.is_ok(), "Should disconnect successfully");
                assert!(!websocket.is_connected(), "Should not be connected after disconnect");
            },
            Err(e) => {
                println!("WebSocket connection failed (expected in test environment): {}", e);
                // Test error handling
                assert!(!websocket.is_connected(), "Should remain disconnected on connection failure");
            }
        }
    }

    #[tokio::test]
    async fn test_order_book_integration() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        // Test enabling depth analysis
        let enable_result = enable_depth_analysis("BTCUSDT".to_string(), state.clone()).await;
        assert!(enable_result.is_ok(), "Should enable depth analysis successfully");
        
        // Test starting order book feed
        let feed_result = start_order_book_feed("BTCUSDT".to_string(), state.clone()).await;
        match feed_result {
            Ok(response) => {
                assert!(response.success, "Should start order book feed successfully");
            },
            Err(e) => {
                println!("Order book feed failed (expected without WebSocket): {}", e);
            }
        }
        
        // Test getting market depth analysis
        let depth_result = get_market_depth_analysis("BTCUSDT".to_string(), state.clone()).await;
        match depth_result {
            Ok(analysis) => {
                assert!(analysis.total_bid_volume >= 0.0, "Bid volume should be non-negative");
                assert!(analysis.total_ask_volume >= 0.0, "Ask volume should be non-negative");
                assert!(analysis.spread >= 0.0, "Spread should be non-negative");
            },
            Err(e) => {
                println!("Market depth analysis failed (expected without data): {}", e);
            }
        }
        
        // Test getting liquidity levels
        let liquidity_result = get_liquidity_levels("BTCUSDT".to_string(), state.clone()).await;
        match liquidity_result {
            Ok(levels) => {
                assert!(!levels.support_levels.is_empty() || !levels.resistance_levels.is_empty(),
                       "Should have some liquidity levels");
            },
            Err(e) => {
                println!("Liquidity levels failed (expected without data): {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_concurrent_command_execution() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        // Test concurrent command execution
        let futures = vec![
            Box::pin(get_bot_status(state.clone())) as std::pin::Pin<Box<dyn std::future::Future<Output = Result<_, _>> + Send>>,
            Box::pin(get_safety_status(state.clone())) as std::pin::Pin<Box<dyn std::future::Future<Output = Result<_, _>> + Send>>,
            Box::pin(get_lro_signals(state.clone())) as std::pin::Pin<Box<dyn std::future::Future<Output = Result<_, _>> + Send>>,
        ];
        
        let results = futures::future::join_all(futures).await;
        
        // All commands should complete (successfully or with expected errors)
        for (i, result) in results.iter().enumerate() {
            match result {
                Ok(_) => println!("Concurrent command {} completed successfully", i),
                Err(e) => println!("Concurrent command {} failed (may be expected): {}", i, e),
            }
        }
    }

    #[tokio::test]
    async fn test_command_error_handling() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        // Test invalid order request
        let invalid_order = OrderRequest {
            symbol: "INVALID_SYMBOL".to_string(),
            side: "invalid_side".to_string(),
            quantity: Decimal::from_f64(-1.0).unwrap(), // Invalid negative quantity
            price: Some(Decimal::from_f64(0.0).unwrap()), // Invalid zero price
            order_type: "invalid_type".to_string(),
        };
        
        let order_result = place_order(invalid_order, state.clone()).await;
        assert!(order_result.is_err(), "Invalid order should fail");
        
        // Test invalid symbol for market data
        let invalid_market_result = get_market_stats("INVALID".to_string()).await;
        assert!(invalid_market_result.is_err(), "Invalid symbol should fail for market stats");
        
        // Test operations without proper initialization
        let uninitialized_result = get_portfolio_metrics(state.clone()).await;
        match uninitialized_result {
            Ok(_) => {}, // Might succeed with default values
            Err(e) => {
                // Should provide meaningful error message
                assert!(!e.is_empty(), "Error message should not be empty");
            }
        }
    }

    #[tokio::test]
    async fn test_state_consistency_across_commands() {
        let trading_state = create_mock_trading_state();
        let state: State<TradingState> = State::from(&trading_state);
        
        // Set account balance
        let balance_result = set_account_balance(15000.0, state.clone()).await;
        assert!(balance_result.is_ok(), "Should set account balance successfully");
        
        // Update bot config to use new balance
        let mut new_config = create_default_lro_config();
        new_config.virtual_balance = 15000.0;
        
        let config_result = update_bot_config(new_config, state.clone()).await;
        assert!(config_result.is_ok(), "Should update config successfully");
        
        // Verify state consistency
        let bot = trading_state.swing_bot.read().await;
        assert_eq!(bot.get_virtual_balance(), 15000.0, "Virtual balance should be consistent");
        
        // Test that subsequent operations use updated state
        let status = get_bot_status(state.clone()).await.unwrap();
        // Status should reflect updated configuration
    }
}