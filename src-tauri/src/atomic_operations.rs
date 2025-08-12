// Thread-safe atomic operations for bot state management
// Prevents race conditions in concurrent bot operations

use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::errors::{TradingError, TradingResult};

/// Atomic bot state manager to prevent race conditions
#[derive(Debug)]
pub struct AtomicBotState {
    // Core state flags
    is_running: AtomicBool,
    is_paused: AtomicBool,
    is_processing_signal: AtomicBool,
    is_emergency_stopped: AtomicBool,
    
    // Operation tracking
    operation_counter: AtomicU64,
    last_operation_timestamp: AtomicU64,
    active_operations: AtomicUsize,
    
    // Performance metrics
    total_signals_processed: AtomicU64,
    total_trades_executed: AtomicU64,
    last_heartbeat: AtomicU64,
}

impl Default for AtomicBotState {
    fn default() -> Self {
        Self::new()
    }
}

impl AtomicBotState {
    pub fn new() -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
            
        Self {
            is_running: AtomicBool::new(false),
            is_paused: AtomicBool::new(false),
            is_processing_signal: AtomicBool::new(false),
            is_emergency_stopped: AtomicBool::new(false),
            operation_counter: AtomicU64::new(0),
            last_operation_timestamp: AtomicU64::new(now),
            active_operations: AtomicUsize::new(0),
            total_signals_processed: AtomicU64::new(0),
            total_trades_executed: AtomicU64::new(0),
            last_heartbeat: AtomicU64::new(now),
        }
    }
    
    /// Atomically start the bot (prevents multiple simultaneous starts)
    pub fn try_start(&self) -> TradingResult<()> {
        // Check if emergency stop is active
        if self.is_emergency_stopped.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Cannot start bot: Emergency stop is active".to_string(),
                None
            ));
        }
        
        // Check if already running or paused
        if self.is_running.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Bot is already running".to_string(),
                None
            ));
        }
        
        // Atomic compare-and-swap to start the bot
        match self.is_running.compare_exchange(
            false, 
            true, 
            Ordering::AcqRel, 
            Ordering::Acquire
        ) {
            Ok(_) => {
                // Successfully started - reset paused state
                self.is_paused.store(false, Ordering::Release);
                self.update_operation_timestamp();
                self.increment_operation_counter();
                Ok(())
            },
            Err(_) => {
                Err(TradingError::validation_error(
                    "bot_state".to_string(),
                    "Bot start failed: Another thread started the bot".to_string(),
                    None
                ))
            }
        }
    }
    
    /// Atomically stop the bot
    pub fn try_stop(&self) -> TradingResult<()> {
        // Can stop from any state except emergency stop
        if self.is_emergency_stopped.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Cannot stop bot: Emergency stop is active - use reset_emergency_stop first".to_string(),
                None
            ));
        }
        
        // Atomic stop
        self.is_running.store(false, Ordering::Release);
        self.is_paused.store(false, Ordering::Release);
        self.update_operation_timestamp();
        self.increment_operation_counter();
        
        Ok(())
    }
    
    /// Atomically pause the bot (only if running)
    pub fn try_pause(&self) -> TradingResult<()> {
        if !self.is_running.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Cannot pause bot: Bot is not running".to_string(),
                None
            ));
        }
        
        if self.is_emergency_stopped.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Cannot pause bot: Emergency stop is active".to_string(),
                None
            ));
        }
        
        // Atomic pause
        match self.is_paused.compare_exchange(
            false,
            true,
            Ordering::AcqRel,
            Ordering::Acquire
        ) {
            Ok(_) => {
                self.update_operation_timestamp();
                self.increment_operation_counter();
                Ok(())
            },
            Err(_) => {
                Err(TradingError::validation_error(
                    "bot_state".to_string(),
                    "Bot is already paused".to_string(),
                    None
                ))
            }
        }
    }
    
    /// Atomically resume the bot (only if paused)
    pub fn try_resume(&self) -> TradingResult<()> {
        if !self.is_running.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Cannot resume bot: Bot is not running".to_string(),
                None
            ));
        }
        
        if !self.is_paused.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Cannot resume bot: Bot is not paused".to_string(),
                None
            ));
        }
        
        if self.is_emergency_stopped.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Cannot resume bot: Emergency stop is active".to_string(),
                None
            ));
        }
        
        // Atomic resume
        match self.is_paused.compare_exchange(
            true,
            false,
            Ordering::AcqRel,
            Ordering::Acquire
        ) {
            Ok(_) => {
                self.update_operation_timestamp();
                self.increment_operation_counter();
                Ok(())
            },
            Err(_) => {
                Err(TradingError::validation_error(
                    "bot_state".to_string(),
                    "Resume failed: Bot state changed during operation".to_string(),
                    None
                ))
            }
        }
    }
    
    /// Atomically trigger emergency stop
    pub fn trigger_emergency_stop(&self) -> TradingResult<()> {
        // Emergency stop is always allowed
        self.is_emergency_stopped.store(true, Ordering::Release);
        self.is_running.store(false, Ordering::Release);
        self.is_paused.store(false, Ordering::Release);
        self.is_processing_signal.store(false, Ordering::Release);
        
        self.update_operation_timestamp();
        self.increment_operation_counter();
        
        Ok(())
    }
    
    /// Reset emergency stop (requires validation)
    pub fn reset_emergency_stop(&self) -> TradingResult<()> {
        if !self.is_emergency_stopped.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Emergency stop is not active".to_string(),
                None
            ));
        }
        
        // Additional safety checks before reset
        if self.active_operations.load(Ordering::Acquire) > 0 {
            return Err(TradingError::validation_error(
                "bot_state".to_string(),
                "Cannot reset emergency stop: Active operations detected".to_string(),
                None
            ));
        }
        
        // Reset emergency stop
        self.is_emergency_stopped.store(false, Ordering::Release);
        self.update_operation_timestamp();
        self.increment_operation_counter();
        
        Ok(())
    }
    
    /// Try to acquire signal processing lock
    pub fn try_acquire_signal_processing(&self) -> TradingResult<SignalProcessingGuard> {
        // Check if bot is in a state where signal processing is allowed
        if !self.is_running.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "signal_processing".to_string(),
                "Cannot process signals: Bot is not running".to_string(),
                None
            ));
        }
        
        if self.is_paused.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "signal_processing".to_string(),
                "Cannot process signals: Bot is paused".to_string(),
                None
            ));
        }
        
        if self.is_emergency_stopped.load(Ordering::Acquire) {
            return Err(TradingError::validation_error(
                "signal_processing".to_string(),
                "Cannot process signals: Emergency stop is active".to_string(),
                None
            ));
        }
        
        // Try to acquire signal processing lock
        match self.is_processing_signal.compare_exchange(
            false,
            true,
            Ordering::AcqRel,
            Ordering::Acquire
        ) {
            Ok(_) => {
                self.active_operations.fetch_add(1, Ordering::AcqRel);
                Ok(SignalProcessingGuard::new(self))
            },
            Err(_) => {
                Err(TradingError::validation_error(
                    "signal_processing".to_string(),
                    "Signal processing is already in progress".to_string(),
                    None
                ))
            }
        }
    }
    
    /// Get current bot state
    pub fn get_state(&self) -> BotStateSnapshot {
        BotStateSnapshot {
            is_running: self.is_running.load(Ordering::Acquire),
            is_paused: self.is_paused.load(Ordering::Acquire),
            is_processing_signal: self.is_processing_signal.load(Ordering::Acquire),
            is_emergency_stopped: self.is_emergency_stopped.load(Ordering::Acquire),
            operation_counter: self.operation_counter.load(Ordering::Acquire),
            last_operation_timestamp: self.last_operation_timestamp.load(Ordering::Acquire),
            active_operations: self.active_operations.load(Ordering::Acquire),
            total_signals_processed: self.total_signals_processed.load(Ordering::Acquire),
            total_trades_executed: self.total_trades_executed.load(Ordering::Acquire),
            last_heartbeat: self.last_heartbeat.load(Ordering::Acquire),
        }
    }
    
    /// Update heartbeat (for health monitoring)
    pub fn update_heartbeat(&self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        self.last_heartbeat.store(now, Ordering::Release);
    }
    
    /// Increment signal processing counter
    pub fn increment_signals_processed(&self) {
        self.total_signals_processed.fetch_add(1, Ordering::AcqRel);
    }
    
    /// Increment trade execution counter
    pub fn increment_trades_executed(&self) {
        self.total_trades_executed.fetch_add(1, Ordering::AcqRel);
    }
    
    // Private helper methods
    fn update_operation_timestamp(&self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        self.last_operation_timestamp.store(now, Ordering::Release);
    }
    
    fn increment_operation_counter(&self) {
        self.operation_counter.fetch_add(1, Ordering::AcqRel);
    }
}

