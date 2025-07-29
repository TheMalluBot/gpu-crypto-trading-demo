use crate::TradingState;
use crate::backtesting::{BacktestEngine, BacktestConfig, BacktestMetrics, BacktestTrade};
use crate::models::PriceData;
use crate::enhanced_lro::LROConfig;
use tauri::State;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::RwLock;

// Global backtesting engine storage
type BacktestEngineState = Arc<RwLock<Option<BacktestEngine>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestRequest {
    pub config: BacktestConfig,
    pub lro_config: LROConfig,
    pub historical_data: Vec<PriceData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestProgress {
    pub current_date: DateTime<Utc>,
    pub progress_percentage: f64,
    pub trades_completed: u64,
    pub current_balance: f64,
    pub current_drawdown: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalkForwardResult {
    pub period_number: usize,
    pub train_start: DateTime<Utc>,
    pub train_end: DateTime<Utc>,
    pub test_start: DateTime<Utc>,
    pub test_end: DateTime<Utc>,
    pub metrics: BacktestMetrics,
}

/// Initialize backtesting engine
#[tauri::command]
pub async fn initialize_backtest_engine(
    config: BacktestConfig,
    lro_config: LROConfig,
    backtest_state: State<'_, BacktestEngineState>
) -> Result<(), String> {
    let mut engine = BacktestEngine::new(config);
    engine.initialize_strategy(lro_config)
        .map_err(|e| format!("Failed to initialize strategy: {}", e))?;
    
    let mut state = backtest_state.write().await;
    *state = Some(engine);
    
    Ok(())
}

/// Run comprehensive backtesting analysis
#[tauri::command]
pub async fn run_backtest_analysis(
    historical_data: Vec<PriceData>,
    backtest_state: State<'_, BacktestEngineState>
) -> Result<BacktestMetrics, String> {
    let mut state = backtest_state.write().await;
    let engine = state.as_mut()
        .ok_or("Backtesting engine not initialized")?;
    
    engine.run_backtest(historical_data).await
        .map_err(|e| format!("Backtesting failed: {}", e))
}

/// Get current backtesting progress
#[tauri::command]
pub async fn get_backtest_progress(
    backtest_state: State<'_, BacktestEngineState>
) -> Result<Option<BacktestProgress>, String> {
    let state = backtest_state.read().await;
    
    if let Some(_engine) = state.as_ref() {
        // This would be implemented with actual progress tracking
        Ok(Some(BacktestProgress {
            current_date: Utc::now(),
            progress_percentage: 0.0,
            trades_completed: 0,
            current_balance: 10000.0,
            current_drawdown: 0.0,
        }))
    } else {
        Ok(None)
    }
}

/// Run walk-forward optimization
#[tauri::command]
pub async fn run_walk_forward_optimization(
    request: BacktestRequest,
    backtest_state: State<'_, BacktestEngineState>
) -> Result<Vec<WalkForwardResult>, String> {
    let mut engine = BacktestEngine::new(request.config);
    engine.initialize_strategy(request.lro_config)
        .map_err(|e| format!("Failed to initialize strategy: {}", e))?;
    
    let metrics = engine.run_backtest(request.historical_data).await
        .map_err(|e| format!("Walk-forward analysis failed: {}", e))?;
    
    // For now, return a single result - full implementation would return multiple periods
    Ok(vec![WalkForwardResult {
        period_number: 1,
        train_start: Utc::now(),
        train_end: Utc::now(),
        test_start: Utc::now(),
        test_end: Utc::now(),
        metrics,
    }])
}

/// Get detailed trade history from backtest
#[tauri::command]
pub async fn get_backtest_trades(
    backtest_state: State<'_, BacktestEngineState>
) -> Result<Vec<BacktestTrade>, String> {
    let state = backtest_state.read().await;
    
    if let Some(_engine) = state.as_ref() {
        // This would return actual trade history from the engine
        Ok(Vec::new())
    } else {
        Err("Backtesting engine not initialized".to_string())
    }
}

/// Generate performance report with visualizations
#[tauri::command]
pub async fn generate_performance_report(
    backtest_state: State<'_, BacktestEngineState>
) -> Result<PerformanceReport, String> {
    let state = backtest_state.read().await;
    
    if let Some(_engine) = state.as_ref() {
        Ok(PerformanceReport {
            equity_curve: Vec::new(),
            drawdown_curve: Vec::new(),
            monthly_returns: Vec::new(),
            trade_distribution: TradeDistribution::default(),
            risk_metrics: RiskMetrics::default(),
        })
    } else {
        Err("Backtesting engine not initialized".to_string())
    }
}

/// Compare multiple strategies
#[tauri::command]
pub async fn compare_strategies(
    strategies: Vec<BacktestRequest>
) -> Result<StrategyComparison, String> {
    let mut results = Vec::new();
    
    for (i, request) in strategies.iter().enumerate() {
        let mut engine = BacktestEngine::new(request.config.clone());
        engine.initialize_strategy(request.lro_config.clone())
            .map_err(|e| format!("Failed to initialize strategy {}: {}", i, e))?;
        
        let metrics = engine.run_backtest(request.historical_data.clone()).await
            .map_err(|e| format!("Strategy {} backtesting failed: {}", i, e))?;
        
        results.push(StrategyResult {
            strategy_name: format!("Strategy {}", i + 1),
            metrics,
            config: request.config.clone(),
        });
    }
    
    Ok(StrategyComparison {
        strategies: results,
        comparison_metrics: ComparisonMetrics::default(),
    })
}

/// Optimize strategy parameters
#[tauri::command]
pub async fn optimize_strategy_parameters(
    base_config: LROConfig,
    historical_data: Vec<PriceData>,
    optimization_config: OptimizationConfig
) -> Result<OptimizationResult, String> {
    // This would implement parameter optimization
    // For now, return the base config as optimal
    Ok(OptimizationResult {
        optimal_config: base_config,
        optimization_metrics: Vec::new(),
        parameter_sensitivity: ParameterSensitivity::default(),
    })
}

// Supporting data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceReport {
    pub equity_curve: Vec<(DateTime<Utc>, f64)>,
    pub drawdown_curve: Vec<(DateTime<Utc>, f64)>,
    pub monthly_returns: Vec<MonthlyReturn>,
    pub trade_distribution: TradeDistribution,
    pub risk_metrics: RiskMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TradeDistribution {
    pub win_distribution: Vec<f64>,
    pub loss_distribution: Vec<f64>,
    pub holding_periods: Vec<i64>,
    pub pnl_histogram: Vec<(f64, u32)>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RiskMetrics {
    pub var_history: Vec<(DateTime<Utc>, f64)>,
    pub correlation_matrix: Vec<Vec<f64>>,
    pub beta_stability: Vec<(DateTime<Utc>, f64)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyReturn {
    pub year: i32,
    pub month: u32,
    pub return_percentage: f64,
    pub benchmark_return: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyComparison {
    pub strategies: Vec<StrategyResult>,
    pub comparison_metrics: ComparisonMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyResult {
    pub strategy_name: String,
    pub metrics: BacktestMetrics,
    pub config: BacktestConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ComparisonMetrics {
    pub sharpe_ranking: Vec<(String, f64)>,
    pub calmar_ranking: Vec<(String, f64)>,
    pub max_dd_ranking: Vec<(String, f64)>,
    pub correlation_matrix: Vec<Vec<f64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationConfig {
    pub parameters_to_optimize: Vec<String>,
    pub parameter_ranges: std::collections::HashMap<String, (f64, f64)>,
    pub optimization_metric: String, // "sharpe", "calmar", "total_return", etc.
    pub walk_forward_periods: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub optimal_config: LROConfig,
    pub optimization_metrics: Vec<OptimizationStep>,
    pub parameter_sensitivity: ParameterSensitivity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationStep {
    pub iteration: u32,
    pub parameters: std::collections::HashMap<String, f64>,
    pub metric_value: f64,
    pub is_optimal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ParameterSensitivity {
    pub sensitivity_matrix: Vec<Vec<f64>>,
    pub parameter_names: Vec<String>,
    pub correlation_with_returns: Vec<(String, f64)>,
}