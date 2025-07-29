// Advanced Trading Agent - Professional Trading Features
// Phase 3 Week 7 Implementation

pub mod order_management;
pub mod portfolio_analytics;
pub mod risk_engine;
pub mod technical_analysis;

use std::sync::Arc;
use tokio::sync::RwLock;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use crate::errors::TradingResult;

/// Advanced Trading Engine - Central coordinator for professional trading features
pub struct AdvancedTradingEngine {
    pub order_manager: Arc<RwLock<order_management::ProfessionalOrderManager>>,
    pub portfolio_analytics: Arc<RwLock<portfolio_analytics::RealTimePortfolioAnalyzer>>,
    pub risk_engine: Arc<RwLock<risk_engine::AdvancedRiskEngine>>,
    pub technical_analyzer: Arc<RwLock<technical_analysis::TechnicalAnalysisEngine>>,
}

/// Advanced order types for professional trading
#[derive(Debug, Clone, Eq, Hash, PartialEq, Serialize, Deserialize)]
pub enum AdvancedOrderType {
    Market,
    Limit,
    StopLoss { stop_price: Decimal, limit_price: Option<Decimal> },
    TakeProfit { take_profit_price: Decimal },
    TrailingStop { trail_amount: Decimal, trail_percent: Option<Decimal> },
    OCO { stop_price: Decimal, limit_price: Decimal }, // One-Cancels-Other
    Bracket { take_profit: Decimal, stop_loss: Decimal },
}

