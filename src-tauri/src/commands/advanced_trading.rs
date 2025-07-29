// Advanced Trading Commands - Professional Trading Features
// Advanced Trading Agent - Week 7 Implementation

use tauri::State;
use serde::{Deserialize, Serialize};
use rust_decimal::prelude::ToPrimitive;
use crate::TradingState;
use crate::advanced_trading::{
    AdvancedTradingEngine, AdvancedOrderRequest, AdvancedOrderType, OrderSide, TimeInForce,
    PortfolioMetrics, RiskAssessment, RiskLimits
};
use crate::advanced_trading::technical_analysis::TechnicalAnalysisResult;
use crate::advanced_trading::portfolio_analytics::PerformanceReport;
use crate::advanced_trading::order_management::{ActiveOrder, CompletedOrder};
use rust_decimal::Decimal;

/// Initialize the advanced trading engine
#[tauri::command]
pub async fn initialize_advanced_trading(
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    // Initialize the advanced trading engine
    let engine = AdvancedTradingEngine::new().await
        .map_err(|e| format!("Failed to initialize advanced trading engine: {}", e))?;
    
    // Store in state
    let mut advanced_engine = trading_state.advanced_trading_engine.write().await;
    *advanced_engine = Some(engine);
    
    Ok(())
}

/// Place an advanced order with professional features
#[tauri::command]
pub async fn place_advanced_order(
    order_request: AdvancedOrderRequestDto,
    trading_state: State<'_, TradingState>
) -> Result<String, String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    // Convert DTO to internal type
    let order = AdvancedOrderRequest {
        symbol: order_request.symbol,
        side: match order_request.side.as_str() {
            "Buy" => OrderSide::Buy,
            "Sell" => OrderSide::Sell,
            "Long" => OrderSide::Long,
            "Short" => OrderSide::Short,
            _ => return Err("Invalid order side".to_string()),
        },
        order_type: parse_order_type(order_request.order_type)?,
        quantity: Decimal::from_f64_retain(order_request.quantity)
            .ok_or("Invalid quantity")?,
        price: order_request.price.and_then(|p| Decimal::from_f64_retain(p)),
        time_in_force: TimeInForce::GTC, // Default to Good Till Cancelled
        reduce_only: order_request.reduce_only.unwrap_or(false),
        post_only: order_request.post_only.unwrap_or(false),
        client_order_id: order_request.client_order_id,
        risk_limits: order_request.risk_limits.map(|rl| RiskLimits {
            max_position_size: rl.max_position_size.map(Decimal::from_f64_retain).flatten(),
            max_loss_percent: rl.max_loss_percent.map(Decimal::from_f64_retain).flatten(),
            max_drawdown: rl.max_drawdown.map(Decimal::from_f64_retain).flatten(),
            stop_loss_required: rl.stop_loss_required.unwrap_or(false),
        }),
    };
    
    engine.place_advanced_order(order).await
        .map_err(|e| format!("Failed to place advanced order: {}", e))
}

/// Cancel a specific order
#[tauri::command]
pub async fn cancel_advanced_order(
    order_id: String,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    match engine_guard.as_ref() {
        Some(engine) => {
            engine.order_manager.write().await
                .cancel_order(&order_id).await
                .map_err(|e| format!("Failed to cancel order: {}", e))
        },
        None => Err("Advanced trading engine not initialized".to_string())
    }
}

/// Get active orders
#[tauri::command]
pub async fn get_active_orders(
    trading_state: State<'_, TradingState>
) -> Result<Vec<ActiveOrderDto>, String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    let orders = engine.order_manager.read().await
        .get_active_orders().await
        .map_err(|e| format!("Failed to get active orders: {}", e))?;
    
    Ok(orders.into_iter().map(ActiveOrderDto::from).collect())
}

/// Get order history
#[tauri::command]
pub async fn get_order_history(
    limit: Option<usize>,
    trading_state: State<'_, TradingState>
) -> Result<Vec<CompletedOrderDto>, String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    let orders = engine.order_manager.read().await
        .get_order_history(limit).await
        .map_err(|e| format!("Failed to get order history: {}", e))?;
    
    Ok(orders.into_iter().map(CompletedOrderDto::from).collect())
}

