use crate::validation::InputValidator;
use crate::models::{AppSettings, OrderRequest, PriceData};
use crate::trading_strategy::LROConfig as TradingLROConfig;
use crate::enhanced_lro::LROConfig as EnhancedLROConfig;
use crate::backtesting::BacktestConfig;
use rust_decimal::Decimal;
use chrono::{DateTime, Utc, Duration};

#[cfg(test)]
mod tests {
    use super::*;

    fn create_valid_app_settings() -> AppSettings {
        AppSettings {
            api_key: "abcdef123456789012345678901234567890".to_string(), // 36 chars
            api_secret: "SECRET123456789012345678901234567890".to_string(), // 36 chars
            base_url: "https://api.binance.com".to_string(),
            testnet: false,
        }
    }

    fn create_valid_order_request() -> OrderRequest {
        OrderRequest {
            symbol: "BTCUSDT".to_string(),
            side: "buy".to_string(),
            quantity: Decimal::from_f64(0.001).unwrap(),
            price: Some(Decimal::from_f64(50000.0).unwrap()),
            order_type: "limit".to_string(),
        }
    }

    fn create_valid_price_data() -> PriceData {
        PriceData {
            timestamp: Utc::now(),
            open: Decimal::from_f64(100.0).unwrap(),
            high: Decimal::from_f64(105.0).unwrap(),
            low: Decimal::from_f64(98.0).unwrap(),
            close: Decimal::from_f64(102.0).unwrap(),
            volume: Decimal::from_f64(1000.0).unwrap(),
        }
    }

    #[test]
    fn test_validator_initialization() {
        let validator = InputValidator::new();
        
        // Should initialize with valid intervals
        assert!(validator.validate_interval("1h").is_ok(), "Should accept valid interval");
        assert!(validator.validate_interval("1d").is_ok(), "Should accept valid interval");
        assert!(validator.validate_interval("invalid").is_err(), "Should reject invalid interval");
    }

    #[test]
    fn test_api_settings_validation_success() {
        let validator = InputValidator::new();
        let valid_settings = create_valid_app_settings();
        
        let result = validator.validate_api_settings(&valid_settings);
        assert!(result.is_ok(), "Valid API settings should pass validation");
    }

