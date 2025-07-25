use crate::errors::{TradingError, TradingResult};
use crate::models::{AppSettings, OrderRequest};
use rust_decimal::Decimal;
use regex::Regex;
use std::collections::HashSet;

/// Comprehensive input validation for trading operations
pub struct InputValidator {
    valid_symbols: HashSet<String>,
    valid_intervals: HashSet<String>,
}

impl InputValidator {
    pub fn new() -> Self {
        let mut valid_intervals = HashSet::new();
        valid_intervals.insert("1m".to_string());
        valid_intervals.insert("3m".to_string());
        valid_intervals.insert("5m".to_string());
        valid_intervals.insert("15m".to_string());
        valid_intervals.insert("30m".to_string());
        valid_intervals.insert("1h".to_string());
        valid_intervals.insert("2h".to_string());
        valid_intervals.insert("4h".to_string());
        valid_intervals.insert("6h".to_string());
        valid_intervals.insert("8h".to_string());
        valid_intervals.insert("12h".to_string());
        valid_intervals.insert("1d".to_string());
        valid_intervals.insert("3d".to_string());
        valid_intervals.insert("1w".to_string());
        valid_intervals.insert("1M".to_string());

        Self {
            valid_symbols: HashSet::new(), // Will be populated from API
            valid_intervals,
        }
    }

    /// Validate API settings
    pub fn validate_api_settings(&self, settings: &AppSettings) -> TradingResult<()> {
        // Validate API key format (if provided)
        if !settings.api_key.is_empty() {
            if settings.api_key.len() < 32 {
                return Err(TradingError::validation_error(
                    "api_key".to_string(),
                    "API key appears to be too short".to_string(),
                    Some(format!("Length: {}", settings.api_key.len()))
                ));
            }

            // Check for valid characters (alphanumeric)
            let api_key_regex = Regex::new(r"^[A-Za-z0-9]+$").unwrap();
            if !api_key_regex.is_match(&settings.api_key) {
                return Err(TradingError::validation_error(
                    "api_key".to_string(),
                    "API key contains invalid characters".to_string(),
                    None
                ));
            }
        }

        // Validate API secret format (if provided)
        if !settings.api_secret.is_empty() {
            if settings.api_secret.len() < 32 {
                return Err(TradingError::validation_error(
                    "api_secret".to_string(),
                    "API secret appears to be too short".to_string(),
                    Some(format!("Length: {}", settings.api_secret.len()))
                ));
            }

            let api_secret_regex = Regex::new(r"^[A-Za-z0-9]+$").unwrap();
            if !api_secret_regex.is_match(&settings.api_secret) {
                return Err(TradingError::validation_error(
                    "api_secret".to_string(),
                    "API secret contains invalid characters".to_string(),
                    None
                ));
            }
        }

        // Validate base URL
        if !settings.base_url.is_empty() {
            let url_regex = Regex::new(r"^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
            if !url_regex.is_match(&settings.base_url) {
                return Err(TradingError::validation_error(
                    "base_url".to_string(),
                    "Invalid base URL format".to_string(),
                    Some(settings.base_url.clone())
                ));
            }
        }

        Ok(())
    }

    /// Validate trading symbol
    pub fn validate_symbol(&self, symbol: &str) -> TradingResult<()> {
        if symbol.is_empty() {
            return Err(TradingError::validation_error(
                "symbol".to_string(),
                "Symbol cannot be empty".to_string(),
                None
            ));
        }

        if symbol.len() < 3 || symbol.len() > 20 {
            return Err(TradingError::validation_error(
                "symbol".to_string(),
                "Symbol length must be between 3 and 20 characters".to_string(),
                Some(symbol.to_string())
            ));
        }

        // Check for valid characters (uppercase letters and numbers only)
        let symbol_regex = Regex::new(r"^[A-Z0-9]+$").unwrap();
        if !symbol_regex.is_match(symbol) {
            return Err(TradingError::validation_error(
                "symbol".to_string(),
                "Symbol must contain only uppercase letters and numbers".to_string(),
                Some(symbol.to_string())
            ));
        }

        Ok(())
    }

    /// Validate kline interval
    pub fn validate_interval(&self, interval: &str) -> TradingResult<()> {
        if !self.valid_intervals.contains(interval) {
            return Err(TradingError::validation_error(
                "interval".to_string(),
                format!("Invalid interval. Valid intervals: {:?}", self.valid_intervals),
                Some(interval.to_string())
            ));
        }
        Ok(())
    }

    /// Validate kline limit
    pub fn validate_kline_limit(&self, limit: u32) -> TradingResult<()> {
        if limit == 0 {
            return Err(TradingError::validation_error(
                "limit".to_string(),
                "Limit must be greater than 0".to_string(),
                Some(limit.to_string())
            ));
        }

        if limit > 1000 {
            return Err(TradingError::validation_error(
                "limit".to_string(),
                "Limit cannot exceed 1000".to_string(),
                Some(limit.to_string())
            ));
        }

        Ok(())
    }

    /// Validate order request
    pub fn validate_order(&self, order: &OrderRequest) -> TradingResult<()> {
        // Validate symbol
        self.validate_symbol(&order.symbol)?;

        // Validate quantity
        if order.quantity <= Decimal::ZERO {
            return Err(TradingError::validation_error(
                "quantity".to_string(),
                "Order quantity must be greater than zero".to_string(),
                Some(order.quantity.to_string())
            ));
        }

        // Validate quantity precision (max 8 decimal places)
        let quantity_str = order.quantity.to_string();
        if let Some(decimal_pos) = quantity_str.find('.') {
            let decimal_places = quantity_str.len() - decimal_pos - 1;
            if decimal_places > 8 {
                return Err(TradingError::validation_error(
                    "quantity".to_string(),
                    "Quantity cannot have more than 8 decimal places".to_string(),
                    Some(order.quantity.to_string())
                ));
            }
        }

        // Validate price if provided
        if let Some(price) = order.price {
            if price <= Decimal::ZERO {
                return Err(TradingError::validation_error(
                    "price".to_string(),
                    "Order price must be greater than zero".to_string(),
                    Some(price.to_string())
                ));
            }

            // Validate price precision (max 8 decimal places)
            let price_str = price.to_string();
            if let Some(decimal_pos) = price_str.find('.') {
                let decimal_places = price_str.len() - decimal_pos - 1;
                if decimal_places > 8 {
                    return Err(TradingError::validation_error(
                        "price".to_string(),
                        "Price cannot have more than 8 decimal places".to_string(),
                        Some(price.to_string())
                    ));
                }
            }
        }

        Ok(())
    }
}