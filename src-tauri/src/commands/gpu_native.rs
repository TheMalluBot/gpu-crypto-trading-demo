// Native GPU commands for frontend interaction

use crate::native_gpu::{NativeGpuManager, GpuBackend, GpuDevice, PerformanceMetrics, GpuTradingCalculator, IndicatorType, RiskParameters};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::State;

/// GPU system information for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuSystemInfo {
    pub available_backends: Vec<GpuBackend>,
    pub selected_backend: Option<GpuBackend>,
    pub devices: Vec<GpuDevice>,
    pub is_initialized: bool,
}

/// GPU benchmark results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuBenchmarkResult {
    pub backend: GpuBackend,
    pub metrics: PerformanceMetrics,
    pub rank: u32,
}

/// Application state for GPU manager
pub struct NativeGpuState {
    pub manager: Arc<RwLock<NativeGpuManager>>,
    pub calculator: Arc<RwLock<Option<GpuTradingCalculator>>>,
}

impl NativeGpuState {
    pub fn new() -> Self {
        Self {
            manager: Arc::new(RwLock::new(NativeGpuManager::new())),
            calculator: Arc::new(RwLock::new(None)),
        }
    }
}

/// Detect available GPU backends
#[tauri::command]
pub async fn detect_gpu_backends(
    state: State<'_, NativeGpuState>,
) -> Result<GpuSystemInfo, String> {
    let mut manager = state.manager.write().await;
    
    let available_backends = manager.detect_backends().await
        .map_err(|e| format!("Failed to detect GPU backends: {}", e))?;
    
    let devices = manager.list_devices().await
        .map_err(|e| format!("Failed to list GPU devices: {}", e))?;
    
    Ok(GpuSystemInfo {
        available_backends: available_backends.clone(),
        selected_backend: None,
        devices,
        is_initialized: false,
    })
}

/// Initialize the best available GPU backend
#[tauri::command]
pub async fn initialize_gpu_backend(
    state: State<'_, NativeGpuState>,
) -> Result<GpuSystemInfo, String> {
    let mut manager = state.manager.write().await;
    
    let backend = manager.initialize_best_backend().await
        .map_err(|e| format!("Failed to initialize GPU backend: {}", e))?;
    
    // Create calculator with the initialized engine
    if let Some(engine) = manager.get_engine() {
        let calculator = GpuTradingCalculator::new(engine);
        *state.calculator.write().await = Some(calculator);
    }
    
    let available_backends = manager.detect_backends().await.unwrap_or_default();
    let devices = manager.list_devices().await.unwrap_or_default();
    
    Ok(GpuSystemInfo {
        available_backends,
        selected_backend: Some(backend),
        devices,
        is_initialized: true,
    })
}

/// Initialize a specific GPU backend
#[tauri::command]
pub async fn initialize_specific_backend(
    state: State<'_, NativeGpuState>,
    backend: GpuBackend,
) -> Result<GpuSystemInfo, String> {
    let mut manager = state.manager.write().await;
    
    let engine = manager.initialize_backend(backend).await
        .map_err(|e| format!("Failed to initialize {} backend: {}", backend.name(), e))?;
    
    // Create calculator with the initialized engine
    let calculator = GpuTradingCalculator::new(engine);
    *state.calculator.write().await = Some(calculator);
    
    let available_backends = manager.detect_backends().await.unwrap_or_default();
    let devices = manager.list_devices().await.unwrap_or_default();
    
    Ok(GpuSystemInfo {
        available_backends,
        selected_backend: Some(backend),
        devices,
        is_initialized: true,
    })
}

/// Benchmark all available GPU backends
#[tauri::command]
pub async fn benchmark_gpu_backends(
    state: State<'_, NativeGpuState>,
) -> Result<Vec<GpuBenchmarkResult>, String> {
    let mut manager = state.manager.write().await;
    
    let benchmark_results = manager.benchmark_backends().await
        .map_err(|e| format!("Failed to benchmark GPU backends: {}", e))?;
    
    let results: Vec<GpuBenchmarkResult> = benchmark_results
        .into_iter()
        .enumerate()
        .map(|(rank, (backend, metrics))| GpuBenchmarkResult {
            backend,
            metrics,
            rank: (rank + 1) as u32,
        })
        .collect();
    
    Ok(results)
}

