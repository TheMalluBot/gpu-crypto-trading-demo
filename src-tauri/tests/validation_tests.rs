use crypto_trader::validation::InputValidator;
use crypto_trader::models::{AppSettings, OrderRequest, TradeSide, OrderType};
use crypto_trader::errors::{TradingError};
use rust_decimal::Decimal;

#[cfg(test)]
mod validation_tests {
    use super::*;

    #[test]
    fn test_validate_api_settings_valid() {
        let validator = InputValidator::new();
        
        // Phase 1 Security Guardian Fix: Use proper test fixtures instead of hardcoded credentials
        // Generate valid test API key format without exposing real credentials
        let test_api_key = "TEST_API_KEY_".to_string() + &"0".repeat(64); // 64-char test key
        let test_api_secret = "TEST_API_SECRET_".to_string() + &"0".repeat(64); // 64-char test secret
        
        let settings = AppSettings {
            api_key: test_api_key,
            api_secret: test_api_secret,
            base_url: "https://testnet.binance.vision".to_string(), // Use testnet for tests
            testnet: true, // Always use testnet for tests
        };

        assert!(validator.validate_api_settings(&settings).is_ok());
    }

    #[test]
    fn test_validate_api_settings_short_key() {
        let validator = InputValidator::new();
        let settings = AppSettings {
            api_key: "short".to_string(), // Intentionally short for testing validation
            api_secret: "TEST_API_SECRET_".to_string() + &"0".repeat(64), // Use test secret
            base_url: "https://testnet.binance.vision".to_string(), // Use testnet
            testnet: true, // Always use testnet for tests
        };

        let result = validator.validate_api_settings(&settings);
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "api_key");
            assert!(err.message.contains("too short"));
        } else {
            panic!("Expected validation error for api_key");
        }
    }

    #[test]
    fn test_validate_api_settings_invalid_url() {
        let validator = InputValidator::new();
        let settings = AppSettings {
            api_key: "abcdef1234567890abcdef1234567890".to_string(),
            api_secret: "1234567890abcdef1234567890abcdef".to_string(),
            base_url: "invalid-url".to_string(),
            testnet: false,
        };

        let result = validator.validate_api_settings(&settings);
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "base_url");
            assert!(err.message.contains("Invalid base URL format"));
        } else {
            panic!("Expected validation error for base_url");
        }
    }

    #[test]
    fn test_validate_symbol_valid() {
        let validator = InputValidator::new();
        assert!(validator.validate_symbol("BTCUSDT").is_ok());
        assert!(validator.validate_symbol("ETHBTC").is_ok());
        assert!(validator.validate_symbol("BNB").is_ok());
    }

    #[test]
    fn test_validate_symbol_empty() {
        let validator = InputValidator::new();
        let result = validator.validate_symbol("");
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "symbol");
            assert!(err.message.contains("cannot be empty"));
        } else {
            panic!("Expected validation error for empty symbol");
        }
    }

    #[test]
    fn test_validate_symbol_invalid_characters() {
        let validator = InputValidator::new();
        let result = validator.validate_symbol("btc-usdt");
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "symbol");
            assert!(err.message.contains("uppercase letters and numbers"));
        } else {
            panic!("Expected validation error for invalid characters");
        }
    }

    #[test]
    fn test_validate_interval_valid() {
        let validator = InputValidator::new();
        assert!(validator.validate_interval("1m").is_ok());
        assert!(validator.validate_interval("1h").is_ok());
        assert!(validator.validate_interval("1d").is_ok());
    }

    #[test]
    fn test_validate_interval_invalid() {
        let validator = InputValidator::new();
        let result = validator.validate_interval("2m");
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "interval");
            assert!(err.message.contains("Invalid interval"));
        } else {
            panic!("Expected validation error for invalid interval");
        }
    }

    #[test]
    fn test_validate_kline_limit_valid() {
        let validator = InputValidator::new();
        assert!(validator.validate_kline_limit(1).is_ok());
        assert!(validator.validate_kline_limit(500).is_ok());
        assert!(validator.validate_kline_limit(1000).is_ok());
    }

    #[test]
    fn test_validate_kline_limit_zero() {
        let validator = InputValidator::new();
        let result = validator.validate_kline_limit(0);
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "limit");
            assert!(err.message.contains("greater than 0"));
        } else {
            panic!("Expected validation error for zero limit");
        }
    }

    #[test]
    fn test_validate_kline_limit_too_high() {
        let validator = InputValidator::new();
        let result = validator.validate_kline_limit(1001);
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "limit");
            assert!(err.message.contains("cannot exceed 1000"));
        } else {
            panic!("Expected validation error for limit too high");
        }
    }

    #[test]
    fn test_validate_order_valid() {
        let validator = InputValidator::new();
        let order = OrderRequest {
            symbol: "BTCUSDT".to_string(),
            side: TradeSide::Buy,
            order_type: OrderType::Market,
            quantity: Decimal::new(1, 3), // 0.001
            price: Some(Decimal::new(50000, 0)), // 50000
            time_in_force: None,
        };

        assert!(validator.validate_order(&order).is_ok());
    }

    #[test]
    fn test_validate_order_zero_quantity() {
        let validator = InputValidator::new();
        let order = OrderRequest {
            symbol: "BTCUSDT".to_string(),
            side: TradeSide::Buy,
            order_type: OrderType::Market,
            quantity: Decimal::ZERO,
            price: None,
            time_in_force: None,
        };

        let result = validator.validate_order(&order);
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "quantity");
            assert!(err.message.contains("greater than zero"));
        } else {
            panic!("Expected validation error for zero quantity");
        }
    }

    #[test]
    fn test_validate_order_zero_price() {
        let validator = InputValidator::new();
        let order = OrderRequest {
            symbol: "BTCUSDT".to_string(),
            side: TradeSide::Buy,
            order_type: OrderType::Limit,
            quantity: Decimal::new(1, 3), // 0.001
            price: Some(Decimal::ZERO),
            time_in_force: None,
        };

        let result = validator.validate_order(&order);
        assert!(result.is_err());
        if let Err(TradingError::Validation(err)) = result {
            assert_eq!(err.field, "price");
            assert!(err.message.contains("greater than zero"));
        } else {
            panic!("Expected validation error for zero price");
        }
    }
}