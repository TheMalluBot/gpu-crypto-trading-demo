use crate::validation::InputValidator;
use crate::models::{AppSettings, OrderRequest, PriceData};
use crate::trading_strategy::LROConfig as TradingLROConfig;
use crate::enhanced_lro::LROConfig as EnhancedLROConfig;
use crate::backtesting::BacktestConfig;
use tauri::State;
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use tokio::sync::RwLock;

// Global validator state
type ValidatorState = Arc<RwLock<InputValidator>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub error_message: Option<String>,
    pub error_field: Option<String>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchValidationResult {
    pub overall_valid: bool,
    pub results: Vec<ValidationResult>,
    pub error_count: usize,
    pub warning_count: usize,
}

/// Initialize the validation system
#[tauri::command]
pub async fn initialize_validator() -> Result<(), String> {
    // This would initialize the validator with current symbol lists from API
    Ok(())
}

/// Validate API settings
#[tauri::command]
pub async fn validate_api_settings(
    settings: AppSettings,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_api_settings(&settings) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["API settings are valid".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some("api_settings".to_string()),
            suggestions: generate_api_settings_suggestions(&settings),
        }),
    }
}

/// Validate trading symbol
#[tauri::command]
pub async fn validate_trading_symbol(
    symbol: String,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_symbol(&symbol) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Symbol format is valid".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some("symbol".to_string()),
            suggestions: generate_symbol_suggestions(&symbol),
        }),
    }
}

/// Validate order request
#[tauri::command]
pub async fn validate_order_request(
    order: OrderRequest,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_order(&order) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Order parameters are valid".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some("order".to_string()),
            suggestions: generate_order_suggestions(&order),
        }),
    }
}

/// Validate Enhanced LRO configuration
#[tauri::command]
pub async fn validate_enhanced_lro_config(
    config: EnhancedLROConfig,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_enhanced_lro_config(&config) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Enhanced LRO configuration is valid".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some("enhanced_lro_config".to_string()),
            suggestions: generate_enhanced_lro_suggestions(&config),
        }),
    }
}

/// Validate backtesting configuration
#[tauri::command]
pub async fn validate_backtest_config(
    config: BacktestConfig,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_backtest_config(&config) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Backtesting configuration is valid".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some("backtest_config".to_string()),
            suggestions: generate_backtest_suggestions(&config),
        }),
    }
}

/// Validate trading strategy configuration
#[tauri::command]
pub async fn validate_trading_config(
    config: TradingLROConfig,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_trading_config(&config) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Trading configuration is valid".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some("trading_config".to_string()),
            suggestions: generate_trading_config_suggestions(&config),
        }),
    }
}

/// Validate price data
#[tauri::command]
pub async fn validate_price_data(
    data: PriceData,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_price_data(&data) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Price data is valid".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some("price_data".to_string()),
            suggestions: generate_price_data_suggestions(&data),
        }),
    }
}

/// Validate batch of price data
#[tauri::command]
pub async fn validate_price_data_batch(
    data_batch: Vec<PriceData>,
    validator_state: State<'_, ValidatorState>
) -> Result<BatchValidationResult, String> {
    let validator = validator_state.read().await;
    
    // Validate batch size first
    if let Err(e) = validator.validate_batch_size(data_batch.len(), 10000, "price data validation") {
        return Ok(BatchValidationResult {
            overall_valid: false,
            results: vec![ValidationResult {
                is_valid: false,
                error_message: Some(e.to_string()),
                error_field: Some("batch_size".to_string()),
                suggestions: vec!["Reduce batch size to 10,000 or fewer records".to_string()],
            }],
            error_count: 1,
            warning_count: 0,
        });
    }

    let mut results = Vec::new();
    let mut error_count = 0;
    
    for (i, price_data) in data_batch.iter().enumerate() {
        match validator.validate_price_data(price_data) {
            Ok(()) => {
                results.push(ValidationResult {
                    is_valid: true,
                    error_message: None,
                    error_field: None,
                    suggestions: vec![],
                });
            },
            Err(e) => {
                error_count += 1;
                results.push(ValidationResult {
                    is_valid: false,
                    error_message: Some(format!("Record {}: {}", i + 1, e)),
                    error_field: Some(format!("price_data[{}]", i)),
                    suggestions: generate_price_data_suggestions(price_data),
                });
            }
        }
    }

    Ok(BatchValidationResult {
        overall_valid: error_count == 0,
        results,
        error_count,
        warning_count: 0,
    })
}

/// Validate user input for security
#[tauri::command]
pub async fn validate_user_input(
    input: String,
    field_name: String,
    max_length: usize,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_user_input(&input, &field_name, max_length) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Input is safe and valid".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some(field_name.clone()),
            suggestions: generate_input_security_suggestions(&input, max_length),
        }),
    }
}

/// Validate file path for security
#[tauri::command]
pub async fn validate_file_path(
    path: String,
    validator_state: State<'_, ValidatorState>
) -> Result<ValidationResult, String> {
    let validator = validator_state.read().await;
    
    match validator.validate_file_path(&path) {
        Ok(()) => Ok(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["File path is secure".to_string()],
        }),
        Err(e) => Ok(ValidationResult {
            is_valid: false,
            error_message: Some(e.to_string()),
            error_field: Some("file_path".to_string()),
            suggestions: vec![
                "Use relative paths only".to_string(),
                "Avoid '..' in path".to_string(),
                "Keep path under 255 characters".to_string(),
            ],
        }),
    }
}