/// Calculate LRO using native GPU
#[tauri::command]
pub async fn gpu_calculate_lro(
    state: State<'_, NativeGpuState>,
    prices: Vec<f32>,
    window_size: u32,
) -> Result<Vec<f32>, String> {
    let calculator_lock = state.calculator.read().await;
    let calculator = calculator_lock.as_ref()
        .ok_or_else(|| "GPU not initialized".to_string())?;
    
    // Upload prices to GPU
    let mut calc = GpuTradingCalculator::new(calculator.engine.clone());
    calc.upload_prices(&prices).await
        .map_err(|e| format!("Failed to upload prices: {}", e))?;
    
    // Calculate LRO indicator
    calc.calculate_indicators(&[IndicatorType::SMA]).await
        .map_err(|e| format!("Failed to calculate LRO: {}", e))?;
    
    // Get results
    let results = calc.get_indicator(IndicatorType::SMA).await
        .map_err(|e| format!("Failed to get LRO results: {}", e))?;
    
    Ok(results)
}

/// Calculate multiple indicators using native GPU
#[tauri::command]
pub async fn gpu_calculate_indicators(
    state: State<'_, NativeGpuState>,
    prices: Vec<f32>,
    indicators: Vec<String>,
) -> Result<std::collections::HashMap<String, Vec<f32>>, String> {
    let calculator_lock = state.calculator.read().await;
    let calculator = calculator_lock.as_ref()
        .ok_or_else(|| "GPU not initialized".to_string())?;
    
    // Parse indicator types
    let indicator_types: Vec<IndicatorType> = indicators
        .iter()
        .filter_map(|s| match s.as_str() {
            "SMA" => Some(IndicatorType::SMA),
            "EMA" => Some(IndicatorType::EMA),
            "RSI" => Some(IndicatorType::RSI),
            "MACD" => Some(IndicatorType::MACD),
            "BollingerBands" => Some(IndicatorType::BollingerBands),
            "ATR" => Some(IndicatorType::ATR),
            _ => None,
        })
        .collect();
    
    // Upload prices to GPU
    let mut calc = GpuTradingCalculator::new(calculator.engine.clone());
    calc.upload_prices(&prices).await
        .map_err(|e| format!("Failed to upload prices: {}", e))?;
    
    // Calculate indicators
    calc.calculate_indicators(&indicator_types).await
        .map_err(|e| format!("Failed to calculate indicators: {}", e))?;
    
    // Get results
    let mut results = std::collections::HashMap::new();
    for indicator_type in indicator_types {
        let values = calc.get_indicator(indicator_type).await
            .map_err(|e| format!("Failed to get {:?} results: {}", indicator_type, e))?;
        results.insert(format!("{:?}", indicator_type), values);
    }
    
    Ok(results)
}

/// Calculate portfolio risk using native GPU
#[tauri::command]
pub async fn gpu_calculate_risk(
    state: State<'_, NativeGpuState>,
    positions: Vec<f32>,
    market_data: Vec<f32>,
    confidence_level: f32,
    portfolio_value: f64,
    atr_multiplier: f32,
) -> Result<Vec<f32>, String> {
    let calculator_lock = state.calculator.read().await;
    let calculator = calculator_lock.as_ref()
        .ok_or_else(|| "GPU not initialized".to_string())?;
    
    let params = RiskParameters {
        confidence_level,
        time_horizon: 1,
        portfolio_value,
        max_portfolio_heat: 0.06,
        use_kelly_criterion: true,
        atr_multiplier,
    };
    
    let calc = GpuTradingCalculator::new(calculator.engine.clone());
    let results = calc.calculate_risk(&positions, &market_data, &params).await
        .map_err(|e| format!("Failed to calculate risk: {}", e))?;
    
    Ok(results)
}

/// Get current GPU metrics
#[tauri::command]
pub async fn get_gpu_metrics(
    state: State<'_, NativeGpuState>,
) -> Result<PerformanceMetrics, String> {
    let manager = state.manager.read().await;
    
    if let Some(engine) = manager.get_engine() {
        Ok(engine.get_metrics())
    } else {
        Err("GPU not initialized".to_string())
    }
}

/// Switch between GPU backends at runtime
#[tauri::command]
pub async fn switch_gpu_backend(
    state: State<'_, NativeGpuState>,
    backend: GpuBackend,
) -> Result<String, String> {
    let mut manager = state.manager.write().await;
    
    // Initialize the new backend
    let engine = manager.initialize_backend(backend).await
        .map_err(|e| format!("Failed to switch to {} backend: {}", backend.name(), e))?;
    
    // Update calculator
    let calculator = GpuTradingCalculator::new(engine);
    *state.calculator.write().await = Some(calculator);
    
    Ok(format!("Switched to {} backend", backend.name()))
}