/// RAII guard for signal processing operations
pub struct SignalProcessingGuard<'a> {
    state: &'a AtomicBotState,
}

impl<'a> SignalProcessingGuard<'a> {
    fn new(state: &'a AtomicBotState) -> Self {
        Self { state }
    }
}

impl<'a> Drop for SignalProcessingGuard<'a> {
    fn drop(&mut self) {
        // Release signal processing lock
        self.state.is_processing_signal.store(false, Ordering::Release);
        self.state.active_operations.fetch_sub(1, Ordering::AcqRel);
        self.state.increment_signals_processed();
    }
}

/// Snapshot of bot state at a point in time
#[derive(Debug, Clone)]
pub struct BotStateSnapshot {
    pub is_running: bool,
    pub is_paused: bool,
    pub is_processing_signal: bool,
    pub is_emergency_stopped: bool,
    pub operation_counter: u64,
    pub last_operation_timestamp: u64,
    pub active_operations: usize,
    pub total_signals_processed: u64,
    pub total_trades_executed: u64,
    pub last_heartbeat: u64,
}

impl BotStateSnapshot {
    /// Check if bot is in a healthy state
    pub fn is_healthy(&self) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
            
        // Consider bot unhealthy if no heartbeat in last 60 seconds
        let heartbeat_threshold = 60;
        let heartbeat_age = now.saturating_sub(self.last_heartbeat);
        
