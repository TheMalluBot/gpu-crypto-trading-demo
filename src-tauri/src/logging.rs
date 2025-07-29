use std::fs::{OpenOptions, File};
use std::io::Write;
use std::sync::Mutex;
use std::path::{Path, PathBuf};
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use crate::config::LoggingConfig;
use crate::errors::{TradingError, TradingResult};

/// Log levels for trading bot
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum LogLevel {
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3,
    Critical = 4,
}

impl LogLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Debug => "DEBUG",
            LogLevel::Info => "INFO",
            LogLevel::Warning => "WARN",
            LogLevel::Error => "ERROR",
            LogLevel::Critical => "CRITICAL",
        }
    }
    
    pub fn emoji(&self) -> &'static str {
        match self {
            LogLevel::Debug => "🔍",
            LogLevel::Info => "ℹ️",
            LogLevel::Warning => "⚠️",
            LogLevel::Error => "❌",
            LogLevel::Critical => "🚨",
        }
    }
}

/// Trading-specific log categories
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogCategory {
    Trading,
    TradingLogic,
    RiskManagement,
    DataProcessing,
    GPU,
    Network,
    Configuration,
    Performance,
    Security,
}

impl LogCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogCategory::Trading => "TRADING",
            LogCategory::TradingLogic => "TRADING_LOGIC",
            LogCategory::RiskManagement => "RISK",
            LogCategory::DataProcessing => "DATA",
            LogCategory::GPU => "GPU",
            LogCategory::Network => "NETWORK",
            LogCategory::Configuration => "CONFIG",
            LogCategory::Performance => "PERF",
            LogCategory::Security => "SECURITY",
        }
    }
}

/// Log entry structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub category: LogCategory,
    pub message: String,
    pub context: Option<serde_json::Value>,
}

/// Production-ready logging system for trading bot
pub struct TradingLogger {
    config: LoggingConfig,
    log_file: Mutex<Option<std::fs::File>>,
    current_log_path: Mutex<Option<PathBuf>>,
    buffer: Mutex<Vec<LogEntry>>,
    last_rotation: Mutex<DateTime<Utc>>,
}

impl TradingLogger {
    /// Create new logger with configuration
    pub fn new(config: LoggingConfig) -> TradingResult<Self> {
        let mut logger = Self {
            config: config.clone(),
            log_file: Mutex::new(None),
            current_log_path: Mutex::new(None),
            buffer: Mutex::new(Vec::new()),
            last_rotation: Mutex::new(Utc::now()),
        };

        // Initialize log file if file logging is enabled
        if config.file_enabled {
            logger.rotate_log_file()?;
        }

        Ok(logger)
    }

    /// Create logger from legacy parameters (for backward compatibility)
    pub fn new_legacy(min_level: LogLevel, log_file_path: Option<&str>, console_enabled: bool) -> TradingResult<Self> {
        let config = LoggingConfig {
            level: min_level.as_str().to_lowercase(),
            console_enabled,
            file_enabled: log_file_path.is_some(),
            file_path: log_file_path.unwrap_or("trading_bot.log").to_string(),
            max_file_size_mb: 10,
            max_files: 5,
            rotation_interval_hours: 24,
        };
        Self::new(config)
    }

    /// Get minimum log level from config
    fn min_level(&self) -> LogLevel {
        match self.config.level.as_str() {
            "trace" | "debug" => LogLevel::Debug,
            "info" => LogLevel::Info,
            "warn" | "warning" => LogLevel::Warning,
            "error" => LogLevel::Error,
            "critical" => LogLevel::Critical,
            _ => LogLevel::Info,
        }
    }

    /// Check if log rotation is needed and perform it
    fn check_and_rotate(&self) -> TradingResult<()> {
        if !self.config.file_enabled {
            return Ok(());
        }

        let last_rotation = match self.last_rotation.lock() {
            Ok(guard) => *guard,
            Err(_) => return Ok(()), // Mutex poisoned, skip rotation
        };
        let now = Utc::now();
        let hours_since_rotation = (now - last_rotation).num_hours();

        // Check if rotation is needed based on time
        let time_rotation_needed = hours_since_rotation >= self.config.rotation_interval_hours as i64;

        // Check if rotation is needed based on file size
        let size_rotation_needed = if let Some(current_path) = self.current_log_path.lock().unwrap().as_ref() {
            if let Ok(metadata) = std::fs::metadata(current_path) {
                metadata.len() > (self.config.max_file_size_mb * 1024 * 1024)
            } else {
                false
            }
        } else {
            false
        };

        if time_rotation_needed || size_rotation_needed {
            self.rotate_log_file()?;
        }

        Ok(())
    }

