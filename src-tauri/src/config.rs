use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::path::PathBuf;
use crate::errors::{TradingError, TradingResult};

/// Application configuration with environment-specific settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub network: NetworkConfig,
    pub trading: TradingConfig,
    pub gpu: GpuConfig,
    pub logging: LoggingConfig,
    pub security: SecurityConfig,
    pub performance: PerformanceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// HTTP request timeout in seconds
    pub request_timeout_secs: u64,
    /// Connection timeout in seconds
    pub connection_timeout_secs: u64,
    /// Maximum number of retries for failed requests
    pub max_retries: u32,
    /// Base delay for exponential backoff in milliseconds
    pub retry_base_delay_ms: u64,
    /// Maximum delay for exponential backoff in seconds
    pub retry_max_delay_secs: u64,
    /// User agent string for HTTP requests
    pub user_agent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingConfig {
    /// Default trading symbol
    pub default_symbol: String,
    /// Default kline interval
    pub default_interval: String,
    /// Maximum position size as percentage of account balance
    pub max_position_size_percent: f64,
    /// Default stop loss percentage
    pub default_stop_loss_percent: f64,
    /// Default take profit percentage
    pub default_take_profit_percent: f64,
    /// Maximum daily loss percentage
    pub max_daily_loss_percent: f64,
    /// Risk management check interval in seconds
    pub risk_check_interval_secs: u64,
    /// Emergency stop cooldown period in seconds
    pub emergency_stop_cooldown_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuConfig {
    /// Enable GPU acceleration
    pub enabled: bool,
    /// GPU memory limit in MB
    pub memory_limit_mb: u64,
    /// Workgroup size for compute shaders
    pub workgroup_size: u32,
    /// Maximum number of particles for rendering
    pub max_particles: u32,
    /// Target FPS for GPU rendering
    pub target_fps: u32,
    /// Enable GPU fallback to CPU
    pub enable_fallback: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    /// Log level (trace, debug, info, warn, error)
    pub level: String,
    /// Enable console logging
    pub console_enabled: bool,
    /// Enable file logging
    pub file_enabled: bool,
    /// Log file path (relative to app data directory)
    pub file_path: String,
    /// Maximum log file size in MB
    pub max_file_size_mb: u64,
    /// Number of log files to keep
    pub max_files: u32,
    /// Log rotation interval in hours
    pub rotation_interval_hours: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    /// Enable API key encryption
    pub encrypt_api_keys: bool,
    /// Session timeout in minutes
    pub session_timeout_minutes: u64,
    /// Enable request signing verification
    pub verify_signatures: bool,
    /// Maximum timestamp drift in seconds
    pub max_timestamp_drift_secs: u64,
    /// Enable IP whitelisting
    pub enable_ip_whitelist: bool,
    /// Rate limiting window in seconds
    pub rate_limit_window_secs: u64,
    /// Maximum requests per window
    pub max_requests_per_window: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    /// Enable caching
    pub enable_caching: bool,
    /// Cache TTL in seconds
    pub cache_ttl_secs: u64,
    /// Maximum cache size in MB
    pub max_cache_size_mb: u64,
    /// Enable connection pooling
    pub enable_connection_pooling: bool,
    /// Maximum number of connections in pool
    pub max_connections: u32,
    /// Connection idle timeout in seconds
    pub connection_idle_timeout_secs: u64,
    /// Enable data compression
    pub enable_compression: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            network: NetworkConfig::default(),
            trading: TradingConfig::default(),
            gpu: GpuConfig::default(),
            logging: LoggingConfig::default(),
            security: SecurityConfig::default(),
            performance: PerformanceConfig::default(),
        }
    }
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            request_timeout_secs: 30,
            connection_timeout_secs: 10,
            max_retries: 3,
            retry_base_delay_ms: 1000,
            retry_max_delay_secs: 60,
            user_agent: "CryptoTrader/1.0".to_string(),
        }
    }
}

impl Default for TradingConfig {
    fn default() -> Self {
        Self {
            default_symbol: "BTCUSDT".to_string(),
            default_interval: "1m".to_string(),
            max_position_size_percent: 10.0,
            default_stop_loss_percent: 2.0,
            default_take_profit_percent: 4.0,
            max_daily_loss_percent: 5.0,
            risk_check_interval_secs: 30,
            emergency_stop_cooldown_secs: 300,
        }
    }
}

impl Default for GpuConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            memory_limit_mb: 512,
            workgroup_size: 64,
            max_particles: 10000,
            target_fps: 60,
            enable_fallback: true,
        }
    }
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            console_enabled: true,
            file_enabled: true,
            file_path: "trading_bot.log".to_string(),
            max_file_size_mb: 10,
            max_files: 5,
            rotation_interval_hours: 24,
        }
    }
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            encrypt_api_keys: true,
            session_timeout_minutes: 60,
            verify_signatures: true,
            max_timestamp_drift_secs: 5,
            enable_ip_whitelist: false,
            rate_limit_window_secs: 60,
            max_requests_per_window: 100,
        }
    }
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            enable_caching: true,
            cache_ttl_secs: 300,
            max_cache_size_mb: 100,
            enable_connection_pooling: true,
            max_connections: 10,
            connection_idle_timeout_secs: 300,
            enable_compression: true,
        }
    }
}