        !self.is_emergency_stopped && heartbeat_age < heartbeat_threshold
    }
    
    /// Get human-readable state description
    pub fn state_description(&self) -> String {
        if self.is_emergency_stopped {
            "Emergency Stop Active".to_string()
        } else if !self.is_running {
            "Stopped".to_string()
        } else if self.is_paused {
            "Paused".to_string()
        } else if self.is_processing_signal {
            "Processing Signal".to_string()
        } else {
            "Running".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;
    
    #[test]
    fn test_atomic_bot_start_stop() {
        let state = AtomicBotState::new();
        
        // Initial state should be stopped
        assert!(!state.get_state().is_running);
        
        // Start bot
        state.try_start().unwrap();
        assert!(state.get_state().is_running);
        
        // Cannot start again
        assert!(state.try_start().is_err());
        
        // Stop bot
        state.try_stop().unwrap();
        assert!(!state.get_state().is_running);
    }
    
    #[test]
    fn test_atomic_pause_resume() {
        let state = AtomicBotState::new();
        
        // Cannot pause when not running
        assert!(state.try_pause().is_err());
        
        // Start bot first
        state.try_start().unwrap();
        
        // Pause bot
        state.try_pause().unwrap();
        assert!(state.get_state().is_paused);
        
        // Cannot pause again
        assert!(state.try_pause().is_err());
        
        // Resume bot
        state.try_resume().unwrap();
        assert!(!state.get_state().is_paused);
        assert!(state.get_state().is_running);
    }
    
    #[test]
    fn test_emergency_stop() {
        let state = AtomicBotState::new();
        
        // Start bot
        state.try_start().unwrap();
        
        // Trigger emergency stop
        state.trigger_emergency_stop().unwrap();
        assert!(state.get_state().is_emergency_stopped);
        assert!(!state.get_state().is_running);
        
        // Cannot start while emergency stop is active
        assert!(state.try_start().is_err());
        
        // Reset emergency stop
        state.reset_emergency_stop().unwrap();
        assert!(!state.get_state().is_emergency_stopped);
        
        // Now can start again
        state.try_start().unwrap();
        assert!(state.get_state().is_running);
    }
    
    #[test]
    fn test_signal_processing_guard() {
        let state = AtomicBotState::new();
        
        // Start bot first
        state.try_start().unwrap();
        
        // Acquire signal processing lock
        {
            let _guard = state.try_acquire_signal_processing().unwrap();
            assert!(state.get_state().is_processing_signal);
            
            // Cannot acquire again
            assert!(state.try_acquire_signal_processing().is_err());
        } // Guard drops here
        
        // Lock should be released
        assert!(!state.get_state().is_processing_signal);
    }
    
    #[test]
    fn test_concurrent_operations() {
        let state = Arc::new(AtomicBotState::new());
        let state_clone = Arc::clone(&state);
        
        // Try to start bot from multiple threads
        let handle = thread::spawn(move || {
            state_clone.try_start()
        });
        
        let result1 = state.try_start();
        let result2 = handle.join().unwrap();
        
        // Only one should succeed
        assert!(result1.is_ok() ^ result2.is_ok());
        assert!(state.get_state().is_running);
    }
    
    #[test]
    fn test_state_counters() {
        let state = AtomicBotState::new();
        
        let initial_counter = state.get_state().operation_counter;
        
        state.try_start().unwrap();
        assert!(state.get_state().operation_counter > initial_counter);
        
        state.increment_signals_processed();
        assert_eq!(state.get_state().total_signals_processed, 1);
        
        state.increment_trades_executed();
        assert_eq!(state.get_state().total_trades_executed, 1);
    }
}