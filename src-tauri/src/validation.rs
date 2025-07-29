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
            let api_key_regex = Regex::new(r"^[A-Za-z0-9]+$").map_err(|e| {
                TradingError::validation_error(
                    "api_key_regex".to_string(),
                    format!("Failed to compile API key regex: {}", e),
                    None
                )
            })?;
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

            let api_secret_regex = Regex::new(r"^[A-Za-z0-9]+$").map_err(|e| {
                TradingError::validation_error(
                    "api_secret_regex".to_string(),
                    format!("Failed to compile API secret regex: {}", e),
                    None
                )
            })?;
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
            let url_regex = Regex::new(r"^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").map_err(|e| {
                TradingError::validation_error(
                    "url_regex".to_string(),
                    format!("Failed to compile URL regex: {}", e),
                    None
                )
            })?;
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
        let symbol_regex = Regex::new(r"^[A-Z0-9]+$").map_err(|e| {
            TradingError::validation_error(
                "symbol_regex".to_string(),
                format!("Failed to compile symbol regex: {}", e),
                None
            )
        })?;
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

    /// Validate Enhanced LRO configuration parameters
    pub fn validate_enhanced_lro_config(&self, config: &crate::enhanced_lro::LROConfig) -> TradingResult<()> {
        // Validate base period
        if config.base_period < 5 || config.base_period > 200 {
            return Err(TradingError::validation_error(
                "base_period".to_string(),
                "Base period must be between 5 and 200".to_string(),
                Some(config.base_period.to_string())
            ));
        }

        // Validate period range
        if config.min_period >= config.max_period {
            return Err(TradingError::validation_error(
                "period_range".to_string(),
                "Min period must be less than max period".to_string(),
                Some(format!("min: {}, max: {}", config.min_period, config.max_period))
            ));
        }

        if config.min_period < 3 {
            return Err(TradingError::validation_error(
                "min_period".to_string(),
                "Min period must be at least 3".to_string(),
                Some(config.min_period.to_string())
            ));
        }

        if config.max_period > 500 {
            return Err(TradingError::validation_error(
                "max_period".to_string(),
                "Max period cannot exceed 500".to_string(),
                Some(config.max_period.to_string())
            ));
        }

        // Validate thresholds
        if config.overbought_threshold <= 0.0 || config.overbought_threshold > 10.0 {
            return Err(TradingError::validation_error(
                "overbought_threshold".to_string(),
                "Overbought threshold must be between 0 and 10".to_string(),
                Some(config.overbought_threshold.to_string())
            ));
        }

        if config.oversold_threshold >= 0.0 || config.oversold_threshold < -10.0 {
            return Err(TradingError::validation_error(
                "oversold_threshold".to_string(),
                "Oversold threshold must be between -10 and 0".to_string(),
                Some(config.oversold_threshold.to_string())
            ));
        }

        Ok(())
    }

    /// Validate backtesting configuration
    pub fn validate_backtest_config(&self, config: &crate::backtesting::BacktestConfig) -> TradingResult<()> {
        // Validate initial balance
        if config.initial_balance <= rust_decimal::Decimal::ZERO {
            return Err(TradingError::validation_error(
                "initial_balance".to_string(),
                "Initial balance must be greater than zero".to_string(),
                Some(config.initial_balance.to_string())
            ));
        }

        // Validate commission rate
        if config.commission_rate < 0.0 || config.commission_rate > 0.1 {
            return Err(TradingError::validation_error(
                "commission_rate".to_string(),
                "Commission rate must be between 0% and 10%".to_string(),
                Some(config.commission_rate.to_string())
            ));
        }

        // Validate slippage rate
        if config.slippage_rate < 0.0 || config.slippage_rate > 0.05 {
            return Err(TradingError::validation_error(
                "slippage_rate".to_string(),
                "Slippage rate must be between 0% and 5%".to_string(),
                Some(config.slippage_rate.to_string())
            ));
        }

        // Validate position size
        if config.max_position_size <= 0.0 || config.max_position_size > 1.0 {
            return Err(TradingError::validation_error(
                "max_position_size".to_string(),
                "Max position size must be between 0% and 100%".to_string(),
                Some(config.max_position_size.to_string())
            ));
        }

        // Validate date range
        if config.start_date >= config.end_date {
            return Err(TradingError::validation_error(
                "date_range".to_string(),
                "Start date must be before end date".to_string(),
                Some(format!("start: {}, end: {}", config.start_date, config.end_date))
            ));
        }

        // Validate that backtest period is not too long (prevent memory issues)
        let duration = config.end_date - config.start_date;
        if duration.num_days() > 365 * 5 { // 5 years max
            return Err(TradingError::validation_error(
                "backtest_duration".to_string(),
                "Backtest period cannot exceed 5 years".to_string(),
                Some(format!("{} days", duration.num_days()))
            ));
        }

        Ok(())
    }

    /// Validate trading strategy configuration
    pub fn validate_trading_config(&self, config: &crate::trading_strategy::LROConfig) -> TradingResult<()> {
        // Validate period
        if config.period < 5 || config.period > 200 {
            return Err(TradingError::validation_error(
                "period".to_string(),
                "LRO period must be between 5 and 200".to_string(),
                Some(config.period.to_string())
            ));
        }

        // Validate signal period
        if config.signal_period < 3 || config.signal_period > 50 {
            return Err(TradingError::validation_error(
                "signal_period".to_string(),
                "Signal period must be between 3 and 50".to_string(),
                Some(config.signal_period.to_string())
            ));
        }

        // Validate thresholds
        if config.overbought <= 0.0 || config.overbought > 5.0 {
            return Err(TradingError::validation_error(
                "overbought".to_string(),
                "Overbought threshold must be between 0 and 5".to_string(),
                Some(config.overbought.to_string())
            ));
        }

        if config.oversold >= 0.0 || config.oversold < -5.0 {
            return Err(TradingError::validation_error(
                "oversold".to_string(),
                "Oversold threshold must be between -5 and 0".to_string(),
                Some(config.oversold.to_string())
            ));
        }

        // Validate timeframe
        if !self.valid_intervals.contains(&config.timeframe) {
            return Err(TradingError::validation_error(
                "timeframe".to_string(),
                format!("Invalid timeframe. Valid options: {:?}", self.valid_intervals),
                Some(config.timeframe.clone())
            ));
        }

        // Validate virtual balance
        if config.virtual_balance <= 0.0 {
            return Err(TradingError::validation_error(
                "virtual_balance".to_string(),
                "Virtual balance must be greater than zero".to_string(),
                Some(config.virtual_balance.to_string())
            ));
        }

        // Validate stop loss percentage
        if config.stop_loss_percentage < 0.0 || config.stop_loss_percentage > 50.0 {
            return Err(TradingError::validation_error(
                "stop_loss_percentage".to_string(),
                "Stop loss percentage must be between 0% and 50%".to_string(),
                Some(config.stop_loss_percentage.to_string())
            ));
        }

        // Validate take profit percentage
        if config.take_profit_percentage < 0.0 || config.take_profit_percentage > 200.0 {
            return Err(TradingError::validation_error(
                "take_profit_percentage".to_string(),
                "Take profit percentage must be between 0% and 200%".to_string(),
                Some(config.take_profit_percentage.to_string())
            ));
        }

        Ok(())
    }

    /// Validate price data for completeness and sanity
    pub fn validate_price_data(&self, data: &crate::models::PriceData) -> TradingResult<()> {
        // Validate OHLC relationships
        if data.high < data.low {
            return Err(TradingError::validation_error(
                "price_data".to_string(),
                "High price cannot be less than low price".to_string(),
                Some(format!("high: {}, low: {}", data.high, data.low))
            ));
        }

        if data.open > data.high || data.open < data.low {
            return Err(TradingError::validation_error(
                "price_data".to_string(),
                "Open price must be between high and low prices".to_string(),
                Some(format!("open: {}, high: {}, low: {}", data.open, data.high, data.low))
            ));
        }

        if data.close > data.high || data.close < data.low {
            return Err(TradingError::validation_error(
                "price_data".to_string(),
                "Close price must be between high and low prices".to_string(),
                Some(format!("close: {}, high: {}, low: {}", data.close, data.high, data.low))
            ));
        }

        // Validate volume
        if data.volume < rust_decimal::Decimal::ZERO {
            return Err(TradingError::validation_error(
                "volume".to_string(),
                "Volume cannot be negative".to_string(),
                Some(data.volume.to_string())
            ));
        }

        // Validate prices are positive
        if data.open <= rust_decimal::Decimal::ZERO || 
           data.high <= rust_decimal::Decimal::ZERO || 
           data.low <= rust_decimal::Decimal::ZERO || 
           data.close <= rust_decimal::Decimal::ZERO {
            return Err(TradingError::validation_error(
                "price_data".to_string(),
                "All prices must be positive".to_string(),
                Some(format!("OHLC: {}, {}, {}, {}", data.open, data.high, data.low, data.close))
            ));
        }

        Ok(())
    }

    /// Validate user input strings for XSS and injection attacks
    pub fn validate_user_input(&self, input: &str, field_name: &str, max_length: usize) -> TradingResult<()> {
        // Check length
        if input.len() > max_length {
            return Err(TradingError::validation_error(
                field_name.to_string(),
                format!("Input exceeds maximum length of {} characters", max_length),
                Some(format!("Length: {}", input.len()))
            ));
        }

        // Check for common injection patterns
        let dangerous_patterns = [
            "<script", "</script>", "javascript:", "onload=", "onerror=",
            "SELECT ", "INSERT ", "UPDATE ", "DELETE ", "DROP ",
            "UNION ", "OR 1=1", "' OR '", "\" OR \"", 
            "../", "..\\", "%2e%2e", "%252e%252e"
        ];

        let input_lower = input.to_lowercase();
        for pattern in &dangerous_patterns {
            if input_lower.contains(&pattern.to_lowercase()) {
                return Err(TradingError::validation_error(
                    field_name.to_string(),
                    "Input contains potentially dangerous content".to_string(),
                    None // Don't expose the dangerous content
                ));
            }
        }

        // Check for excessive special characters (potential obfuscation)
        let special_char_count = input.chars().filter(|c| !c.is_alphanumeric() && !c.is_whitespace()).count();
        if special_char_count > input.len() / 2 {
            return Err(TradingError::validation_error(
                field_name.to_string(),
                "Input contains too many special characters".to_string(),
                Some(format!("Special chars: {}/{}", special_char_count, input.len()))
            ));
        }

        Ok(())
    }

    /// Validate numeric input ranges
    pub fn validate_numeric_range<T>(&self, value: T, min: T, max: T, field_name: &str) -> TradingResult<()> 
    where
        T: PartialOrd + std::fmt::Display + Copy,
    {
        if value < min || value > max {
            return Err(TradingError::validation_error(
                field_name.to_string(),
                format!("Value must be between {} and {}", min, max),
                Some(value.to_string())
            ));
        }
        Ok(())
    }

    /// Validate file paths for security
    pub fn validate_file_path(&self, path: &str) -> TradingResult<()> {
        // Check for path traversal attempts
        if path.contains("..") || path.contains("~") {
            return Err(TradingError::validation_error(
                "file_path".to_string(),
                "Path contains invalid characters".to_string(),
                None
            ));
        }

        // Check for absolute paths outside allowed directories
        if path.starts_with('/') || path.contains(':') {
            return Err(TradingError::validation_error(
                "file_path".to_string(),
                "Absolute paths are not allowed".to_string(),
                None
            ));
        }

        // Validate path length
        if path.len() > 255 {
            return Err(TradingError::validation_error(
                "file_path".to_string(),
                "Path exceeds maximum length".to_string(),
                Some(format!("Length: {}", path.len()))
            ));
        }

        Ok(())
    }

    /// Comprehensive validation for batch operations
    pub fn validate_batch_size(&self, size: usize, max_size: usize, operation: &str) -> TradingResult<()> {
        if size == 0 {
            return Err(TradingError::validation_error(
                "batch_size".to_string(),
                format!("Batch size for {} cannot be zero", operation),
                Some(size.to_string())
            ));
        }

        if size > max_size {
            return Err(TradingError::validation_error(
                "batch_size".to_string(),
                format!("Batch size for {} exceeds maximum of {}", operation, max_size),
                Some(size.to_string())
            ));
        }

        Ok(())
    }
}