/// Advanced order request with professional features
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedOrderRequest {
    pub symbol: String,
    pub side: OrderSide,
    pub order_type: AdvancedOrderType,
    pub quantity: Decimal,
    pub price: Option<Decimal>,
    pub time_in_force: TimeInForce,
    pub reduce_only: bool,
    pub post_only: bool,
    pub client_order_id: Option<String>,
    pub risk_limits: Option<RiskLimits>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderSide {
    Buy,
    Sell,
    Long,
    Short,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TimeInForce {
    GTC, // Good Till Cancelled
    IOC, // Immediate or Cancel
    FOK, // Fill or Kill
    GTD(chrono::DateTime<chrono::Utc>), // Good Till Date
}

/// Risk limits for advanced orders
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskLimits {
    pub max_position_size: Option<Decimal>,
    pub max_loss_percent: Option<Decimal>,
    pub max_drawdown: Option<Decimal>,
    pub stop_loss_required: bool,
}

/// Professional portfolio metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortfolioMetrics {
    pub total_value: Decimal,
    pub unrealized_pnl: Decimal,
    pub realized_pnl: Decimal,
    pub daily_pnl: Decimal,
    pub total_return: Decimal,
    pub sharpe_ratio: Option<f64>,
    pub sortino_ratio: Option<f64>,
    pub max_drawdown: Decimal,
    pub calmar_ratio: Option<f64>,
    pub value_at_risk: Decimal,
    pub beta: Option<f64>,
    pub alpha: Option<f64>,
    pub win_rate: f64,
    pub profit_factor: f64,
    pub positions_count: usize,
    pub risk_exposure: Decimal,
}

/// Real-time risk assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub position_risk: Decimal,
    pub portfolio_risk: Decimal,
    pub correlation_risk: Decimal,
    pub liquidity_risk: Decimal,
    pub concentration_risk: Decimal,
    pub market_risk: Decimal,
    pub var_1_day: Decimal,
    pub var_1_week: Decimal,
    pub stress_test_scenarios: Vec<StressTestResult>,
    pub risk_warnings: Vec<RiskWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressTestResult {
    pub scenario_name: String,
    pub potential_loss: Decimal,
    pub probability: f64,
    pub impact_severity: RiskSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskWarning {
    pub warning_type: String,
    pub severity: RiskSeverity,
    pub message: String,
    pub recommended_action: String,
}

impl AdvancedTradingEngine {
    /// Initialize the advanced trading engine
    pub async fn new() -> TradingResult<Self> {
        let order_manager = Arc::new(RwLock::new(
            order_management::ProfessionalOrderManager::new().await?
        ));
        
        let portfolio_analytics = Arc::new(RwLock::new(
            portfolio_analytics::RealTimePortfolioAnalyzer::new().await?
        ));
        
        let risk_engine = Arc::new(RwLock::new(
            risk_engine::AdvancedRiskEngine::new().await?
        ));
        
        let technical_analyzer = Arc::new(RwLock::new(
            technical_analysis::TechnicalAnalysisEngine::new().await?
        ));

        Ok(Self {
            order_manager,
            portfolio_analytics,
            risk_engine,
            technical_analyzer,
        })
    }

    /// Place an advanced order with professional features
    pub async fn place_advanced_order(&self, order: AdvancedOrderRequest) -> TradingResult<String> {
        // Pre-trade risk assessment
        let risk_assessment = self.risk_engine.read().await
            .assess_order_risk(&order).await?;
        
        if risk_assessment.risk_warnings.iter().any(|w| matches!(w.severity, RiskSeverity::Critical)) {
            return Err(crate::errors::TradingError::trading_logic_error(
                crate::errors::TradingLogicErrorType::RiskLimitExceeded,
                "Critical risk detected - order rejected".to_string(),
                Some(order.symbol),
            ));
        }

        // Execute order through professional order manager
        let order_id = self.order_manager.write().await
            .place_advanced_order(order).await?;

        // Update portfolio analytics
        self.portfolio_analytics.write().await
            .update_metrics().await?;

        Ok(order_id)
    }

    /// Get real-time portfolio metrics
    pub async fn get_portfolio_metrics(&self) -> TradingResult<PortfolioMetrics> {
        self.portfolio_analytics.read().await
            .get_current_metrics().await
    }

    /// Perform comprehensive risk assessment
    pub async fn assess_portfolio_risk(&self) -> TradingResult<RiskAssessment> {
        self.risk_engine.read().await
            .assess_portfolio_risk().await
    }

    /// Get technical analysis for a symbol
    pub async fn get_technical_analysis(&self, symbol: &str, timeframe: &str) -> TradingResult<technical_analysis::TechnicalAnalysisResult> {
        self.technical_analyzer.read().await
            .analyze_symbol(symbol, timeframe).await
    }

    /// Emergency stop all trading activities
    pub async fn emergency_stop(&self) -> TradingResult<()> {
        // Cancel all open orders
        self.order_manager.write().await
            .cancel_all_orders().await?;
        
        // Close all positions if risk is critical
        let risk_assessment = self.assess_portfolio_risk().await?;
        if risk_assessment.risk_warnings.iter().any(|w| matches!(w.severity, RiskSeverity::Critical)) {
            self.order_manager.write().await
                .close_all_positions().await?;
        }

        Ok(())
    }

    /// Get performance analytics
    pub async fn get_performance_report(&self, period_days: u32) -> TradingResult<portfolio_analytics::PerformanceReport> {
        self.portfolio_analytics.read().await
            .generate_performance_report(period_days).await
    }
}

/// Advanced trading configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedTradingConfig {
    pub enable_advanced_orders: bool,
    pub max_concurrent_orders: usize,
    pub default_risk_limits: RiskLimits,
    pub auto_risk_management: bool,
    pub slippage_tolerance: Decimal,
    pub max_position_size_percent: Decimal,
    pub portfolio_risk_limit: Decimal,
}

impl Default for AdvancedTradingConfig {
    fn default() -> Self {
        Self {
            enable_advanced_orders: true,
            max_concurrent_orders: 10,
            default_risk_limits: RiskLimits {
                max_position_size: Some(Decimal::from(10000)),
                max_loss_percent: Some(Decimal::from(5)),
                max_drawdown: Some(Decimal::from(10)),
                stop_loss_required: true,
            },
            auto_risk_management: true,
            slippage_tolerance: Decimal::from_f64_retain(0.005).unwrap(), // 0.5%
            max_position_size_percent: Decimal::from(25), // 25% of portfolio
            portfolio_risk_limit: Decimal::from(10), // 10% max portfolio risk
        }
    }
}