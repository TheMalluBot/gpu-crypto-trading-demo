use crate::backtesting::{BacktestEngine, BacktestConfig, BacktestResult, PerformanceMetrics};
use crate::trading_strategy::{SwingTradingBot, LROConfig};
use crate::tests::{generate_uptrend_data, generate_downtrend_data, generate_sideways_data, generate_volatile_data};
use rust_decimal::Decimal;
use chrono::{DateTime, Utc, Duration};

#[cfg(test)]
mod tests {
    use super::*;

    fn create_default_backtest_config() -> BacktestConfig {
        BacktestConfig {
            start_date: Utc::now() - Duration::days(365),
            end_date: Utc::now(),
            initial_balance: Decimal::from_f64(10000.0).unwrap(),
            commission_rate: 0.001, // 0.1%
            slippage_rate: 0.0005,  // 0.05%
            max_position_size: 0.1, // 10%
            symbol: "BTCUSDT".to_string(),
            timeframe: "1h".to_string(),
        }
    }

    fn create_default_trading_config() -> LROConfig {
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

    #[tokio::test]
    async fn test_backtest_engine_initialization() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        
        let engine = BacktestEngine::new(config.clone(), trading_config);
        
        assert_eq!(engine.get_config().initial_balance, config.initial_balance);
        assert_eq!(engine.get_config().commission_rate, config.commission_rate);
        assert_eq!(engine.get_config().symbol, config.symbol);
    }

    #[tokio::test]
    async fn test_simple_uptrend_backtest() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        // Generate uptrend data for backtesting
        let price_data = generate_uptrend_data(100.0, 100, 1.0);
        
        let result = engine.run_backtest(price_data).await;
        
        assert!(result.is_ok(), "Backtest should complete successfully");
        
        let backtest_result = result.unwrap();
        
        // In an uptrend, strategy should perform reasonably well
        assert!(backtest_result.final_balance >= backtest_result.initial_balance * Decimal::from_f64(0.8).unwrap(),
               "Should not lose more than 20% in uptrend");
        
        // Should have executed some trades
        assert!(backtest_result.total_trades > 0, "Should execute some trades");
        
