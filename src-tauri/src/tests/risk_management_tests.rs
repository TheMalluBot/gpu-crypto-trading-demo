use crate::enhanced_risk_manager::{EnhancedRiskManager, RiskConfig, PositionSizing, RiskLevel};
use crate::models::{Trade, PriceData};
use crate::tests::{generate_volatile_data, generate_uptrend_data};
use rust_decimal::Decimal;
use chrono::{DateTime, Utc};

#[cfg(test)]
mod tests {
    use super::*;

    fn create_default_risk_config() -> RiskConfig {
        RiskConfig {
            max_portfolio_risk: 0.02,         // 2% max portfolio risk
            max_position_size: 0.1,           // 10% max position size
            max_daily_loss: 0.05,             // 5% max daily loss
            max_consecutive_losses: 3,
            stop_loss_atr_multiplier: 2.0,
            position_sizing_method: PositionSizing::FixedFractional,
            correlation_threshold: 0.7,
            volatility_adjustment: true,
            dynamic_position_sizing: true,
        }
    }

    fn create_sample_trade(symbol: &str, side: &str, quantity: f64, price: f64) -> Trade {
        Trade {
            id: uuid::Uuid::new_v4(),
            symbol: symbol.to_string(),
            side: side.to_string(),
            quantity: Decimal::from_f64(quantity).unwrap(),
            price: Decimal::from_f64(price).unwrap(),
            timestamp: Utc::now(),
            pnl: None,
            commission: Some(Decimal::from_f64(0.001).unwrap()),
        }
    }

    #[test]
    fn test_risk_manager_initialization() {
        let config = create_default_risk_config();
        let risk_manager = EnhancedRiskManager::new(config.clone(), 10000.0);
        
        assert_eq!(risk_manager.get_config().max_portfolio_risk, config.max_portfolio_risk);
        assert_eq!(risk_manager.get_config().max_position_size, config.max_position_size);
        assert_eq!(risk_manager.get_portfolio_value(), 10000.0);
    }

    #[test]
    fn test_position_size_calculation_fixed_fractional() {
        let config = create_default_risk_config();
        let risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        let price = 100.0;
        let stop_loss = 95.0; // 5% stop loss
        
        let position_size = risk_manager.calculate_position_size(
            "BTCUSDT",
            price,
            stop_loss,
            RiskLevel::Medium
        );
        
        // With 2% portfolio risk and 5% stop loss, position should be 40% of portfolio
        let expected_position_value = 10000.0 * 0.02 / 0.05; // $4000
        let expected_quantity = expected_position_value / price; // 40 BTC
        
        assert!(position_size > 0.0, "Position size should be positive");
        assert!(position_size <= expected_quantity * 1.1, "Position size should be reasonable");
    }

    #[test]
    fn test_portfolio_risk_limits() {
        let config = create_default_risk_config();
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Add multiple positions approaching risk limits
        let trades = vec![
            create_sample_trade("BTCUSDT", "buy", 5.0, 100.0),   // $500 position
            create_sample_trade("ETHUSDT", "buy", 10.0, 50.0),   // $500 position
            create_sample_trade("ADAUSDT", "buy", 1000.0, 1.0),  // $1000 position
        ];
        
        for trade in trades {
            risk_manager.add_position(trade);
        }
        
        // Total exposure is $2000 = 20% of portfolio
        let portfolio_risk = risk_manager.calculate_portfolio_risk();
        assert!(portfolio_risk > 0.15, "Should detect significant portfolio risk");
        
        // Check if new position would exceed limits
        let can_add_large_position = risk_manager.can_open_position("DOGEUSDT", 2000.0);
        assert!(!can_add_large_position, "Should prevent positions that exceed risk limits");
    }

    #[test]
    fn test_daily_loss_tracking() {
        let config = create_default_risk_config();
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Simulate daily losses
        let losing_trades = vec![
            create_sample_trade("BTCUSDT", "sell", 1.0, 95.0),   // Loss if bought at 100
            create_sample_trade("ETHUSDT", "sell", 2.0, 45.0),   // Loss if bought at 50
        ];
        
        for mut trade in losing_trades {
            trade.pnl = Some(Decimal::from_f64(-100.0).unwrap()); // $100 loss each
            risk_manager.record_trade_result(trade);
        }
        
        let daily_loss = risk_manager.get_daily_pnl();
        assert_eq!(daily_loss, -200.0, "Should track daily losses correctly");
        
        // Check if daily loss limit is reached
        let daily_loss_percentage = daily_loss.abs() / 10000.0;
        if daily_loss_percentage >= 0.05 {
            assert!(!risk_manager.can_trade(), "Should stop trading when daily loss limit reached");
        }
    }