/// Comprehensive validation for multiple inputs
#[tauri::command]
pub async fn validate_comprehensive_config(
    api_settings: AppSettings,
    trading_config: TradingLROConfig,
    enhanced_lro_config: EnhancedLROConfig,
    validator_state: State<'_, ValidatorState>
) -> Result<BatchValidationResult, String> {
    let validator = validator_state.read().await;
    
    let mut results = Vec::new();
    let mut error_count = 0;

    // Validate API settings
    match validator.validate_api_settings(&api_settings) {
        Ok(()) => results.push(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["API settings valid".to_string()],
        }),
        Err(e) => {
            error_count += 1;
            results.push(ValidationResult {
                is_valid: false,
                error_message: Some(e.to_string()),
                error_field: Some("api_settings".to_string()),
                suggestions: generate_api_settings_suggestions(&api_settings),
            });
        }
    }

    // Validate trading config
    match validator.validate_trading_config(&trading_config) {
        Ok(()) => results.push(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Trading config valid".to_string()],
        }),
        Err(e) => {
            error_count += 1;
            results.push(ValidationResult {
                is_valid: false,
                error_message: Some(e.to_string()),
                error_field: Some("trading_config".to_string()),
                suggestions: generate_trading_config_suggestions(&trading_config),
            });
        }
    }

    // Validate enhanced LRO config
    match validator.validate_enhanced_lro_config(&enhanced_lro_config) {
        Ok(()) => results.push(ValidationResult {
            is_valid: true,
            error_message: None,
            error_field: None,
            suggestions: vec!["Enhanced LRO config valid".to_string()],
        }),
        Err(e) => {
            error_count += 1;
            results.push(ValidationResult {
                is_valid: false,
                error_message: Some(e.to_string()),
                error_field: Some("enhanced_lro_config".to_string()),
                suggestions: generate_enhanced_lro_suggestions(&enhanced_lro_config),
            });
        }
    }

    Ok(BatchValidationResult {
        overall_valid: error_count == 0,
        results,
        error_count,
        warning_count: 0,
    })
}

// Helper functions to generate suggestions
fn generate_api_settings_suggestions(settings: &AppSettings) -> Vec<String> {
    let mut suggestions = Vec::new();
    
    if settings.api_key.len() < 32 {
        suggestions.push("Ensure API key is from a legitimate exchange".to_string());
    }
    
    if settings.api_secret.len() < 32 {
        suggestions.push("Ensure API secret is from a legitimate exchange".to_string());
    }
    
    if settings.base_url.is_empty() {
        suggestions.push("Provide a valid base URL (e.g., https://api.binance.com)".to_string());
    }
    
    suggestions
}

fn generate_symbol_suggestions(symbol: &str) -> Vec<String> {
    let mut suggestions = Vec::new();
    
    if symbol.len() < 3 {
        suggestions.push("Symbol should be at least 3 characters (e.g., BTC)".to_string());
    }
    
    if symbol != symbol.to_uppercase() {
        suggestions.push("Use uppercase letters only (e.g., BTCUSDT)".to_string());
    }
    
    if !symbol.chars().all(|c| c.is_alphanumeric()) {
        suggestions.push("Use only letters and numbers".to_string());
    }
    
    suggestions.push("Popular symbols: BTCUSDT, ETHUSDT, ADAUSDT".to_string());
    suggestions
}

fn generate_order_suggestions(_order: &OrderRequest) -> Vec<String> {
    vec![
        "Ensure quantity is positive".to_string(),
        "Price must be greater than zero".to_string(),
        "Maximum 8 decimal places for precision".to_string(),
    ]
}

fn generate_enhanced_lro_suggestions(config: &EnhancedLROConfig) -> Vec<String> {
    let mut suggestions = Vec::new();
    
    if config.base_period < 14 {
        suggestions.push("Consider using at least 14 periods for better signal quality".to_string());
    }
    
    if config.min_period >= config.max_period {
        suggestions.push("Min period must be less than max period".to_string());
    }
    
    suggestions.push("Typical range: 14-50 for base period".to_string());
    suggestions.push("Overbought: 0.8-2.0, Oversold: -2.0 to -0.8".to_string());
    suggestions
}

fn generate_backtest_suggestions(_config: &BacktestConfig) -> Vec<String> {
    vec![
        "Use realistic commission rates (0.1%-1%)".to_string(),
        "Keep slippage under 0.5%".to_string(),
        "Limit backtest period to avoid memory issues".to_string(),
        "Ensure start date is before end date".to_string(),
    ]
}

fn generate_trading_config_suggestions(_config: &TradingLROConfig) -> Vec<String> {
    vec![
        "Period should be 14-50 for most strategies".to_string(),
        "Stop loss: 1-10% is typical".to_string(),
        "Take profit: 5-50% depending on strategy".to_string(),
        "Use valid timeframes: 1m, 5m, 15m, 1h, 4h, 1d".to_string(),
    ]
}

fn generate_price_data_suggestions(_data: &PriceData) -> Vec<String> {
    vec![
        "High must be >= Low".to_string(),
        "Open and Close must be between High and Low".to_string(),
        "All prices must be positive".to_string(),
        "Volume cannot be negative".to_string(),
    ]
}

fn generate_input_security_suggestions(input: &str, max_length: usize) -> Vec<String> {
    let mut suggestions = Vec::new();
    
    if input.len() > max_length {
        suggestions.push(format!("Reduce input to {} characters or less", max_length));
    }
    
    suggestions.push("Avoid special characters and scripts".to_string());
    suggestions.push("Use plain text without HTML or JavaScript".to_string());
    suggestions
}