/// Get real-time portfolio metrics
#[tauri::command]
pub async fn get_portfolio_metrics(
    trading_state: State<'_, TradingState>
) -> Result<PortfolioMetricsDto, String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    let metrics = engine.get_portfolio_metrics().await
        .map_err(|e| format!("Failed to get portfolio metrics: {}", e))?;
    
    Ok(PortfolioMetricsDto::from(metrics))
}

/// Assess portfolio risk
#[tauri::command]
pub async fn assess_portfolio_risk(
    trading_state: State<'_, TradingState>
) -> Result<RiskAssessmentDto, String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    let assessment = engine.assess_portfolio_risk().await
        .map_err(|e| format!("Failed to assess portfolio risk: {}", e))?;
    
    Ok(RiskAssessmentDto::from(assessment))
}

/// Get technical analysis for a symbol
#[tauri::command]
pub async fn get_technical_analysis(
    symbol: String,
    timeframe: String,
    trading_state: State<'_, TradingState>
) -> Result<TechnicalAnalysisDto, String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    let analysis = engine.get_technical_analysis(&symbol, &timeframe).await
        .map_err(|e| format!("Failed to get technical analysis: {}", e))?;
    
    Ok(TechnicalAnalysisDto::from(analysis))
}

/// Get performance report
#[tauri::command]
pub async fn get_performance_report(
    period_days: u32,
    trading_state: State<'_, TradingState>
) -> Result<PerformanceReportDto, String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    let report = engine.get_performance_report(period_days).await
        .map_err(|e| format!("Failed to generate performance report: {}", e))?;
    
    Ok(PerformanceReportDto::from(report))
}

/// Emergency stop all trading activities
#[tauri::command]
pub async fn emergency_stop_advanced_trading(
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    engine.emergency_stop().await
        .map_err(|e| format!("Failed to execute emergency stop: {}", e))
}

/// Multi-timeframe technical analysis
#[tauri::command]
pub async fn multi_timeframe_analysis(
    symbol: String,
    trading_state: State<'_, TradingState>
) -> Result<std::collections::HashMap<String, TechnicalAnalysisDto>, String> {
    let engine_guard = trading_state.advanced_trading_engine.read().await;
    let engine = engine_guard.as_ref()
        .ok_or("Advanced trading engine not initialized")?;
    
    let mut analysis = engine.technical_analyzer.write().await
        .multi_timeframe_analysis(&symbol).await
        .map_err(|e| format!("Failed to perform multi-timeframe analysis: {}", e))?;
    
    let mut result = std::collections::HashMap::new();
    for (timeframe, ta_result) in analysis.drain() {
        result.insert(timeframe, TechnicalAnalysisDto::from(ta_result));
    }
    
    Ok(result)
}