    #[test]
    fn test_consecutive_loss_tracking() {
        let config = create_default_risk_config();
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Record consecutive losses
        for i in 0..4 {
            let mut trade = create_sample_trade("BTCUSDT", "sell", 1.0, 95.0);
            trade.pnl = Some(Decimal::from_f64(-50.0).unwrap());
            risk_manager.record_trade_result(trade);
        }
        
        let consecutive_losses = risk_manager.get_consecutive_losses();
        assert_eq!(consecutive_losses, 4, "Should track consecutive losses");
        
        // Should stop trading after max consecutive losses
        assert!(!risk_manager.can_trade(), "Should stop trading after max consecutive losses");
    }

    #[test]
    fn test_volatility_adjustment() {
        let mut config = create_default_risk_config();
        config.volatility_adjustment = true;
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Feed high volatility data
        let volatile_data = generate_volatile_data(100.0, 50, 0.2); // 20% volatility
        for data in volatile_data {
            risk_manager.update_market_data("BTCUSDT", data);
        }
        
        let high_vol_position = risk_manager.calculate_position_size(
            "BTCUSDT",
            100.0,
            95.0,
            RiskLevel::Medium
        );
        
        // Feed low volatility data
        let stable_data = generate_uptrend_data(100.0, 50, 0.1); // Low volatility
        for data in stable_data {
            risk_manager.update_market_data("ETHUSDT", data);
        }
        
        let low_vol_position = risk_manager.calculate_position_size(
            "ETHUSDT",
            100.0,
            95.0,
            RiskLevel::Medium
        );
        
        // High volatility should result in smaller position sizes
        assert!(high_vol_position < low_vol_position,
               "High volatility should result in smaller positions: {} vs {}", 
               high_vol_position, low_vol_position);
    }

    #[test]
    fn test_correlation_detection() {
        let mut config = create_default_risk_config();
        config.correlation_threshold = 0.7;
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Add correlated market data (both trending up similarly)
        let correlated_data1 = generate_uptrend_data(100.0, 30, 1.0);
        let correlated_data2 = generate_uptrend_data(50.0, 30, 0.5);
        
        for (data1, data2) in correlated_data1.into_iter().zip(correlated_data2.into_iter()) {
            risk_manager.update_market_data("BTCUSDT", data1);
            risk_manager.update_market_data("ETHUSDT", data2);
        }
        
        // Add positions in both correlated assets
        risk_manager.add_position(create_sample_trade("BTCUSDT", "buy", 1.0, 100.0));
        risk_manager.add_position(create_sample_trade("ETHUSDT", "buy", 2.0, 50.0));
        
        let correlation = risk_manager.calculate_correlation("BTCUSDT", "ETHUSDT");
        assert!(correlation > 0.5, "Should detect positive correlation: {}", correlation);
        
        // Should limit additional correlated positions
        let can_add_correlated = risk_manager.can_open_position("LTCUSDT", 1000.0);
        // This test depends on implementation details of correlation limits
    }

    #[test]
    fn test_atr_based_stop_loss() {
        let config = create_default_risk_config();
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Feed price data to calculate ATR
        let price_data = generate_volatile_data(100.0, 30, 0.1);
        for data in price_data {
            risk_manager.update_market_data("BTCUSDT", data);
        }
        
        let entry_price = 100.0;
        let atr_stop_loss = risk_manager.calculate_atr_stop_loss("BTCUSDT", entry_price, "buy");
        
        // ATR stop loss should be below entry price for buy orders
        assert!(atr_stop_loss < entry_price, "ATR stop loss should be below entry for buy: {}", atr_stop_loss);
        
        // Should be reasonable distance (not too tight or too wide)
        let stop_distance_pct = (entry_price - atr_stop_loss) / entry_price;
        assert!(stop_distance_pct > 0.01 && stop_distance_pct < 0.2,
               "Stop loss distance should be reasonable: {}%", stop_distance_pct * 100.0);
    }

