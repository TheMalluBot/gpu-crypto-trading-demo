use crate::trading_strategy::{SwingTradingBot, LROConfig, TradingSignal};
use crate::models::PriceData;
use crate::tests::{generate_uptrend_data, generate_downtrend_data, generate_sideways_data};
use rust_decimal::Decimal;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_default_config() -> LROConfig {
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

    #[test]
    fn test_swing_trading_bot_initialization() {
        let config = create_default_config();
        let bot = SwingTradingBot::new(config.clone());
        
        assert_eq!(bot.get_config().period, config.period);
        assert_eq!(bot.get_config().signal_period, config.signal_period);
        assert_eq!(bot.get_config().virtual_balance, config.virtual_balance);
    }

    #[test]
    fn test_lro_calculation_with_uptrend() {
        let config = create_default_config();
        let mut bot = SwingTradingBot::new(config);
        
        // Generate uptrend data
        let price_data = generate_uptrend_data(100.0, 20, 1.0);
        
        for data in price_data {
            bot.feed_price_data(data);
        }
        
        // In an uptrend, LRO should eventually become positive
        let signals = bot.get_lro_signals();
        assert!(!signals.is_empty(), "Should have generated signals");
        
        // Check that we have some positive LRO values in uptrend
        let has_positive_lro = signals.iter().any(|s| s.lro_value > 0.0);
        assert!(has_positive_lro, "Should have positive LRO in uptrend");
    }

    #[test]
    fn test_lro_calculation_with_downtrend() {
        let config = create_default_config();
        let mut bot = SwingTradingBot::new(config);
        
        // Generate downtrend data
        let price_data = generate_downtrend_data(100.0, 20, 1.0);
        
        for data in price_data {
            bot.feed_price_data(data);
        }
        
        // In a downtrend, LRO should eventually become negative
        let signals = bot.get_lro_signals();
        assert!(!signals.is_empty(), "Should have generated signals");
        
        // Check that we have some negative LRO values in downtrend
        let has_negative_lro = signals.iter().any(|s| s.lro_value < 0.0);
        assert!(has_negative_lro, "Should have negative LRO in downtrend");
    }

    #[test]
    fn test_trading_signal_generation_buy() {
        let config = create_default_config();
        let mut bot = SwingTradingBot::new(config);
        
        // Create oversold condition (LRO below oversold threshold)
        let price_data = generate_downtrend_data(100.0, 15, 2.0);
        for data in price_data {
            bot.feed_price_data(data);
        }
        
        // Then create recovery to trigger buy signal
        let recovery_data = generate_uptrend_data(85.0, 5, 1.5);
        for data in recovery_data {
            bot.feed_price_data(data);
        }
        
        let signals = bot.get_lro_signals();
        let buy_signals: Vec<_> = signals.iter().filter(|s| matches!(s.signal, TradingSignal::Buy)).collect();
        
        // Should have at least one buy signal when recovering from oversold
        assert!(!buy_signals.is_empty(), "Should generate buy signals when recovering from oversold");
    }

    #[test]
    fn test_trading_signal_generation_sell() {
        let config = create_default_config();
        let mut bot = SwingTradingBot::new(config);
        
        // Create overbought condition (LRO above overbought threshold)
        let price_data = generate_uptrend_data(100.0, 15, 2.0);
        for data in price_data {
            bot.feed_price_data(data);
        }
        
        // Then create decline to trigger sell signal
        let decline_data = generate_downtrend_data(130.0, 5, 1.5);
        for data in decline_data {
            bot.feed_price_data(data);
        }
        
        let signals = bot.get_lro_signals();
        let sell_signals: Vec<_> = signals.iter().filter(|s| matches!(s.signal, TradingSignal::Sell)).collect();
        
        // Should have at least one sell signal when declining from overbought
        assert!(!sell_signals.is_empty(), "Should generate sell signals when declining from overbought");
    }

    #[test]
    fn test_sideways_market_hold_signals() {
        let config = create_default_config();
        let mut bot = SwingTradingBot::new(config);
        
        // Generate sideways market data
        let price_data = generate_sideways_data(100.0, 20, 2.0);
        
        for data in price_data {
            bot.feed_price_data(data);
        }
        
        let signals = bot.get_lro_signals();
        let hold_signals: Vec<_> = signals.iter().filter(|s| matches!(s.signal, TradingSignal::Hold)).collect();
        
        // In sideways market, should have significant hold signals
        let hold_percentage = (hold_signals.len() as f64 / signals.len() as f64) * 100.0;
        assert!(hold_percentage > 30.0, "Should have substantial hold signals in sideways market, got {}%", hold_percentage);
    }

    #[test]
    fn test_config_update() {
        let initial_config = create_default_config();
        let mut bot = SwingTradingBot::new(initial_config);
        
        let mut new_config = create_default_config();
        new_config.period = 21;
        new_config.overbought = 2.5;
        new_config.oversold = -2.5;
        
        bot.update_config(new_config.clone());
        
        assert_eq!(bot.get_config().period, 21);
        assert_eq!(bot.get_config().overbought, 2.5);
        assert_eq!(bot.get_config().oversold, -2.5);
    }

    #[test]
    fn test_virtual_balance_management() {
        let config = create_default_config();
        let bot = SwingTradingBot::new(config);
        
        // Test initial virtual balance
        assert_eq!(bot.get_virtual_balance(), 10000.0);
        
        // Test balance update
        bot.update_virtual_balance(15000.0);
        assert_eq!(bot.get_virtual_balance(), 15000.0);
    }

    #[test]
    fn test_signal_confidence_calculation() {
        let config = create_default_config();
        let mut bot = SwingTradingBot::new(config);
        
        // Generate strong trend data for high confidence signals
        let strong_trend_data = generate_uptrend_data(100.0, 25, 3.0);
        
        for data in strong_trend_data {
            bot.feed_price_data(data);
        }
        
        let signals = bot.get_lro_signals();
        let high_confidence_signals: Vec<_> = signals.iter().filter(|s| s.confidence > 0.7).collect();
        
        // Strong trends should generate high confidence signals
        assert!(!high_confidence_signals.is_empty(), "Strong trends should generate high confidence signals");
    }

    #[test]
    fn test_risk_management_integration() {
        let mut config = create_default_config();
        config.stop_loss_percentage = 3.0;
        config.take_profit_percentage = 10.0;
        
        let bot = SwingTradingBot::new(config);
        
        // Test that risk management parameters are properly set
        assert_eq!(bot.get_config().stop_loss_percentage, 3.0);
        assert_eq!(bot.get_config().take_profit_percentage, 10.0);
    }

    #[test]
    fn test_insufficient_data_handling() {
        let config = create_default_config();
        let mut bot = SwingTradingBot::new(config);
        
        // Feed only a few data points (insufficient for LRO calculation)
        let minimal_data = generate_uptrend_data(100.0, 3, 1.0);
        
        for data in minimal_data {
            bot.feed_price_data(data);
        }
        
        let signals = bot.get_lro_signals();
        
        // Should handle insufficient data gracefully
        // Either no signals or appropriate hold signals
        if !signals.is_empty() {
            let all_hold = signals.iter().all(|s| matches!(s.signal, TradingSignal::Hold));
            assert!(all_hold, "With insufficient data, should only generate hold signals");
        }
    }

    #[test]
    fn test_price_data_validation() {
        let config = create_default_config();
        let mut bot = SwingTradingBot::new(config);
        
        // Create invalid price data (high < low)
        let invalid_data = PriceData {
            timestamp: chrono::Utc::now(),
            open: Decimal::from_f64(100.0).unwrap(),
            high: Decimal::from_f64(95.0).unwrap(),  // High < Low (invalid)
            low: Decimal::from_f64(98.0).unwrap(),
            close: Decimal::from_f64(97.0).unwrap(),
            volume: Decimal::from_f64(1000.0).unwrap(),
        };
        
        // Bot should handle invalid data gracefully without panicking
        bot.feed_price_data(invalid_data);
        
        // Should still be able to get signals (may be empty or hold signals)
        let signals = bot.get_lro_signals();
        // Just ensure it doesn't panic - specific behavior depends on implementation
        assert!(signals.len() <= 1000); // Reasonable upper bound
    }
}