/// Configuration manager for loading and saving application settings
pub struct ConfigManager {
    config_path: PathBuf,
    config: AppConfig,
}

impl ConfigManager {
    /// Create a new configuration manager
    pub fn new(config_path: PathBuf) -> Self {
        Self {
            config_path,
            config: AppConfig::default(),
        }
    }

    /// Load configuration from file, creating default if not exists
    pub fn load(&mut self) -> TradingResult<()> {
        if self.config_path.exists() {
            let content = std::fs::read_to_string(&self.config_path)
                .map_err(|e| TradingError::config_error(
                    "file_read".to_string(),
                    format!("Failed to read config file: {}", e)
                ))?;

            self.config = serde_json::from_str(&content)
                .map_err(|e| TradingError::config_error(
                    "json_parse".to_string(),
                    format!("Failed to parse config file: {}", e)
                ))?;
        } else {
            // Create default config file
            self.save()?;
        }

        // Validate configuration
        self.validate()?;
        Ok(())
    }

    /// Save configuration to file
    pub fn save(&self) -> TradingResult<()> {
        // Create parent directory if it doesn't exist
        if let Some(parent) = self.config_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| TradingError::config_error(
                    "directory_create".to_string(),
                    format!("Failed to create config directory: {}", e)
                ))?;
        }

        let content = serde_json::to_string_pretty(&self.config)
            .map_err(|e| TradingError::config_error(
                "json_serialize".to_string(),
                format!("Failed to serialize config: {}", e)
            ))?;

        std::fs::write(&self.config_path, content)
            .map_err(|e| TradingError::config_error(
                "file_write".to_string(),
                format!("Failed to write config file: {}", e)
            ))?;

        Ok(())
    }

    /// Get current configuration
    pub fn get(&self) -> &AppConfig {
        &self.config
    }

    /// Update configuration
    pub fn update(&mut self, config: AppConfig) -> TradingResult<()> {
        // Validate new configuration
        self.validate_config(&config)?;
        self.config = config;
        self.save()?;
        Ok(())
    }

    /// Validate current configuration
    pub fn validate(&self) -> TradingResult<()> {
        self.validate_config(&self.config)
    }

    /// Validate a configuration object
    fn validate_config(&self, config: &AppConfig) -> TradingResult<()> {
        // Validate network config
        if config.network.request_timeout_secs == 0 {
            return Err(TradingError::config_error(
                "network.request_timeout_secs".to_string(),
                "Request timeout must be greater than 0".to_string()
            ));
        }

        if config.network.max_retries > 10 {
            return Err(TradingError::config_error(
                "network.max_retries".to_string(),
                "Maximum retries cannot exceed 10".to_string()
            ));
        }

        // Validate trading config
        if config.trading.max_position_size_percent <= 0.0 || config.trading.max_position_size_percent > 100.0 {
            return Err(TradingError::config_error(
                "trading.max_position_size_percent".to_string(),
                "Position size must be between 0 and 100 percent".to_string()
            ));
        }

        if config.trading.default_stop_loss_percent <= 0.0 || config.trading.default_stop_loss_percent > 50.0 {
            return Err(TradingError::config_error(
                "trading.default_stop_loss_percent".to_string(),
                "Stop loss must be between 0 and 50 percent".to_string()
            ));
        }

        // Validate GPU config
        if config.gpu.workgroup_size == 0 || config.gpu.workgroup_size > 1024 {
            return Err(TradingError::config_error(
                "gpu.workgroup_size".to_string(),
                "Workgroup size must be between 1 and 1024".to_string()
            ));
        }

        // Validate logging config
        let valid_levels = ["trace", "debug", "info", "warn", "error"];
        if !valid_levels.contains(&config.logging.level.as_str()) {
            return Err(TradingError::config_error(
                "logging.level".to_string(),
                format!("Invalid log level. Valid levels: {:?}", valid_levels)
            ));
        }

        // Validate security config
        if config.security.session_timeout_minutes == 0 {
            return Err(TradingError::config_error(
                "security.session_timeout_minutes".to_string(),
                "Session timeout must be greater than 0".to_string()
            ));
        }

        Ok(())
    }

    /// Get network timeout as Duration
    pub fn network_timeout(&self) -> Duration {
        Duration::from_secs(self.config.network.request_timeout_secs)
    }

    /// Get connection timeout as Duration
    pub fn connection_timeout(&self) -> Duration {
        Duration::from_secs(self.config.network.connection_timeout_secs)
    }

    /// Get retry delay as Duration
    pub fn retry_delay(&self, attempt: u32) -> Duration {
        let base_delay = Duration::from_millis(self.config.network.retry_base_delay_ms);
        let max_delay = Duration::from_secs(self.config.network.retry_max_delay_secs);

        // Exponential backoff with jitter
        let delay = base_delay * (2_u32.pow(attempt.min(10)));
        std::cmp::min(delay, max_delay)
    }

    /// Check if caching is enabled
    pub fn is_caching_enabled(&self) -> bool {
        self.config.performance.enable_caching
    }

    /// Get cache TTL as Duration
    pub fn cache_ttl(&self) -> Duration {
        Duration::from_secs(self.config.performance.cache_ttl_secs)
    }
}