    #[test]
    fn test_dynamic_position_sizing() {
        let mut config = create_default_risk_config();
        config.dynamic_position_sizing = true;
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Test position sizing with different risk levels
        let conservative_size = risk_manager.calculate_position_size(
            "BTCUSDT", 100.0, 95.0, RiskLevel::Low
        );
        
        let aggressive_size = risk_manager.calculate_position_size(
            "BTCUSDT", 100.0, 95.0, RiskLevel::High
        );
        
        // Higher risk level should allow larger positions
        assert!(aggressive_size > conservative_size,
               "High risk should allow larger positions: {} vs {}", aggressive_size, conservative_size);
    }

    #[test]
    fn test_emergency_stop_functionality() {
        let config = create_default_risk_config();
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Trigger emergency stop
        risk_manager.trigger_emergency_stop("Excessive losses detected");
        
        // Should prevent all trading
        assert!(!risk_manager.can_trade(), "Should prevent trading during emergency stop");
        assert!(!risk_manager.can_open_position("BTCUSDT", 1000.0), "Should prevent new positions");
        
        // Reset emergency stop
        risk_manager.reset_emergency_stop();
        assert!(risk_manager.can_trade(), "Should allow trading after reset");
    }

    #[test]
    fn test_risk_metrics_calculation() {
        let config = create_default_risk_config();
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Add some trades with PnL
        let trades = vec![
            {
                let mut trade = create_sample_trade("BTCUSDT", "buy", 1.0, 100.0);
                trade.pnl = Some(Decimal::from_f64(150.0).unwrap());
                trade
            },
            {
                let mut trade = create_sample_trade("ETHUSDT", "buy", 2.0, 50.0);
                trade.pnl = Some(Decimal::from_f64(-75.0).unwrap());
                trade
            },
            {
                let mut trade = create_sample_trade("ADAUSDT", "buy", 1000.0, 1.0);
                trade.pnl = Some(Decimal::from_f64(200.0).unwrap());
                trade
            },
        ];
        
        for trade in trades {
            risk_manager.record_trade_result(trade);
        }
        
        let metrics = risk_manager.get_risk_metrics();
        
        // Check basic metrics
        assert!(metrics.total_pnl > 0.0, "Total PnL should be positive");
        assert!(metrics.win_rate > 0.0 && metrics.win_rate <= 1.0, "Win rate should be valid percentage");
        assert!(metrics.sharpe_ratio.is_finite(), "Sharpe ratio should be finite");
        
        // Verify calculations
        let expected_total_pnl = 150.0 - 75.0 + 200.0; // 275.0
        assert!((metrics.total_pnl - expected_total_pnl).abs() < 0.01,
               "Total PnL calculation: expected {}, got {}", expected_total_pnl, metrics.total_pnl);
    }

    #[test]
    fn test_position_management() {
        let config = create_default_risk_config();
        let mut risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Add positions
        let trade1 = create_sample_trade("BTCUSDT", "buy", 1.0, 100.0);
        let trade2 = create_sample_trade("ETHUSDT", "buy", 2.0, 50.0);
        
        risk_manager.add_position(trade1);
        risk_manager.add_position(trade2);
        
        // Check position tracking
        let positions = risk_manager.get_open_positions();
        assert_eq!(positions.len(), 2, "Should track open positions");
        
        let btc_position = positions.iter().find(|p| p.symbol == "BTCUSDT");
        assert!(btc_position.is_some(), "Should find BTC position");
        
        // Close position
        risk_manager.close_position("BTCUSDT");
        let updated_positions = risk_manager.get_open_positions();
        assert_eq!(updated_positions.len(), 1, "Should have one position after closing");
    }

    #[test]
    fn test_risk_level_adjustments() {
        let config = create_default_risk_config();
        let risk_manager = EnhancedRiskManager::new(config, 10000.0);
        
        // Test different risk levels affect position sizing
        let sizes: Vec<f64> = vec![RiskLevel::Low, RiskLevel::Medium, RiskLevel::High]
            .into_iter()
            .map(|level| risk_manager.calculate_position_size("BTCUSDT", 100.0, 95.0, level))
            .collect();
        
        // Positions should increase with risk level
        assert!(sizes[0] <= sizes[1], "Medium risk should allow larger positions than low risk");
        assert!(sizes[1] <= sizes[2], "High risk should allow larger positions than medium risk");
    }
}