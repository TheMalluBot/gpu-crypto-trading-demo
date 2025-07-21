use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

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
    min_level: LogLevel,
    log_file: Mutex<Option<std::fs::File>>,
    console_enabled: bool,
    buffer: Mutex<Vec<LogEntry>>,
    max_buffer_size: usize,
}

impl TradingLogger {
    /// Create new logger with configuration
    pub fn new(min_level: LogLevel, log_file_path: Option<&str>, console_enabled: bool) -> Result<Self, std::io::Error> {
        let log_file = if let Some(path) = log_file_path {
            let file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)?;
            Some(file)
        } else {
            None
        };

        Ok(Self {
            min_level,
            log_file: Mutex::new(log_file),
            console_enabled,
            buffer: Mutex::new(Vec::new()),
            max_buffer_size: 1000, // Keep last 1000 log entries in memory
        })
    }

    /// Log a message with context
    pub fn log_with_context(
        &self,
        level: LogLevel,
        category: LogCategory,
        message: &str,
        context: Option<serde_json::Value>,
    ) {
        if level < self.min_level {
            return;
        }

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
        if self.console_enabled {
            match entry.level {
                LogLevel::Error | LogLevel::Critical => eprintln!("{}", formatted),
                _ => println!("{}", formatted),
            }
        }

        // Write to file if available
        if let Ok(mut file_guard) = self.log_file.lock() {
            if let Some(ref mut file) = *file_guard {
                let _ = writeln!(file, "{}", formatted);
                let _ = file.flush();
            }
        }
    }

    /// Add log entry to in-memory buffer
    fn buffer_log(&self, entry: LogEntry) {
        let mut buffer = self.buffer.lock().unwrap();
        buffer.push(entry);
        
        // Prevent unlimited growth
        if buffer.len() > self.max_buffer_size * 2 {
            buffer.drain(0..self.max_buffer_size);
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

/// Initialize global logger
pub fn init_logger(min_level: LogLevel, log_file_path: Option<&str>, console_enabled: bool) -> Result<(), std::io::Error> {
    let logger = TradingLogger::new(min_level, log_file_path, console_enabled)?;
    GLOBAL_LOGGER.set(logger).map_err(|_| {
        std::io::Error::new(std::io::ErrorKind::AlreadyExists, "Logger already initialized")
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