    /// Rotate log file
    fn rotate_log_file(&self) -> TradingResult<()> {
        // Close current file
        *self.log_file.lock().unwrap() = None;

        // Generate new log file path with timestamp
        let now = Utc::now();
        let timestamp = now.format("%Y%m%d_%H%M%S");
        let base_path = Path::new(&self.config.file_path);
        let file_stem = base_path.file_stem().unwrap_or_default().to_string_lossy();
        let extension = base_path.extension().unwrap_or_default().to_string_lossy();

        let new_path = if extension.is_empty() {
            PathBuf::from(format!("{}_{}", file_stem, timestamp))
        } else {
            PathBuf::from(format!("{}_{}.{}", file_stem, timestamp, extension))
        };

        // Create parent directory if it doesn't exist
        if let Some(parent) = new_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| TradingError::internal_error(format!("Failed to create log directory: {}", e)))?;
        }

        // Open new log file
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&new_path)
            .map_err(|e| TradingError::internal_error(format!("Failed to create log file: {}", e)))?;

        *self.log_file.lock().unwrap() = Some(file);
        *self.current_log_path.lock().unwrap() = Some(new_path);
        *self.last_rotation.lock().unwrap() = now;

        // Clean up old log files
        self.cleanup_old_log_files()?;

        Ok(())
    }

    /// Clean up old log files to maintain max_files limit
    fn cleanup_old_log_files(&self) -> TradingResult<()> {
        let base_path = Path::new(&self.config.file_path);
        let parent_dir = base_path.parent().unwrap_or(Path::new("."));
        let file_stem = base_path.file_stem().unwrap_or_default().to_string_lossy();

        // Get all log files matching our pattern
        let mut log_files: Vec<_> = std::fs::read_dir(parent_dir)
            .map_err(|e| TradingError::internal_error(format!("Failed to read log directory: {}", e)))?
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                if let Some(name) = entry.file_name().to_str() {
                    name.starts_with(&file_stem.to_string()) && name.contains("_")
                } else {
                    false
                }
            })
            .collect();

        // Sort by modification time (newest first)
        log_files.sort_by(|a, b| {
            let a_time = a.metadata().and_then(|m| m.modified()).unwrap_or(std::time::UNIX_EPOCH);
            let b_time = b.metadata().and_then(|m| m.modified()).unwrap_or(std::time::UNIX_EPOCH);
            b_time.cmp(&a_time)
        });

        // Remove excess files
        if log_files.len() > self.config.max_files as usize {
            for file_entry in log_files.iter().skip(self.config.max_files as usize) {
                if let Err(e) = std::fs::remove_file(file_entry.path()) {
                    eprintln!("Warning: Failed to remove old log file {:?}: {}", file_entry.path(), e);
                }
            }
        }

        Ok(())
    }

    /// Log a message with context
    pub fn log_with_context(
        &self,
        level: LogLevel,
        category: LogCategory,
        message: &str,
        context: Option<serde_json::Value>,
    ) {
        if level < self.min_level() {
            return;
        }

        // Check and perform log rotation if needed
        let _ = self.check_and_rotate();

        let entry = LogEntry {
            timestamp: Utc::now(),
            level,
            category,
            message: message.to_string(),
            context,
        };

        self.write_log(&entry);
        self.buffer_log(entry);
    }

    /// Log a simple message
    pub fn log(&self, level: LogLevel, category: LogCategory, message: &str) {
        self.log_with_context(level, category, message, None);
    }

    /// Convenience methods for different log levels
    pub fn debug(&self, category: LogCategory, message: &str) {
        self.log(LogLevel::Debug, category, message);
    }

    pub fn info(&self, category: LogCategory, message: &str) {
        self.log(LogLevel::Info, category, message);
    }

    pub fn warning(&self, category: LogCategory, message: &str) {
        self.log(LogLevel::Warning, category, message);
    }

    pub fn error(&self, category: LogCategory, message: &str) {
        self.log(LogLevel::Error, category, message);
    }

    pub fn critical(&self, category: LogCategory, message: &str) {
        self.log(LogLevel::Critical, category, message);
    }

    /// Trading-specific logging methods
    pub fn log_trade(&self, action: &str, symbol: &str, price: f64, quantity: f64) {
        let context = serde_json::json!({
            "action": action,
            "symbol": symbol,
            "price": price,
            "quantity": quantity
        });
        self.log_with_context(
            LogLevel::Info,
            LogCategory::Trading,
            &format!("Trade executed: {} {} at {}", action, symbol, price),
            Some(context),
        );
    }

    pub fn log_signal(&self, signal_type: &str, lro_value: f64, strength: f64) {
        let context = serde_json::json!({
            "signal_type": signal_type,
            "lro_value": lro_value,
            "strength": strength
        });
        self.log_with_context(
            LogLevel::Info,
            LogCategory::Trading,
            &format!("Signal generated: {} (LRO: {:.3})", signal_type, lro_value),
            Some(context),
        );
    }

    pub fn log_risk_event(&self, event: &str, details: &str) {
        self.log_with_context(
            LogLevel::Warning,
            LogCategory::RiskManagement,
            &format!("Risk event: {} - {}", event, details),
            None,
        );
    }

    pub fn log_performance(&self, operation: &str, duration_ms: u64, success: bool) {
        let context = serde_json::json!({
            "operation": operation,
            "duration_ms": duration_ms,
            "success": success
        });
        let level = if success { LogLevel::Debug } else { LogLevel::Warning };
        self.log_with_context(
            level,
            LogCategory::Performance,
            &format!("Operation {} took {}ms", operation, duration_ms),
            Some(context),
        );
    }

    /// Get recent log entries
    pub fn get_recent_logs(&self, limit: usize) -> Vec<LogEntry> {
        let buffer = self.buffer.lock().unwrap();
        let start = buffer.len().saturating_sub(limit);
        buffer[start..].to_vec()
    }

    /// Get logs by level
    pub fn get_logs_by_level(&self, min_level: LogLevel) -> Vec<LogEntry> {
        let buffer = self.buffer.lock().unwrap();
        buffer
            .iter()
            .filter(|entry| entry.level >= min_level)
            .cloned()
            .collect()
    }

    /// Clear old logs to prevent memory buildup
    pub fn cleanup_old_logs(&self) {
        let mut buffer = self.buffer.lock().unwrap();
        if buffer.len() > self.max_buffer_size {
            let keep_count = self.max_buffer_size / 2;
            let total_len = buffer.len();
            buffer.drain(0..total_len - keep_count);
        }
    }

    /// Write log entry to file and console
    fn write_log(&self, entry: &LogEntry) {
        let formatted = self.format_log_entry(entry);

        // Write to console if enabled
        if self.config.console_enabled {
            match entry.level {
                LogLevel::Error | LogLevel::Critical => eprintln!("{}", formatted),
                _ => println!("{}", formatted),
            }
        }

        // Write to file if available and enabled
        if self.config.file_enabled {
            if let Ok(mut file_guard) = self.log_file.lock() {
                if let Some(ref mut file) = *file_guard {
                    let _ = writeln!(file, "{}", formatted);
                    let _ = file.flush();
                }
            }
        }
    }

    /// Add log entry to in-memory buffer
    fn buffer_log(&self, entry: LogEntry) {
        let mut buffer = self.buffer.lock().unwrap();
        buffer.push(entry);

        // Prevent unlimited growth (keep last 1000 entries)
        const MAX_BUFFER_SIZE: usize = 1000;
        if buffer.len() > MAX_BUFFER_SIZE * 2 {
            buffer.drain(0..MAX_BUFFER_SIZE);
        }
    }

    /// Format log entry for output
    fn format_log_entry(&self, entry: &LogEntry) -> String {
        let timestamp = entry.timestamp.format("%Y-%m-%d %H:%M:%S%.3f UTC");
        let context_str = if let Some(ref context) = entry.context {
            format!(" | {}", context)
        } else {
            String::new()
        };

        format!(
            "{} {} [{}] [{}] {}{}",
            timestamp,
            entry.level.emoji(),
            entry.level.as_str(),
            entry.category.as_str(),
            entry.message,
            context_str
        )
    }
}

