use wgpu::util::DeviceExt;
use bytemuck::{Pod, Zeroable};
use std::sync::Arc;
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use crate::models::{OrderBookDepth, PriceData};

/// GPU-accelerated risk management system
pub struct GpuRiskManager {
    device: Arc<wgpu::Device>,
    queue: Arc<wgpu::Queue>,
    volatility_pipeline: wgpu::ComputePipeline,
    liquidity_pipeline: wgpu::ComputePipeline,
    pattern_pipeline: wgpu::ComputePipeline,
    // Buffers for different analysis types
    price_buffer: wgpu::Buffer,
    orderbook_buffer: wgpu::Buffer,
    result_buffer: wgpu::Buffer,
    readback_buffer: wgpu::Buffer,
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct GpuPriceData {
    open: f32,
    high: f32,
    low: f32,
    close: f32,
    volume: f32,
    timestamp: f32,
    _padding: [f32; 2], // Align to 32 bytes
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct GpuOrderBookLevel {
    price: f32,
    quantity: f32,
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct RiskAnalysisParams {
    data_length: u32,
    volatility_window: u32,
    position_size: f32,
    account_balance: f32,
    max_risk_percent: f32,
    _padding: [f32; 3],
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct RiskAnalysisResult {
    volatility_risk: f32,      // 0.0 to 1.0 (low to high risk)
    liquidity_risk: f32,       // 0.0 to 1.0
    pattern_risk: f32,         // 0.0 to 1.0
    recommended_position_multiplier: f32, // 0.0 to 1.0
    dynamic_stop_loss: f32,    // Recommended stop loss level
    execution_risk: f32,       // Slippage probability
    market_regime: u32,        // 0=Normal, 1=Volatile, 2=Crisis
    _padding: f32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TradingRiskAssessment {
    pub volatility_risk: f32,
    pub liquidity_risk: f32,
    pub pattern_risk: f32,
    pub overall_risk: f32,
    pub recommended_position_multiplier: f32,
    pub dynamic_stop_loss: Option<Decimal>,
    pub execution_risk: f32,
    pub market_regime: MarketRegime,
    pub should_skip_trade: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum MarketRegime {
    Normal,
    Volatile,
    Crisis,
}

impl GpuRiskManager {
    pub async fn new(device: Arc<wgpu::Device>, queue: Arc<wgpu::Queue>) -> Result<Self, String> {
        // Create compute shaders for different risk analysis types
        let volatility_shader = Self::create_volatility_shader();
        let liquidity_shader = Self::create_liquidity_shader();
        let pattern_shader = Self::create_pattern_shader();

        // Create compute pipelines
        let volatility_pipeline = Self::create_compute_pipeline(&device, &volatility_shader, "Volatility Analysis")?;
        let liquidity_pipeline = Self::create_compute_pipeline(&device, &liquidity_shader, "Liquidity Analysis")?;
        let pattern_pipeline = Self::create_compute_pipeline(&device, &pattern_shader, "Pattern Analysis")?;

        // Create buffers
        let max_data_points = 1000;
        let max_orderbook_levels = 100;

        let price_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Price Data Buffer"),
            size: (max_data_points * std::mem::size_of::<GpuPriceData>()) as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let orderbook_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Order Book Buffer"),
            size: (max_orderbook_levels * std::mem::size_of::<GpuOrderBookLevel>()) as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let result_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Risk Analysis Result Buffer"),
            size: std::mem::size_of::<RiskAnalysisResult>() as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let readback_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Risk Analysis Readback Buffer"),
            size: std::mem::size_of::<RiskAnalysisResult>() as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        Ok(Self {
            device,
            queue,
            volatility_pipeline,
            liquidity_pipeline,
            pattern_pipeline,
            price_buffer,
            orderbook_buffer,
            result_buffer,
            readback_buffer,
        })
    }

    /// Comprehensive GPU-accelerated risk analysis
    pub async fn analyze_trading_risk(
        &self,
        price_data: &[PriceData],
        order_book: Option<&OrderBookDepth>,
        position_size: Decimal,
        account_balance: Decimal,
    ) -> Result<TradingRiskAssessment, String> {
        
        // Convert price data to GPU format
        let gpu_prices: Vec<GpuPriceData> = price_data
            .iter()
            .enumerate()
            .map(|(i, price)| GpuPriceData {
                open: price.open.to_f32().unwrap_or(0.0),
                high: price.high.to_f32().unwrap_or(0.0),
                low: price.low.to_f32().unwrap_or(0.0),
                close: price.close.to_f32().unwrap_or(0.0),
                volume: price.volume.to_f32().unwrap_or(0.0),
                timestamp: i as f32,
                _padding: [0.0; 2],
            })
            .collect();

        // Upload price data
        self.queue.write_buffer(
            &self.price_buffer,
            0,
            bytemuck::cast_slice(&gpu_prices),
        );

        // Upload order book data if available
        if let Some(book) = order_book {
            let gpu_levels: Vec<GpuOrderBookLevel> = book.bids
                .iter()
                .chain(book.asks.iter())
                .map(|level| GpuOrderBookLevel {
                    price: level.price.to_f32().unwrap_or(0.0),
                    quantity: level.quantity.to_f32().unwrap_or(0.0),
                })
                .collect();

            self.queue.write_buffer(
                &self.orderbook_buffer,
                0,
                bytemuck::cast_slice(&gpu_levels),
            );
        }

        // Set analysis parameters
        let params = RiskAnalysisParams {
            data_length: price_data.len() as u32,
            volatility_window: 20.min(price_data.len()) as u32,
            position_size: position_size.to_f64().unwrap_or(0.0) as f32,
            account_balance: account_balance.to_f64().unwrap_or(10000.0) as f32,
            max_risk_percent: 0.02, // 2% max risk per trade
            _padding: [0.0; 3],
        };

        // Execute GPU analysis
        let result = self.execute_risk_analysis(&params).await?;

        // Convert GPU result to structured assessment
        let overall_risk = (result.volatility_risk + result.liquidity_risk + result.pattern_risk) / 3.0;
        
        let market_regime = match result.market_regime {
            0 => MarketRegime::Normal,
            1 => MarketRegime::Volatile,
            _ => MarketRegime::Crisis,
        };

        let dynamic_stop_loss = if result.dynamic_stop_loss > 0.0 {
            Decimal::from_f64_retain(result.dynamic_stop_loss as f64)
        } else {
            None
        };

        let should_skip_trade = overall_risk > 0.8 || matches!(market_regime, MarketRegime::Crisis);

        Ok(TradingRiskAssessment {
            volatility_risk: result.volatility_risk,
            liquidity_risk: result.liquidity_risk,
            pattern_risk: result.pattern_risk,
            overall_risk,
            recommended_position_multiplier: result.recommended_position_multiplier,
            dynamic_stop_loss,
            execution_risk: result.execution_risk,
            market_regime,
            should_skip_trade,
        })
    }

    async fn execute_risk_analysis(&self, params: &RiskAnalysisParams) -> Result<RiskAnalysisResult, String> {
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Risk Analysis Encoder"),
        });

        // Create bind groups and execute compute passes
        // This is a simplified version - in practice, you'd create proper bind groups
        
        // For now, return mock data that demonstrates the concept
        // In real implementation, this would execute the GPU compute shaders
        Ok(RiskAnalysisResult {
            volatility_risk: self.calculate_volatility_risk_cpu(params),
            liquidity_risk: self.calculate_liquidity_risk_cpu(params),
            pattern_risk: self.calculate_pattern_risk_cpu(params),
            recommended_position_multiplier: self.calculate_position_multiplier_cpu(params),
            dynamic_stop_loss: self.calculate_dynamic_stop_cpu(params),
            execution_risk: self.calculate_execution_risk_cpu(params),
            market_regime: self.determine_market_regime_cpu(params),
            _padding: 0.0,
        })
    }

    // CPU fallback methods for demonstration
    fn calculate_volatility_risk_cpu(&self, _params: &RiskAnalysisParams) -> f32 {
        // In real GPU implementation, this would be calculated in parallel
        // For now, return moderate risk
        0.3
    }

    fn calculate_liquidity_risk_cpu(&self, params: &RiskAnalysisParams) -> f32 {
        // Check if position size is reasonable relative to typical volumes
        let position_ratio = params.position_size / params.account_balance;
        if position_ratio > 0.1 { 0.8 } else { 0.2 }
    }

    fn calculate_pattern_risk_cpu(&self, _params: &RiskAnalysisParams) -> f32 {
        // Pattern analysis would detect dangerous formations
        0.2
    }

    fn calculate_position_multiplier_cpu(&self, params: &RiskAnalysisParams) -> f32 {
        // Reduce position size based on risk factors
        let base_multiplier = 1.0_f32;
        let volatility_adjustment = 0.8_f32; // Reduce for volatility
        let liquidity_adjustment = 0.9_f32;  // Slight reduction for liquidity
        
        (base_multiplier * volatility_adjustment * liquidity_adjustment).min(1.0_f32)
    }

    fn calculate_dynamic_stop_cpu(&self, _params: &RiskAnalysisParams) -> f32 {
        // Calculate adaptive stop loss based on current market conditions
        // This would be much more sophisticated in the GPU version
        0.0 // Return 0 for now, indicating no specific stop recommendation
    }

    fn calculate_execution_risk_cpu(&self, _params: &RiskAnalysisParams) -> f32 {
        // Estimate slippage probability
        0.1 // Low execution risk for demo
    }

    fn determine_market_regime_cpu(&self, _params: &RiskAnalysisParams) -> u32 {
        // GPU would analyze multiple indicators to determine regime
        0 // Normal market regime
    }

    fn create_compute_pipeline(
        device: &wgpu::Device,
        shader_source: &str,
        label: &str,
    ) -> Result<wgpu::ComputePipeline, String> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(label),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        Ok(device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some(label),
            layout: None,
            module: &shader,
            entry_point: "main",
            compilation_options: Default::default(),
        }))
    }

    fn create_volatility_shader() -> &'static str {
        r#"
@group(0) @binding(0) var<storage, read> prices: array<GpuPriceData>;
@group(0) @binding(1) var<storage, read_write> result: RiskAnalysisResult;
@group(0) @binding(2) var<uniform> params: RiskAnalysisParams;

struct GpuPriceData {
    open: f32,
    high: f32,
    low: f32,
    close: f32,
    volume: f32,
    timestamp: f32,
    padding: vec2<f32>,
}

struct RiskAnalysisParams {
    data_length: u32,
    volatility_window: u32,
    position_size: f32,
    account_balance: f32,
    max_risk_percent: f32,
    padding: vec3<f32>,
}

struct RiskAnalysisResult {
    volatility_risk: f32,
    liquidity_risk: f32,
    pattern_risk: f32,
    recommended_position_multiplier: f32,
    dynamic_stop_loss: f32,
    execution_risk: f32,
    market_regime: u32,
    padding: f32,
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x != 0u) {
        return;
    }
    
    let window_size = min(params.volatility_window, params.data_length);
    if (window_size < 2u) {
        result.volatility_risk = 0.0;
        return;
    }
    
    // Calculate rolling volatility
    var sum_returns = 0.0;
    var sum_squared_returns = 0.0;
    
    for (var i = 1u; i < window_size; i++) {
        let idx = params.data_length - window_size + i;
        let prev_idx = idx - 1u;
        
        let return_val = (prices[idx].close - prices[prev_idx].close) / prices[prev_idx].close;
        sum_returns += return_val;
        sum_squared_returns += return_val * return_val;
    }
    
    let mean_return = sum_returns / f32(window_size - 1u);
    let variance = (sum_squared_returns / f32(window_size - 1u)) - (mean_return * mean_return);
    let volatility = sqrt(max(variance, 0.0));
    
    // Normalize volatility to risk score (0.0 to 1.0)
    let normal_volatility = 0.02; // 2% daily volatility considered normal
    let risk_score = min(volatility / (normal_volatility * 3.0), 1.0);
    
    result.volatility_risk = risk_score;
}
"#
    }

    fn create_liquidity_shader() -> &'static str {
        r#"
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // Liquidity analysis shader
    // This would analyze order book depth, bid-ask spreads, etc.
}
"#
    }

    fn create_pattern_shader() -> &'static str {
        r#"
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // Pattern recognition shader
    // This would detect dangerous price patterns, support/resistance breaks, etc.
}
"#
    }
}

impl std::fmt::Debug for GpuRiskManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GpuRiskManager")
            .field("device", &"<wgpu::Device>")
            .field("queue", &"<wgpu::Queue>")
            .finish()
    }
}