    #[test]
    fn test_api_settings_validation_short_key() {
        let validator = InputValidator::new();
        let mut invalid_settings = create_valid_app_settings();
        invalid_settings.api_key = "short".to_string();
        
        let result = validator.validate_api_settings(&invalid_settings);
        assert!(result.is_err(), "Short API key should fail validation");
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("too short"), "Error should mention length");
    }

    #[test]
    fn test_api_settings_validation_invalid_characters() {
        let validator = InputValidator::new();
        let mut invalid_settings = create_valid_app_settings();
        invalid_settings.api_key = "invalid-key-with-special-chars!@#".to_string();
        
        let result = validator.validate_api_settings(&invalid_settings);
        assert!(result.is_err(), "API key with special characters should fail");
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("invalid characters"), "Error should mention invalid characters");
    }

    #[test]
    fn test_api_settings_validation_invalid_url() {
        let validator = InputValidator::new();
        let mut invalid_settings = create_valid_app_settings();
        invalid_settings.base_url = "not-a-valid-url".to_string();
        
        let result = validator.validate_api_settings(&invalid_settings);
        assert!(result.is_err(), "Invalid URL should fail validation");
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("Invalid base URL"), "Error should mention URL format");
    }

    #[test]
    fn test_symbol_validation_success() {
        let validator = InputValidator::new();
        
        let valid_symbols = vec!["BTCUSDT", "ETHUSDT", "ADAUSDT", "XRP"];
        
        for symbol in valid_symbols {
            let result = validator.validate_symbol(symbol);
            assert!(result.is_ok(), "Valid symbol {} should pass validation", symbol);
        }
    }

    #[test]
    fn test_symbol_validation_failures() {
        let validator = InputValidator::new();
        
        let invalid_symbols = vec![
            ("", "empty symbol"),
            ("BT", "too short"),
            ("btcusdt", "lowercase"),
            ("BTC-USDT", "special characters"),
            ("VERY_LONG_SYMBOL_NAME_EXCEEDING_LIMITS", "too long"),
        ];
        
        for (symbol, reason) in invalid_symbols {
            let result = validator.validate_symbol(symbol);
            assert!(result.is_err(), "Invalid symbol '{}' should fail validation ({})", symbol, reason);
        }
    }

    #[test]
    fn test_kline_interval_validation() {
        let validator = InputValidator::new();
        
        let valid_intervals = vec!["1m", "5m", "15m", "1h", "4h", "1d", "1w"];
        let invalid_intervals = vec!["2m", "7h", "invalid", ""];
        
        for interval in valid_intervals {
            let result = validator.validate_interval(interval);
            assert!(result.is_ok(), "Valid interval {} should pass", interval);
        }
        
        for interval in invalid_intervals {
            let result = validator.validate_interval(interval);
            assert!(result.is_err(), "Invalid interval {} should fail", interval);
        }
    }

    #[test]
    fn test_kline_limit_validation() {
        let validator = InputValidator::new();
        
        // Valid limits
        assert!(validator.validate_kline_limit(1).is_ok(), "Limit 1 should be valid");
        assert!(validator.validate_kline_limit(500).is_ok(), "Limit 500 should be valid");
        assert!(validator.validate_kline_limit(1000).is_ok(), "Limit 1000 should be valid");
        
        // Invalid limits
        assert!(validator.validate_kline_limit(0).is_err(), "Limit 0 should be invalid");
        assert!(validator.validate_kline_limit(1001).is_err(), "Limit 1001 should be invalid");
    }

    #[test]
    fn test_order_validation_success() {
        let validator = InputValidator::new();
        let valid_order = create_valid_order_request();
        
        let result = validator.validate_order(&valid_order);
        assert!(result.is_ok(), "Valid order should pass validation");
    }

    #[test]
    fn test_order_validation_negative_quantity() {
        let validator = InputValidator::new();
        let mut invalid_order = create_valid_order_request();
        invalid_order.quantity = Decimal::from_f64(-1.0).unwrap();
        
        let result = validator.validate_order(&invalid_order);
        assert!(result.is_err(), "Negative quantity should fail validation");
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("greater than zero"), "Error should mention positive quantity");
    }

    #[test]
    fn test_order_validation_excessive_precision() {
        let validator = InputValidator::new();
        let mut invalid_order = create_valid_order_request();
        // 9 decimal places (too many)
        invalid_order.quantity = Decimal::from_str("0.123456789").unwrap();
        
        let result = validator.validate_order(&invalid_order);
        assert!(result.is_err(), "Excessive precision should fail validation");
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("8 decimal places"), "Error should mention decimal places limit");
    }

    #[test]
    fn test_enhanced_lro_config_validation() {
        let validator = InputValidator::new();
        
        let valid_config = EnhancedLROConfig {
            base_period: 20,
            min_period: 10,
            max_period: 50,
            overbought_threshold: 2.0,
            oversold_threshold: -2.0,
            signal_smoothing: 5,
            volume_weighting: true,
            multi_timeframe: true,
            divergence_detection: true,
            adaptive_periods: true,
        };
        
        let result = validator.validate_enhanced_lro_config(&valid_config);
        assert!(result.is_ok(), "Valid enhanced LRO config should pass");
    }

    #[test]
    fn test_enhanced_lro_config_invalid_periods() {
        let validator = InputValidator::new();
        
        let mut invalid_config = EnhancedLROConfig {
            base_period: 20,
            min_period: 50,  // Greater than max_period
            max_period: 30,
            overbought_threshold: 2.0,
            oversold_threshold: -2.0,
            signal_smoothing: 5,
            volume_weighting: true,
            multi_timeframe: true,
            divergence_detection: true,
            adaptive_periods: true,
        };
        
        let result = validator.validate_enhanced_lro_config(&invalid_config);
        assert!(result.is_err(), "Min period > max period should fail");
        
        // Test extreme values
        invalid_config.min_period = 1;  // Too small
        invalid_config.max_period = 600; // Too large
        let result = validator.validate_enhanced_lro_config(&invalid_config);
        assert!(result.is_err(), "Extreme period values should fail");
    }

    #[test]
    fn test_enhanced_lro_config_invalid_thresholds() {
        let validator = InputValidator::new();
        
        let invalid_config = EnhancedLROConfig {
            base_period: 20,
            min_period: 10,
            max_period: 50,
            overbought_threshold: -1.0,  // Should be positive
            oversold_threshold: 1.0,     // Should be negative
            signal_smoothing: 5,
            volume_weighting: true,
            multi_timeframe: true,
            divergence_detection: true,
            adaptive_periods: true,
        };
        
        let result = validator.validate_enhanced_lro_config(&invalid_config);
        assert!(result.is_err(), "Invalid thresholds should fail validation");
    }

    #[test]
    fn test_backtest_config_validation() {
        let validator = InputValidator::new();
        
        let valid_config = BacktestConfig {
            start_date: Utc::now() - Duration::days(30),
            end_date: Utc::now(),
            initial_balance: Decimal::from_f64(10000.0).unwrap(),
            commission_rate: 0.001,
            slippage_rate: 0.0005,
            max_position_size: 0.1,
            symbol: "BTCUSDT".to_string(),
            timeframe: "1h".to_string(),
        };
        
        let result = validator.validate_backtest_config(&valid_config);
        assert!(result.is_ok(), "Valid backtest config should pass");
    }

    #[test]
    fn test_backtest_config_invalid_dates() {
        let validator = InputValidator::new();
        
        let invalid_config = BacktestConfig {
            start_date: Utc::now(),
            end_date: Utc::now() - Duration::days(30), // End before start
            initial_balance: Decimal::from_f64(10000.0).unwrap(),
            commission_rate: 0.001,
            slippage_rate: 0.0005,
            max_position_size: 0.1,
            symbol: "BTCUSDT".to_string(),
            timeframe: "1h".to_string(),
        };
        
        let result = validator.validate_backtest_config(&invalid_config);
        assert!(result.is_err(), "End date before start date should fail");
    }

    #[test]
    fn test_backtest_config_excessive_duration() {
        let validator = InputValidator::new();
        
        let invalid_config = BacktestConfig {
            start_date: Utc::now() - Duration::days(365 * 6), // 6 years (too long)
            end_date: Utc::now(),
            initial_balance: Decimal::from_f64(10000.0).unwrap(),
            commission_rate: 0.001,
            slippage_rate: 0.0005,
            max_position_size: 0.1,
            symbol: "BTCUSDT".to_string(),
            timeframe: "1h".to_string(),
        };
        
        let result = validator.validate_backtest_config(&invalid_config);
        assert!(result.is_err(), "Excessive duration should fail validation");
    }

    #[test]
    fn test_trading_config_validation() {
        let validator = InputValidator::new();
        
        let valid_config = TradingLROConfig {
            period: 14,
            signal_period: 9,
            overbought: 2.0,
            oversold: -2.0,
            timeframe: "1h".to_string(),
            virtual_balance: 10000.0,
            stop_loss_percentage: 5.0,
            take_profit_percentage: 15.0,
        };
        
        let result = validator.validate_trading_config(&valid_config);
        assert!(result.is_ok(), "Valid trading config should pass");
    }

    #[test]
    fn test_price_data_validation_success() {
        let validator = InputValidator::new();
        let valid_data = create_valid_price_data();
        
        let result = validator.validate_price_data(&valid_data);
        assert!(result.is_ok(), "Valid price data should pass validation");
    }

    #[test]
    fn test_price_data_validation_ohlc_relationships() {
        let validator = InputValidator::new();
        
        // High < Low (invalid)
        let mut invalid_data = create_valid_price_data();
        invalid_data.high = Decimal::from_f64(95.0).unwrap();
        invalid_data.low = Decimal::from_f64(100.0).unwrap();
        
        let result = validator.validate_price_data(&invalid_data);
        assert!(result.is_err(), "High < Low should fail validation");
        
        // Open outside High-Low range
        let mut invalid_data = create_valid_price_data();
        invalid_data.open = Decimal::from_f64(110.0).unwrap(); // Above high
        
        let result = validator.validate_price_data(&invalid_data);
        assert!(result.is_err(), "Open above high should fail validation");
        
        // Close outside High-Low range
        let mut invalid_data = create_valid_price_data();
        invalid_data.close = Decimal::from_f64(90.0).unwrap(); // Below low
        
        let result = validator.validate_price_data(&invalid_data);
        assert!(result.is_err(), "Close below low should fail validation");
    }

    #[test]
    fn test_price_data_validation_negative_values() {
        let validator = InputValidator::new();
        
        // Negative volume
        let mut invalid_data = create_valid_price_data();
        invalid_data.volume = Decimal::from_f64(-100.0).unwrap();
        
        let result = validator.validate_price_data(&invalid_data);
        assert!(result.is_err(), "Negative volume should fail validation");
        
        // Zero prices
        let mut invalid_data = create_valid_price_data();
        invalid_data.open = Decimal::ZERO;
        
        let result = validator.validate_price_data(&invalid_data);
        assert!(result.is_err(), "Zero price should fail validation");
    }

    #[test]
    fn test_user_input_validation_security() {
        let validator = InputValidator::new();
        
        // Valid input
        let valid_input = "Normal text input";
        let result = validator.validate_user_input(valid_input, "test_field", 100);
        assert!(result.is_ok(), "Valid input should pass");
        
        // Script injection attempt
        let malicious_input = "<script>alert('xss')</script>";
        let result = validator.validate_user_input(malicious_input, "test_field", 100);
        assert!(result.is_err(), "Script injection should fail validation");
        
        // SQL injection attempt
        let sql_injection = "'; DROP TABLE users; --";
        let result = validator.validate_user_input(sql_injection, "test_field", 100);
        assert!(result.is_err(), "SQL injection should fail validation");
        
        // Path traversal attempt
        let path_traversal = "../../../etc/passwd";
        let result = validator.validate_user_input(path_traversal, "test_field", 100);
        assert!(result.is_err(), "Path traversal should fail validation");
    }

    #[test]
    fn test_user_input_validation_length() {
        let validator = InputValidator::new();
        
        // Input exceeding max length
        let long_input = "a".repeat(1001);
        let result = validator.validate_user_input(&long_input, "test_field", 1000);
        assert!(result.is_err(), "Input exceeding max length should fail");
        
        let error = result.unwrap_err();
        assert!(error.to_string().contains("maximum length"), "Error should mention length limit");
    }

    #[test]
    fn test_user_input_validation_excessive_special_chars() {
        let validator = InputValidator::new();
        
        // Input with too many special characters (potential obfuscation)
        let special_heavy_input = "!@#$%^&*()_+{}|:<>?[];',./";
        let result = validator.validate_user_input(special_heavy_input, "test_field", 100);
        assert!(result.is_err(), "Input with excessive special characters should fail");
    }

    #[test]
    fn test_file_path_validation() {
        let validator = InputValidator::new();
        
        // Valid relative paths
        let valid_paths = vec![
            "config/settings.json",
            "data/prices.csv",
            "logs/trading.log",
        ];
        
        for path in valid_paths {
            let result = validator.validate_file_path(path);
            assert!(result.is_ok(), "Valid path {} should pass validation", path);
        }
        
        // Invalid paths
        let invalid_paths = vec![
            ("../../../etc/passwd", "path traversal"),
            ("/absolute/path", "absolute path"),
            ("C:\\Windows\\System32", "Windows absolute path"),
            ("~/.ssh/id_rsa", "home directory reference"),
            ("a".repeat(300).as_str(), "path too long"),
        ];
        
        for (path, reason) in invalid_paths {
            let result = validator.validate_file_path(path);
            assert!(result.is_err(), "Invalid path '{}' should fail validation ({})", path, reason);
        }
    }

    #[test]
    fn test_numeric_range_validation() {
        let validator = InputValidator::new();
        
        // Valid range
        let result = validator.validate_numeric_range(50, 1, 100, "test_value");
        assert!(result.is_ok(), "Value within range should pass");
        
        // Value below range
        let result = validator.validate_numeric_range(0, 1, 100, "test_value");
        assert!(result.is_err(), "Value below range should fail");
        
        // Value above range
        let result = validator.validate_numeric_range(101, 1, 100, "test_value");
        assert!(result.is_err(), "Value above range should fail");
        
        // Boundary values
        let result = validator.validate_numeric_range(1, 1, 100, "test_value");
        assert!(result.is_ok(), "Lower boundary should pass");
        
        let result = validator.validate_numeric_range(100, 1, 100, "test_value");
        assert!(result.is_ok(), "Upper boundary should pass");
    }

    #[test]
    fn test_batch_size_validation() {
        let validator = InputValidator::new();
        
        // Valid batch size
        let result = validator.validate_batch_size(500, 1000, "test_operation");
        assert!(result.is_ok(), "Valid batch size should pass");
        
        // Zero batch size
        let result = validator.validate_batch_size(0, 1000, "test_operation");
        assert!(result.is_err(), "Zero batch size should fail");
        
        // Batch size exceeding limit
        let result = validator.validate_batch_size(1001, 1000, "test_operation");
        assert!(result.is_err(), "Batch size exceeding limit should fail");
    }

    use rust_decimal::prelude::FromStr;
}