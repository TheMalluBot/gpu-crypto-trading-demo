/// Service layer for clean architecture and dependency injection
/// 
/// This module provides:
/// - Service interfaces for all major components
/// - Dependency injection container
/// - Event-driven communication
/// - Testable architecture

pub mod trading_service;
pub mod market_data_service;
pub mod risk_service;
pub mod gpu_service;
pub mod websocket_service;

use std::sync::Arc;
use async_trait::async_trait;
use crate::errors::TradingResult;
use crate::models::*;

/// Main service container for dependency injection
#[derive(Clone)]
pub struct ServiceContainer {
    pub trading: Arc<dyn TradingServiceTrait + Send + Sync>,
    pub market_data: Arc<dyn MarketDataServiceTrait + Send + Sync>,
    pub risk: Arc<dyn RiskServiceTrait + Send + Sync>,
    pub gpu: Arc<dyn GpuServiceTrait + Send + Sync>,
    pub websocket: Arc<dyn WebSocketServiceTrait + Send + Sync>,
}

impl ServiceContainer {
    /// Create service container with production implementations
    pub async fn new_production() -> TradingResult<Self> {
        let config = crate::config::AppConfig::load_default().await?;
        
        let gpu = Arc::new(gpu_service::GpuService::new(config.gpu.clone()).await?);
        let market_data = Arc::new(market_data_service::MarketDataService::new(config.network.clone()).await?);
        let risk = Arc::new(risk_service::RiskService::new(config.trading.clone()).await?);
        let trading = Arc::new(trading_service::TradingService::new(
            config.trading.clone(),
            market_data.clone(),
            risk.clone(),
        ).await?);
        let websocket = Arc::new(websocket_service::WebSocketService::new(config.network.clone()).await?);

        Ok(Self {
            trading,
            market_data,
            risk,
            gpu,
            websocket,
        })
    }

    /// Create service container for testing
    #[cfg(test)]
    pub fn new_test() -> Self {
        use crate::services::mocks::*;
        
        Self {
            trading: Arc::new(MockTradingService::new()),
            market_data: Arc::new(MockMarketDataService::new()),
            risk: Arc::new(MockRiskService::new()),
            gpu: Arc::new(MockGpuService::new()),
            websocket: Arc::new(MockWebSocketService::new()),
        }
    }
}

/// Trading service interface - preserves all existing trading functionality
#[async_trait]
pub trait TradingServiceTrait {
    // Core trading operations
    async fn place_order(&self, order: OrderRequest) -> TradingResult<Trade>;
    async fn cancel_order(&self, order_id: &str) -> TradingResult<()>;
    async fn get_account_info(&self) -> TradingResult<AccountInfo>;
    async fn get_positions(&self) -> TradingResult<Vec<Position>>;
    
    // Bot operations - preserving existing bot functionality
    async fn start_swing_bot(&self, config: crate::trading_strategy::LROConfig) -> TradingResult<()>;
    async fn stop_swing_bot(&self) -> TradingResult<()>;
    async fn pause_swing_bot(&self) -> TradingResult<()>;
    async fn resume_swing_bot(&self) -> TradingResult<()>;
    async fn update_bot_config(&self, config: crate::trading_strategy::LROConfig) -> TradingResult<()>;
    async fn get_bot_status(&self) -> TradingResult<crate::trading_strategy::BotStatus>;
    
    // Paper trading - preserving existing functionality
    async fn get_paper_trades(&self) -> TradingResult<Vec<Trade>>;
    async fn set_account_balance(&self, balance: rust_decimal::Decimal) -> TradingResult<()>;
    
    // Safety features - preserving existing safety mechanisms
    async fn trigger_emergency_stop(&self) -> TradingResult<()>;
    async fn reset_emergency_stop(&self) -> TradingResult<()>;
    async fn get_safety_status(&self) -> TradingResult<SafetyStatus>;
    async fn reset_daily_loss_tracker(&self) -> TradingResult<()>;
}

/// Market data service interface - preserves all existing market data functionality
#[async_trait]
pub trait MarketDataServiceTrait {
    // Basic market data
    async fn get_klines(&self, symbol: &str, interval: &str, limit: u32) -> TradingResult<Vec<KlineData>>;
    async fn get_ticker(&self, symbol: &str) -> TradingResult<TickerData>;
    async fn get_order_book(&self, symbol: &str, limit: u32) -> TradingResult<OrderBookDepth>;
    
    // Symbol management - preserving existing functionality
    async fn get_all_symbols(&self) -> TradingResult<Vec<SymbolInfo>>;
    async fn search_symbols(&self, query: &str, limit: usize) -> TradingResult<Vec<SymbolInfo>>;
    async fn get_popular_symbols(&self) -> TradingResult<Vec<SymbolInfo>>;
    
    // Market analysis - preserving existing functionality
    async fn get_market_stats(&self, symbol: &str) -> TradingResult<MarketStats>;
    async fn analyze_market_conditions(&self, symbol: &str) -> TradingResult<MarketAnalysis>;
    async fn get_market_depth_analysis(&self, symbol: &str) -> TradingResult<MarketDepthAnalysis>;
    async fn get_liquidity_levels(&self, symbol: &str) -> TradingResult<Vec<LiquidityLevel>>;
    
