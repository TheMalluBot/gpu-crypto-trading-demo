use std::fmt;
use serde::{Deserialize, Serialize};

/// Comprehensive error types for the trading application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TradingError {
    /// API-related errors
    Api(ApiError),
    /// Network connectivity errors
    Network(NetworkError),
    /// Authentication and authorization errors
    Auth(AuthError),
    /// Configuration errors
    Config(ConfigError),
    /// Trading logic errors
    Trading(TradingLogicError),
    /// GPU/WebGPU related errors
    Gpu(GpuError),
    /// Data validation errors
    Validation(ValidationError),
    /// Internal system errors
    Internal(InternalError),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub code: i64,
    pub message: String,
    pub endpoint: String,
    pub retry_after: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkError {
    pub error_type: NetworkErrorType,
    pub message: String,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NetworkErrorType {
    Timeout,
    ConnectionFailed,
    DnsResolution,
    SslError,
    RateLimited,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthError {
    pub error_type: AuthErrorType,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthErrorType {
    InvalidApiKey,
    InvalidSignature,
    TimestampOutOfSync,
    InsufficientPermissions,
    CredentialsNotFound,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigError {
    pub field: String,
    pub message: String,
    pub expected: Option<String>,
    pub actual: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingLogicError {
    pub error_type: TradingLogicErrorType,
    pub message: String,
    pub symbol: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TradingLogicErrorType {
    InsufficientBalance,
    InvalidOrderSize,
    MarketClosed,
    SymbolNotFound,
    PriceOutOfRange,
    RiskLimitExceeded,
    EmergencyStopActive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuError {
    pub error_type: GpuErrorType,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GpuErrorType {
    InitializationFailed,
    DeviceNotFound,
    OutOfMemory,
    ComputeShaderError,
    WebGpuNotSupported,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
    pub value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InternalError {
    pub message: String,
    pub source: Option<String>,
}

impl fmt::Display for TradingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TradingError::Api(err) => write!(f, "API Error [{}]: {} (endpoint: {})", err.code, err.message, err.endpoint),
            TradingError::Network(err) => write!(f, "Network Error: {} (type: {:?})", err.message, err.error_type),
            TradingError::Auth(err) => write!(f, "Authentication Error: {} (type: {:?})", err.message, err.error_type),
            TradingError::Config(err) => write!(f, "Configuration Error in '{}': {}", err.field, err.message),
            TradingError::Trading(err) => write!(f, "Trading Error: {} (type: {:?})", err.message, err.error_type),
            TradingError::Gpu(err) => write!(f, "GPU Error: {} (type: {:?})", err.message, err.error_type),
            TradingError::Validation(err) => write!(f, "Validation Error in '{}': {}", err.field, err.message),
            TradingError::Internal(err) => write!(f, "Internal Error: {}", err.message),
        }
    }
}

impl std::error::Error for TradingError {}

/// Result type alias for trading operations
pub type TradingResult<T> = Result<T, TradingError>;

impl TradingError {
    /// Create an API error from Binance error response
    pub fn api_error(code: i64, message: String, endpoint: String) -> Self {
        TradingError::Api(ApiError {
            code,
            message,
            endpoint,
            retry_after: None,
        })
    }

    /// Create a network timeout error
    pub fn network_timeout(url: Option<String>) -> Self {
        TradingError::Network(NetworkError {
            error_type: NetworkErrorType::Timeout,
            message: "Request timed out".to_string(),
            url,
        })
    }

    /// Create a connection failed error
    pub fn connection_failed(url: Option<String>) -> Self {
        TradingError::Network(NetworkError {
            error_type: NetworkErrorType::ConnectionFailed,
            message: "Failed to establish connection".to_string(),
            url,
        })
    }

    /// Create an authentication error
    pub fn auth_error(error_type: AuthErrorType, message: String) -> Self {
        TradingError::Auth(AuthError {
            error_type,
            message,
        })
    }

    /// Create a validation error
    pub fn validation_error(field: String, message: String, value: Option<String>) -> Self {
        TradingError::Validation(ValidationError {
            field,
            message,
            value,
        })
    }

    /// Create a configuration error
    pub fn config_error(field: String, message: String) -> Self {
        TradingError::Config(ConfigError {
            field,
            message,
            expected: None,
            actual: None,
        })
    }

    /// Create a trading logic error
    pub fn trading_error(error_type: TradingLogicErrorType, message: String, symbol: Option<String>) -> Self {
        TradingError::Trading(TradingLogicError {
            error_type,
            message,
            symbol,
        })
    }

    /// Create a GPU error
    pub fn gpu_error(error_type: GpuErrorType, message: String) -> Self {
        TradingError::Gpu(GpuError {
            error_type,
            message,
        })
    }

    /// Create an internal error
    pub fn internal_error(message: String) -> Self {
        TradingError::Internal(InternalError {
            message,
            source: None,
        })
    }

    /// Check if this error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            TradingError::Network(err) => matches!(err.error_type, NetworkErrorType::Timeout | NetworkErrorType::ConnectionFailed),
            TradingError::Api(err) => err.code == 429 || err.code == -1021, // Rate limit or timestamp sync
            _ => false,
        }
    }

    /// Get retry delay in seconds if applicable
    pub fn retry_delay(&self) -> Option<u64> {
        match self {
            TradingError::Api(err) => err.retry_after,
            TradingError::Network(err) => match err.error_type {
                NetworkErrorType::Timeout => Some(5),
                NetworkErrorType::ConnectionFailed => Some(10),
                NetworkErrorType::RateLimited => Some(60),
                _ => None,
            },
            _ => None,
        }
    }
}

// Conversion implementations for common error types
impl From<reqwest::Error> for TradingError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            TradingError::network_timeout(err.url().map(|u| u.to_string()))
        } else if err.is_connect() {
            TradingError::connection_failed(err.url().map(|u| u.to_string()))
        } else {
            TradingError::Network(NetworkError {
                error_type: NetworkErrorType::ConnectionFailed,
                message: err.to_string(),
                url: err.url().map(|u| u.to_string()),
            })
        }
    }
}

impl From<serde_json::Error> for TradingError {
    fn from(err: serde_json::Error) -> Self {
        TradingError::internal_error(format!("JSON parsing error: {}", err))
    }
}

impl From<std::io::Error> for TradingError {
    fn from(err: std::io::Error) -> Self {
        TradingError::internal_error(format!("IO error: {}", err))
    }
}

// Convert TradingError to String for Tauri commands
impl From<TradingError> for String {
    fn from(err: TradingError) -> Self {
        err.to_string()
    }
}