/// Global logger instance
use std::sync::OnceLock;
static GLOBAL_LOGGER: OnceLock<TradingLogger> = OnceLock::new();

/// Initialize global logger with configuration
pub fn init_logger_with_config(config: LoggingConfig) -> TradingResult<()> {
    let logger = TradingLogger::new(config)?;
    GLOBAL_LOGGER.set(logger).map_err(|_| {
        TradingError::internal_error("Logger already initialized".to_string())
    })?;
    Ok(())
}

/// Initialize global logger (legacy method for backward compatibility)
pub fn init_logger(min_level: LogLevel, log_file_path: Option<&str>, console_enabled: bool) -> TradingResult<()> {
    let logger = TradingLogger::new_legacy(min_level, log_file_path, console_enabled)?;
    GLOBAL_LOGGER.set(logger).map_err(|_| {
        TradingError::internal_error("Logger already initialized".to_string())
    })?;
    Ok(())
}

/// Get global logger instance
pub fn get_logger() -> Option<&'static TradingLogger> {
    GLOBAL_LOGGER.get()
}

/// Macro for convenient logging
#[macro_export]
macro_rules! log_trading {
    ($level:expr, $category:expr, $($arg:tt)*) => {
        if let Some(logger) = $crate::logging::get_logger() {
            logger.log($level, $category, &format!($($arg)*));
        }
    };
}

#[macro_export]
macro_rules! log_debug {
    ($category:expr, $($arg:tt)*) => {
        $crate::log_trading!($crate::logging::LogLevel::Debug, $category, $($arg)*);
    };
}

#[macro_export]
macro_rules! log_info {
    ($category:expr, $($arg:tt)*) => {
        $crate::log_trading!($crate::logging::LogLevel::Info, $category, $($arg)*);
    };
}

#[macro_export]
macro_rules! log_warning {
    ($category:expr, $($arg:tt)*) => {
        $crate::log_trading!($crate::logging::LogLevel::Warning, $category, $($arg)*);
    };
}

#[macro_export]
macro_rules! log_error {
    ($category:expr, $($arg:tt)*) => {
        $crate::log_trading!($crate::logging::LogLevel::Error, $category, $($arg)*);
    };
}

#[macro_export]
macro_rules! log_critical {
    ($category:expr, $($arg:tt)*) => {
        $crate::log_trading!($crate::logging::LogLevel::Critical, $category, $($arg)*);
    };
}