// DTOs for frontend communication

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedOrderRequestDto {
    pub symbol: String,
    pub side: String, // "Buy", "Sell", "Long", "Short"
    pub order_type: AdvancedOrderTypeDto,
    pub quantity: f64,
    pub price: Option<f64>,
    pub reduce_only: Option<bool>,
    pub post_only: Option<bool>,
    pub client_order_id: Option<String>,
    pub risk_limits: Option<RiskLimitsDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AdvancedOrderTypeDto {
    Market,
    Limit,
    StopLoss { stop_price: f64, limit_price: Option<f64> },
    TakeProfit { take_profit_price: f64 },
    TrailingStop { trail_amount: f64, trail_percent: Option<f64> },
    OCO { stop_price: f64, limit_price: f64 },
    Bracket { take_profit: f64, stop_loss: f64 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskLimitsDto {
    pub max_position_size: Option<f64>,
    pub max_loss_percent: Option<f64>,
    pub max_drawdown: Option<f64>,
    pub stop_loss_required: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveOrderDto {
    pub id: String,
    pub symbol: String,
    pub side: String,
    pub order_type: String,
    pub quantity: f64,
    pub filled_quantity: f64,
    pub remaining_quantity: f64,
    pub price: Option<f64>,
    pub average_fill_price: Option<f64>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletedOrderDto {
    pub order: ActiveOrderDto,
    pub completion_reason: String,
    pub final_status: String,
    pub completed_at: String,
    pub total_fee: f64,
    pub net_pnl: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortfolioMetricsDto {
    pub total_value: f64,
    pub unrealized_pnl: f64,
    pub realized_pnl: f64,
    pub daily_pnl: f64,
    pub total_return: f64,
    pub sharpe_ratio: Option<f64>,
    pub sortino_ratio: Option<f64>,
    pub max_drawdown: f64,
    pub calmar_ratio: Option<f64>,
    pub value_at_risk: f64,
    pub beta: Option<f64>,
    pub alpha: Option<f64>,
    pub win_rate: f64,
    pub profit_factor: f64,
    pub positions_count: usize,
    pub risk_exposure: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessmentDto {
    pub position_risk: f64,
    pub portfolio_risk: f64,
    pub correlation_risk: f64,
    pub liquidity_risk: f64,
    pub concentration_risk: f64,
    pub market_risk: f64,
    pub var_1_day: f64,
    pub var_1_week: f64,
    pub stress_test_scenarios: Vec<StressTestResultDto>,
    pub risk_warnings: Vec<RiskWarningDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressTestResultDto {
    pub scenario_name: String,
    pub potential_loss: f64,
    pub probability: f64,
    pub impact_severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskWarningDto {
    pub warning_type: String,
    pub severity: String,
    pub message: String,
    pub recommended_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalAnalysisDto {
    pub symbol: String,
    pub timeframe: String,
    pub timestamp: String,
    pub current_price: f64,
    pub trend_direction: String,
    pub trend_strength: f64,
    pub rsi: f64,
    pub macd_signal: String,
    pub bollinger_position: f64,
    pub volume_trend: String,
    pub support_levels: Vec<f64>,
    pub resistance_levels: Vec<f64>,
    pub signals: Vec<TradingSignalDto>,
    pub overall_sentiment: String,
    pub confidence_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingSignalDto {
    pub signal_type: String,
    pub strength: String,
    pub price_target: Option<f64>,
    pub stop_loss: Option<f64>,
    pub time_horizon: String,
    pub confidence: f64,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceReportDto {
    pub period_start: String,
    pub period_end: String,
    pub total_return: f64,
    pub annualized_return: f64,
    pub volatility: f64,
    pub sharpe_ratio: f64,
    pub win_rate: f64,
    pub total_trades: usize,
    pub profitable_trades: usize,
    pub max_drawdown: f64,
    pub value_at_risk_95: f64,
}

// Helper functions

fn parse_order_type(order_type_dto: AdvancedOrderTypeDto) -> Result<AdvancedOrderType, String> {
    match order_type_dto {
        AdvancedOrderTypeDto::Market => Ok(AdvancedOrderType::Market),
        AdvancedOrderTypeDto::Limit => Ok(AdvancedOrderType::Limit),
        AdvancedOrderTypeDto::StopLoss { stop_price, limit_price } => {
            Ok(AdvancedOrderType::StopLoss {
                stop_price: Decimal::from_f64_retain(stop_price).ok_or("Invalid stop price")?,
                limit_price: limit_price.and_then(|p| Decimal::from_f64_retain(p)),
            })
        },
        AdvancedOrderTypeDto::TakeProfit { take_profit_price } => {
            Ok(AdvancedOrderType::TakeProfit {
                take_profit_price: Decimal::from_f64_retain(take_profit_price).ok_or("Invalid take profit price")?,
            })
        },
        AdvancedOrderTypeDto::TrailingStop { trail_amount, trail_percent } => {
            Ok(AdvancedOrderType::TrailingStop {
                trail_amount: Decimal::from_f64_retain(trail_amount).ok_or("Invalid trail amount")?,
                trail_percent: trail_percent.and_then(|p| Decimal::from_f64_retain(p)),
            })
        },
        AdvancedOrderTypeDto::OCO { stop_price, limit_price } => {
            Ok(AdvancedOrderType::OCO {
                stop_price: Decimal::from_f64_retain(stop_price).ok_or("Invalid stop price")?,
                limit_price: Decimal::from_f64_retain(limit_price).ok_or("Invalid limit price")?,
            })
        },
        AdvancedOrderTypeDto::Bracket { take_profit, stop_loss } => {
            Ok(AdvancedOrderType::Bracket {
                take_profit: Decimal::from_f64_retain(take_profit).ok_or("Invalid take profit")?,
                stop_loss: Decimal::from_f64_retain(stop_loss).ok_or("Invalid stop loss")?,
            })
        },
    }
}

// Conversion implementations

impl From<ActiveOrder> for ActiveOrderDto {
    fn from(order: ActiveOrder) -> Self {
        Self {
            id: order.id,
            symbol: order.symbol,
            side: format!("{:?}", order.side),
            order_type: format!("{:?}", order.order_type),
            quantity: order.quantity.to_f64().unwrap_or(0.0),
            filled_quantity: order.filled_quantity.to_f64().unwrap_or(0.0),
            remaining_quantity: order.remaining_quantity.to_f64().unwrap_or(0.0),
            price: order.price.map(|p| p.to_f64().unwrap_or(0.0)),
            average_fill_price: order.average_fill_price.map(|p| p.to_f64().unwrap_or(0.0)),
            status: format!("{:?}", order.status),
            created_at: order.created_at.to_rfc3339(),
            updated_at: order.updated_at.to_rfc3339(),
        }
    }
}

impl From<CompletedOrder> for CompletedOrderDto {
    fn from(order: CompletedOrder) -> Self {
        Self {
            order: ActiveOrderDto::from(order.order),
            completion_reason: order.completion_reason,
            final_status: format!("{:?}", order.final_status),
            completed_at: order.completed_at.to_rfc3339(),
            total_fee: order.total_fee.to_f64().unwrap_or(0.0),
            net_pnl: order.net_pnl.map(|p| p.to_f64().unwrap_or(0.0)),
        }
    }
}

impl From<PortfolioMetrics> for PortfolioMetricsDto {
    fn from(metrics: PortfolioMetrics) -> Self {
        Self {
            total_value: metrics.total_value.to_f64().unwrap_or(0.0),
            unrealized_pnl: metrics.unrealized_pnl.to_f64().unwrap_or(0.0),
            realized_pnl: metrics.realized_pnl.to_f64().unwrap_or(0.0),
            daily_pnl: metrics.daily_pnl.to_f64().unwrap_or(0.0),
            total_return: metrics.total_return.to_f64().unwrap_or(0.0),
            sharpe_ratio: metrics.sharpe_ratio,
            sortino_ratio: metrics.sortino_ratio,
            max_drawdown: metrics.max_drawdown.to_f64().unwrap_or(0.0),
            calmar_ratio: metrics.calmar_ratio,
            value_at_risk: metrics.value_at_risk.to_f64().unwrap_or(0.0),
            beta: metrics.beta,
            alpha: metrics.alpha,
            win_rate: metrics.win_rate,
            profit_factor: metrics.profit_factor,
            positions_count: metrics.positions_count,
            risk_exposure: metrics.risk_exposure.to_f64().unwrap_or(0.0),
        }
    }
}

impl From<RiskAssessment> for RiskAssessmentDto {
    fn from(assessment: RiskAssessment) -> Self {
        Self {
            position_risk: assessment.position_risk.to_f64().unwrap_or(0.0),
            portfolio_risk: assessment.portfolio_risk.to_f64().unwrap_or(0.0),
            correlation_risk: assessment.correlation_risk.to_f64().unwrap_or(0.0),
            liquidity_risk: assessment.liquidity_risk.to_f64().unwrap_or(0.0),
            concentration_risk: assessment.concentration_risk.to_f64().unwrap_or(0.0),
            market_risk: assessment.market_risk.to_f64().unwrap_or(0.0),
            var_1_day: assessment.var_1_day.to_f64().unwrap_or(0.0),
            var_1_week: assessment.var_1_week.to_f64().unwrap_or(0.0),
            stress_test_scenarios: assessment.stress_test_scenarios.into_iter().map(StressTestResultDto::from).collect(),
            risk_warnings: assessment.risk_warnings.into_iter().map(RiskWarningDto::from).collect(),
        }
    }
}

impl From<crate::advanced_trading::StressTestResult> for StressTestResultDto {
    fn from(result: crate::advanced_trading::StressTestResult) -> Self {
        Self {
            scenario_name: result.scenario_name,
            potential_loss: result.potential_loss.to_f64().unwrap_or(0.0),
            probability: result.probability,
            impact_severity: format!("{:?}", result.impact_severity),
        }
    }
}

impl From<crate::advanced_trading::RiskWarning> for RiskWarningDto {
    fn from(warning: crate::advanced_trading::RiskWarning) -> Self {
        Self {
            warning_type: warning.warning_type,
            severity: format!("{:?}", warning.severity),
            message: warning.message,
            recommended_action: warning.recommended_action,
        }
    }
}

impl From<TechnicalAnalysisResult> for TechnicalAnalysisDto {
    fn from(analysis: TechnicalAnalysisResult) -> Self {
        Self {
            symbol: analysis.symbol,
            timeframe: analysis.timeframe,
            timestamp: analysis.timestamp.to_rfc3339(),
            current_price: analysis.current_price.to_f64().unwrap_or(0.0),
            trend_direction: format!("{:?}", analysis.trend_analysis.trend_direction),
            trend_strength: analysis.trend_analysis.trend_strength,
            rsi: analysis.momentum_indicators.rsi,
            macd_signal: if analysis.oscillators.macd.histogram > 0.0 { "Bullish".to_string() } else { "Bearish".to_string() },
            bollinger_position: analysis.volatility_indicators.bollinger_bands.percent_b,
            volume_trend: "Increasing".to_string(), // Simplified
            support_levels: vec![
                analysis.support_resistance.support_1.to_f64().unwrap_or(0.0),
                analysis.support_resistance.support_2.to_f64().unwrap_or(0.0),
                analysis.support_resistance.support_3.to_f64().unwrap_or(0.0),
            ],
            resistance_levels: vec![
                analysis.support_resistance.resistance_1.to_f64().unwrap_or(0.0),
                analysis.support_resistance.resistance_2.to_f64().unwrap_or(0.0),
                analysis.support_resistance.resistance_3.to_f64().unwrap_or(0.0),
            ],
            signals: analysis.signals.into_iter().map(TradingSignalDto::from).collect(),
            overall_sentiment: format!("{:?}", analysis.overall_sentiment),
            confidence_score: analysis.confidence_score,
        }
    }
}

impl From<crate::advanced_trading::technical_analysis::TradingSignal> for TradingSignalDto {
    fn from(signal: crate::advanced_trading::technical_analysis::TradingSignal) -> Self {
        Self {
            signal_type: format!("{:?}", signal.signal_type),
            strength: format!("{:?}", signal.strength),
            price_target: signal.price_target.map(|p| p.to_f64().unwrap_or(0.0)),
            stop_loss: signal.stop_loss.map(|p| p.to_f64().unwrap_or(0.0)),
            time_horizon: format!("{:?}", signal.time_horizon),
            confidence: signal.confidence,
            rationale: signal.rationale,
        }
    }
}

impl From<PerformanceReport> for PerformanceReportDto {
    fn from(report: PerformanceReport) -> Self {
        Self {
            period_start: report.period_start.to_rfc3339(),
            period_end: report.period_end.to_rfc3339(),
            total_return: report.total_return.to_f64().unwrap_or(0.0),
            annualized_return: report.annualized_return,
            volatility: report.volatility,
            sharpe_ratio: report.sharpe_ratio,
            win_rate: report.win_rate,
            total_trades: report.total_trades,
            profitable_trades: report.profitable_trades,
            max_drawdown: report.max_drawdown.to_f64().unwrap_or(0.0),
            value_at_risk_95: report.value_at_risk_95.to_f64().unwrap_or(0.0),
        }
    }
}