    // Real-time data
    async fn subscribe_to_symbol(&self, symbol: &str) -> TradingResult<()>;
    async fn unsubscribe_from_symbol(&self, symbol: &str) -> TradingResult<()>;
}

/// Risk management service interface - preserves all existing risk features
#[async_trait]
pub trait RiskServiceTrait {
    async fn assess_order_risk(&self, order: &OrderRequest) -> TradingResult<RiskAssessment>;
    async fn check_position_limits(&self) -> TradingResult<bool>;
    async fn calculate_position_size(&self, symbol: &str, risk_percent: f64) -> TradingResult<rust_decimal::Decimal>;
    async fn should_close_position(&self, position: &Position) -> TradingResult<bool>;
    async fn update_safety_config(&self, config: SafetyConfig) -> TradingResult<()>;
    async fn get_bot_performance_history(&self) -> TradingResult<Vec<PerformanceMetric>>;
}

/// GPU service interface - preserves all existing GPU functionality
#[async_trait]
pub trait GpuServiceTrait {
    // LRO calculations - preserving existing GPU acceleration
    async fn calculate_lro(&self, prices: &[f64], period: usize, signal_period: usize) -> TradingResult<(f64, f64)>;
    async fn get_lro_signals(&self, symbol: &str) -> TradingResult<Vec<LROSignal>>;
    
    // GPU stats and management
    async fn get_gpu_stats(&self) -> TradingResult<GpuStats>;
    async fn get_texture_data(&self) -> TradingResult<Vec<u8>>;
    
    // Risk analysis - preserving existing GPU risk features
    async fn analyze_trading_risk(&self, data: &[PriceData]) -> TradingResult<TradingRiskAssessment>;
}

/// WebSocket service interface - preserves all existing WebSocket functionality
#[async_trait]
pub trait WebSocketServiceTrait {
    async fn connect(&self, symbol: &str) -> TradingResult<()>;
    async fn disconnect(&self) -> TradingResult<()>;
    async fn change_symbol(&self, symbol: &str) -> TradingResult<()>;
    async fn get_connection_status(&self) -> TradingResult<ConnectionStatus>;
    
    // Order book streaming - preserving existing functionality
    async fn start_order_book_feed(&self, symbol: &str) -> TradingResult<()>;
    async fn enable_depth_analysis(&self, enabled: bool) -> TradingResult<()>;
    async fn feed_order_book_data(&self, data: OrderBookDepth) -> TradingResult<()>;
}

// Placeholder types for interfaces (will be properly defined in models)
#[derive(Debug, Clone)]
pub struct Position {
    pub symbol: String,
    pub size: rust_decimal::Decimal,
    pub side: TradeSide,
    pub entry_price: rust_decimal::Decimal,
}

#[derive(Debug, Clone)]
pub struct RiskAssessment {
    pub risk_level: String,
    pub max_loss: rust_decimal::Decimal,
    pub recommended_size: rust_decimal::Decimal,
}

#[derive(Debug, Clone)]
pub struct SafetyStatus {
    pub emergency_stop_active: bool,
    pub daily_loss_percent: f64,
    pub max_position_hold_hours: u32,
}

#[derive(Debug, Clone)]
pub struct SafetyConfig {
    pub max_daily_loss_percent: f64,
    pub max_position_hold_hours: u32,
    pub emergency_stop_enabled: bool,
}

#[derive(Debug, Clone)]
pub struct PerformanceMetric {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub profit_loss: rust_decimal::Decimal,
    pub win_rate: f64,
}

#[derive(Debug, Clone)]
pub struct LROSignal {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub value: f64,
    pub signal: f64,
    pub trend: String,
}

#[derive(Debug, Clone)]
pub struct GpuStats {
    pub memory_used: u64,
    pub memory_total: u64,
    pub compute_utilization: f32,
}

#[derive(Debug, Clone)]
pub struct TradingRiskAssessment {
    pub volatility: f64,
    pub trend_strength: f64,
    pub risk_score: f64,
}

#[derive(Debug, Clone)]
pub struct ConnectionStatus {
    pub connected: bool,
    pub symbol: String,
    pub last_ping: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone)]
pub struct MarketAnalysis {
    pub trend: String,
    pub volatility: f64,
    pub support_levels: Vec<f64>,
    pub resistance_levels: Vec<f64>,
}

// Mock implementations for testing
#[cfg(test)]
mod mocks {
    use super::*;
    
    pub struct MockTradingService;
    impl MockTradingService { pub fn new() -> Self { Self } }
    
    pub struct MockMarketDataService;
    impl MockMarketDataService { pub fn new() -> Self { Self } }
    
    pub struct MockRiskService;
    impl MockRiskService { pub fn new() -> Self { Self } }
    
    pub struct MockGpuService;
    impl MockGpuService { pub fn new() -> Self { Self } }
    
    pub struct MockWebSocketService;
    impl MockWebSocketService { pub fn new() -> Self { Self } }
    
    // Mock trait implementations would go here...
}