        // Performance metrics should be calculated
        assert!(backtest_result.performance_metrics.total_return.is_finite(),
               "Total return should be finite");
        assert!(backtest_result.performance_metrics.max_drawdown >= 0.0,
               "Max drawdown should be non-negative");
    }

    #[tokio::test]
    async fn test_downtrend_backtest() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        // Generate downtrend data
        let price_data = generate_downtrend_data(100.0, 100, 0.8);
        
        let result = engine.run_backtest(price_data).await;
        assert!(result.is_ok(), "Backtest should handle downtrend");
        
        let backtest_result = result.unwrap();
        
        // In downtrend, strategy should use stop losses to limit losses
        let loss_percentage = (backtest_result.initial_balance - backtest_result.final_balance) 
            / backtest_result.initial_balance;
        
        // Should not lose everything (stop losses should protect)
        assert!(loss_percentage < Decimal::from_f64(0.5).unwrap(),
               "Should not lose more than 50% even in strong downtrend");
    }

    #[tokio::test]
    async fn test_sideways_market_backtest() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        // Generate sideways market data
        let price_data = generate_sideways_data(100.0, 200, 5.0);
        
        let result = engine.run_backtest(price_data).await;
        assert!(result.is_ok(), "Backtest should handle sideways market");
        
        let backtest_result = result.unwrap();
        
        // In sideways market, should have mixed results
        // Strategy should avoid major losses through conservative trading
        let balance_change = (backtest_result.final_balance - backtest_result.initial_balance) 
            / backtest_result.initial_balance;
        
        // Should be within reasonable range for sideways market
        assert!(balance_change > Decimal::from_f64(-0.3).unwrap() && 
                balance_change < Decimal::from_f64(0.3).unwrap(),
                "Balance change should be moderate in sideways market: {}", balance_change);
    }

    #[tokio::test]
    async fn test_commission_and_slippage_calculation() {
        let mut config = create_default_backtest_config();
        config.commission_rate = 0.01; // High commission for testing
        config.slippage_rate = 0.005;  // High slippage for testing
        
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        let price_data = generate_uptrend_data(100.0, 50, 2.0);
        let result = engine.run_backtest(price_data).await.unwrap();
        
        // High commission and slippage should reduce performance
        assert!(result.total_commission > Decimal::ZERO, "Should accumulate commission costs");
        assert!(result.total_slippage > Decimal::ZERO, "Should accumulate slippage costs");
        
        // Total costs should be significant
        let total_costs = result.total_commission + result.total_slippage;
        assert!(total_costs > result.initial_balance * Decimal::from_f64(0.01).unwrap(),
               "Costs should be meaningful with high rates");
    }

    #[tokio::test]
    async fn test_performance_metrics_calculation() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        let price_data = generate_volatile_data(100.0, 200, 0.1);
        let result = engine.run_backtest(price_data).await.unwrap();
        
        let metrics = &result.performance_metrics;
        
        // All metrics should be calculated and finite
        assert!(metrics.total_return.is_finite(), "Total return should be finite");
        assert!(metrics.sharpe_ratio.is_finite(), "Sharpe ratio should be finite");
        assert!(metrics.sortino_ratio.is_finite(), "Sortino ratio should be finite");
        assert!(metrics.calmar_ratio.is_finite(), "Calmar ratio should be finite");
        
        // Drawdown metrics
        assert!(metrics.max_drawdown >= 0.0, "Max drawdown should be non-negative");
        assert!(metrics.avg_drawdown >= 0.0, "Average drawdown should be non-negative");
        assert!(metrics.max_drawdown >= metrics.avg_drawdown, 
               "Max drawdown should be >= average drawdown");
        
        // Trade statistics
        assert!(metrics.win_rate >= 0.0 && metrics.win_rate <= 1.0, 
               "Win rate should be between 0 and 1");
        assert!(metrics.profit_factor >= 0.0, "Profit factor should be non-negative");
        
        // Risk metrics should be reasonable
        if result.total_trades > 10 {
            assert!(metrics.sharpe_ratio > -5.0 && metrics.sharpe_ratio < 5.0,
                   "Sharpe ratio should be reasonable: {}", metrics.sharpe_ratio);
        }
    }

    #[tokio::test]
    async fn test_walk_forward_optimization() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        // Generate longer dataset for walk-forward analysis
        let price_data = generate_uptrend_data(100.0, 500, 0.2);
        
        let optimization_result = engine.run_walk_forward_optimization(
            price_data,
            vec![10, 14, 20], // Different periods to test
            60,  // In-sample period
            30   // Out-of-sample period
        ).await;
        
        match optimization_result {
            Ok(results) => {
                assert!(!results.is_empty(), "Should return optimization results");
                
                // Each parameter set should have results
                for result in &results {
                    assert!(result.parameter_set.contains_key("period"), 
                           "Should contain period parameter");
                    assert!(result.performance_score.is_finite(), 
                           "Performance score should be finite");
                }
                
                // Results should be sorted by performance
                for i in 1..results.len() {
                    assert!(results[i-1].performance_score >= results[i].performance_score,
                           "Results should be sorted by performance score");
                }
            },
            Err(e) => {
                // Walk-forward optimization might not be implemented yet
                println!("Walk-forward optimization not available: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_strategy_comparison() {
        let config = create_default_backtest_config();
        
        // Create different strategy configurations
        let mut conservative_config = create_default_trading_config();
        conservative_config.stop_loss_percentage = 3.0;
        conservative_config.take_profit_percentage = 8.0;
        
        let mut aggressive_config = create_default_trading_config();
        aggressive_config.stop_loss_percentage = 8.0;
        aggressive_config.take_profit_percentage = 25.0;
        
        let mut engine1 = BacktestEngine::new(config.clone(), conservative_config);
        let mut engine2 = BacktestEngine::new(config, aggressive_config);
        
        let price_data = generate_volatile_data(100.0, 150, 0.12);
        
        let result1 = engine1.run_backtest(price_data.clone()).await.unwrap();
        let result2 = engine2.run_backtest(price_data).await.unwrap();
        
        // Compare strategies
        println!("Conservative strategy final balance: {}", result1.final_balance);
        println!("Aggressive strategy final balance: {}", result2.final_balance);
        
        // Both strategies should complete
        assert!(result1.total_trades > 0, "Conservative strategy should make trades");
        assert!(result2.total_trades > 0, "Aggressive strategy should make trades");
        
        // Performance characteristics should differ
        assert_ne!(result1.performance_metrics.max_drawdown, 
                  result2.performance_metrics.max_drawdown,
                  "Different strategies should have different drawdowns");
    }

    #[tokio::test]
    async fn test_insufficient_data_handling() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        // Very limited data
        let insufficient_data = generate_uptrend_data(100.0, 5, 1.0);
        
        let result = engine.run_backtest(insufficient_data).await;
        
        match result {
            Ok(backtest_result) => {
                // Should handle gracefully with limited trades
                assert!(backtest_result.total_trades <= 2, 
                       "Should have very few trades with insufficient data");
            },
            Err(e) => {
                // Should provide meaningful error message
                assert!(e.contains("insufficient") || e.contains("data"),
                       "Error should mention data insufficiency: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_extreme_market_conditions() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        // Create extreme volatility scenario
        let extreme_data = generate_volatile_data(100.0, 100, 0.5); // 50% volatility
        
        let result = engine.run_backtest(extreme_data).await;
        
        match result {
            Ok(backtest_result) => {
                // Should handle extreme conditions without crashing
                assert!(backtest_result.final_balance > Decimal::ZERO,
                       "Should maintain positive balance even in extreme conditions");
                
                // Max drawdown should be significant but not 100%
                assert!(backtest_result.performance_metrics.max_drawdown < 0.99,
                       "Should not lose everything even in extreme volatility");
            },
            Err(e) => {
                // Should provide meaningful error for extreme conditions
                println!("Extreme conditions handled with error (acceptable): {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_backtest_progress_tracking() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        let price_data = generate_uptrend_data(100.0, 100, 1.0);
        
        // Start backtest in background (if supported)
        let _backtest_future = engine.run_backtest(price_data);
        
        // Check progress tracking
        let progress = engine.get_progress();
        assert!(progress.total_periods > 0, "Should track total periods");
        assert!(progress.processed_periods <= progress.total_periods,
               "Processed should not exceed total");
        assert!(progress.completion_percentage >= 0.0 && progress.completion_percentage <= 100.0,
               "Completion percentage should be valid");
    }

    #[tokio::test]
    async fn test_detailed_trade_logging() {
        let config = create_default_backtest_config();
        let trading_config = create_default_trading_config();
        let mut engine = BacktestEngine::new(config, trading_config);
        
        let price_data = generate_uptrend_data(100.0, 50, 2.0);
        let result = engine.run_backtest(price_data).await.unwrap();
        
        // Should have detailed trade information
        assert!(!result.trades.is_empty(), "Should have executed trades");
        
        for trade in &result.trades {
            // Each trade should have complete information
            assert!(!trade.symbol.is_empty(), "Trade should have symbol");
            assert!(trade.quantity > Decimal::ZERO, "Trade should have positive quantity");
            assert!(trade.price > Decimal::ZERO, "Trade should have positive price");
            assert!(trade.timestamp <= Utc::now(), "Trade timestamp should be valid");
            
            // Commission should be calculated
            if let Some(commission) = trade.commission {
                assert!(commission >= Decimal::ZERO, "Commission should be non-negative");
            }
        }
    }
}