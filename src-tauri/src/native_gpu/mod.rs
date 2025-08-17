// Native GPU support for maximum desktop performance
// Supports CUDA, DirectX 12, Vulkan, OpenCL, and Metal

use std::sync::Arc;
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use async_trait::async_trait;

pub mod cuda;
pub mod directx12;
pub mod vulkan;
pub mod opencl;
pub mod metal;
pub mod compute_kernels;

/// Available GPU backends for native acceleration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GpuBackend {
    CUDA,        // NVIDIA GPUs (Windows, Linux)
    DirectX12,   // Windows native (AMD, NVIDIA, Intel)
    Vulkan,      // Cross-platform (Windows, Linux)
    Metal,       // macOS (Apple Silicon, AMD)
    OpenCL,      // Universal fallback (AMD, Intel, NVIDIA)
    WebGPU,      // Web/WGPU fallback
    CPU,         // CPU fallback
}

impl GpuBackend {
    pub fn name(&self) -> &'static str {
        match self {
            GpuBackend::CUDA => "CUDA",
            GpuBackend::DirectX12 => "DirectX 12",
            GpuBackend::Vulkan => "Vulkan",
            GpuBackend::Metal => "Metal",
            GpuBackend::OpenCL => "OpenCL",
            GpuBackend::WebGPU => "WebGPU",
            GpuBackend::CPU => "CPU",
        }
    }

    pub fn is_available(&self) -> bool {
        match self {
            #[cfg(feature = "cuda")]
            GpuBackend::CUDA => cuda::CudaEngine::is_available(),
            
            #[cfg(all(target_os = "windows", feature = "directx12"))]
            GpuBackend::DirectX12 => directx12::DirectX12Engine::is_available(),
            
            #[cfg(feature = "vulkan")]
            GpuBackend::Vulkan => vulkan::VulkanEngine::is_available(),
            
            #[cfg(all(target_os = "macos", feature = "metal"))]
            GpuBackend::Metal => metal::MetalEngine::is_available(),
            
            #[cfg(feature = "opencl")]
            GpuBackend::OpenCL => opencl::OpenCLEngine::is_available(),
            
            GpuBackend::WebGPU => true, // Always available as fallback
            GpuBackend::CPU => true,    // Always available
            
            _ => false,
        }
    }

    pub fn priority(&self) -> u8 {
        match self {
            GpuBackend::CUDA => 100,      // Highest priority for NVIDIA
            GpuBackend::DirectX12 => 90,  // Native Windows
            GpuBackend::Metal => 90,      // Native macOS
            GpuBackend::Vulkan => 80,     // Good cross-platform
            GpuBackend::OpenCL => 70,     // Universal but slower
            GpuBackend::WebGPU => 60,     // Web-compatible
            GpuBackend::CPU => 10,        // Last resort
        }
    }
}

/// GPU device information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuDevice {
    pub name: String,
    pub vendor: String,
    pub device_type: DeviceType,
    pub memory_mb: u64,
    pub compute_units: u32,
    pub max_workgroup_size: u32,
    pub backend: GpuBackend,
    pub capabilities: GpuCapabilities,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeviceType {
    DiscreteGpu,
    IntegratedGpu,
    VirtualGpu,
    Cpu,
}

/// GPU capabilities for feature detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuCapabilities {
    pub float64_support: bool,
    pub int64_support: bool,
    pub tensor_cores: bool,
    pub ray_tracing: bool,
    pub async_compute: bool,
    pub unified_memory: bool,
    pub max_buffer_size: u64,
    pub max_texture_size: u32,
}

/// Common interface for all GPU compute engines
#[async_trait]
pub trait GpuComputeEngine: Send + Sync {
    /// Get backend type
    fn backend(&self) -> GpuBackend;
    
    /// Get device information
    fn device_info(&self) -> &GpuDevice;
    
    /// Initialize the compute engine
    async fn initialize(&mut self) -> Result<()>;
    
    /// Create a buffer on the GPU
    async fn create_buffer(&self, size: usize, usage: BufferUsage) -> Result<GpuBuffer>;
    
    /// Upload data to GPU buffer
    async fn upload_to_buffer(&self, buffer: &GpuBuffer, data: &[u8]) -> Result<()>;
    
    /// Download data from GPU buffer
    async fn download_from_buffer(&self, buffer: &GpuBuffer) -> Result<Vec<u8>>;
    
    /// Execute LRO calculation kernel
    async fn execute_lro_kernel(
        &self,
        prices: &GpuBuffer,
        output: &GpuBuffer,
        window_size: u32,
        data_points: u32,
    ) -> Result<()>;
    
    /// Execute risk calculation kernel
    async fn execute_risk_kernel(
        &self,
        positions: &GpuBuffer,
        market_data: &GpuBuffer,
        output: &GpuBuffer,
        params: &RiskParameters,
    ) -> Result<()>;
    
    /// Execute parallel indicator calculation
    async fn execute_indicator_kernel(
        &self,
        input: &GpuBuffer,
        output: &GpuBuffer,
        indicator_type: IndicatorType,
        params: &[f32],
    ) -> Result<()>;
    
    /// Synchronize GPU operations
    async fn synchronize(&self) -> Result<()>;
    
    /// Get performance metrics
    fn get_metrics(&self) -> PerformanceMetrics;
}

/// Buffer usage hints for optimization
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BufferUsage {
    Storage,
    Uniform,
    Vertex,
    Index,
    CopySrc,
    CopyDst,
    MapRead,
    MapWrite,
}

/// GPU buffer abstraction
pub struct GpuBuffer {
    pub id: u64,
    pub size: usize,
    pub usage: BufferUsage,
    pub backend_specific: Box<dyn std::any::Any + Send + Sync>,
}

/// Risk calculation parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskParameters {
    pub confidence_level: f32,
    pub time_horizon: u32,
    pub portfolio_value: f64,
    pub max_portfolio_heat: f32,
    pub use_kelly_criterion: bool,
    pub atr_multiplier: f32,
}

/// Technical indicator types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum IndicatorType {
    SMA,
    EMA,
    RSI,
    MACD,
    BollingerBands,
    ATR,
    StochasticOscillator,
    VWAP,
    OBV,
    ADX,
}

/// Performance metrics for GPU operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub kernel_execution_time_ms: f64,
    pub memory_transfer_time_ms: f64,
    pub total_time_ms: f64,
    pub throughput_gbps: f64,
    pub compute_utilization: f32,
    pub memory_utilization: f32,
    pub power_usage_watts: f32,
    pub temperature_celsius: f32,
}

/// Native GPU manager for auto-detection and initialization
pub struct NativeGpuManager {
    available_backends: Vec<GpuBackend>,
    selected_backend: Option<GpuBackend>,
    compute_engine: Option<Arc<dyn GpuComputeEngine>>,
    devices: Vec<GpuDevice>,
}

impl NativeGpuManager {
    pub fn new() -> Self {
        Self {
            available_backends: Vec::new(),
            selected_backend: None,
            compute_engine: None,
            devices: Vec::new(),
        }
    }

    /// Detect all available GPU backends
    pub async fn detect_backends(&mut self) -> Result<Vec<GpuBackend>> {
        self.available_backends.clear();
        
        let backends = vec![
            GpuBackend::CUDA,
            GpuBackend::DirectX12,
            GpuBackend::Vulkan,
            GpuBackend::Metal,
            GpuBackend::OpenCL,
            GpuBackend::WebGPU,
        ];
        
        for backend in backends {
            if backend.is_available() {
                self.available_backends.push(backend);
                log::info!("Detected GPU backend: {}", backend.name());
            }
        }
        
        // Sort by priority
        self.available_backends.sort_by_key(|b| std::cmp::Reverse(b.priority()));
        
        if self.available_backends.is_empty() {
            self.available_backends.push(GpuBackend::CPU);
            log::warn!("No GPU backends available, falling back to CPU");
        }
        
        Ok(self.available_backends.clone())
    }

    /// Initialize the best available backend
    pub async fn initialize_best_backend(&mut self) -> Result<GpuBackend> {
        if self.available_backends.is_empty() {
            self.detect_backends().await?;
        }
        
        for backend in &self.available_backends {
            match self.initialize_backend(*backend).await {
                Ok(engine) => {
                    self.selected_backend = Some(*backend);
                    self.compute_engine = Some(engine);
                    log::info!("Initialized GPU backend: {}", backend.name());
                    return Ok(*backend);
                }
                Err(e) => {
                    log::warn!("Failed to initialize {}: {}", backend.name(), e);
                }
            }
        }
        
        anyhow::bail!("Failed to initialize any GPU backend")
    }

    /// Initialize a specific backend
    pub async fn initialize_backend(&mut self, backend: GpuBackend) -> Result<Arc<dyn GpuComputeEngine>> {
        let engine: Arc<dyn GpuComputeEngine> = match backend {
            #[cfg(feature = "cuda")]
            GpuBackend::CUDA => {
                let mut engine = cuda::CudaEngine::new()?;
                engine.initialize().await?;
                Arc::new(engine)
            }
            
            #[cfg(all(target_os = "windows", feature = "directx12"))]
            GpuBackend::DirectX12 => {
                let mut engine = directx12::DirectX12Engine::new()?;
                engine.initialize().await?;
                Arc::new(engine)
            }
            
            #[cfg(feature = "vulkan")]
            GpuBackend::Vulkan => {
                let mut engine = vulkan::VulkanEngine::new()?;
                engine.initialize().await?;
                Arc::new(engine)
            }
            
            #[cfg(all(target_os = "macos", feature = "metal"))]
            GpuBackend::Metal => {
                let mut engine = metal::MetalEngine::new()?;
                engine.initialize().await?;
                Arc::new(engine)
            }
            
            #[cfg(feature = "opencl")]
            GpuBackend::OpenCL => {
                let mut engine = opencl::OpenCLEngine::new()?;
                engine.initialize().await?;
                Arc::new(engine)
            }
            
            GpuBackend::WebGPU => {
                // Fall back to existing WGPU implementation
                return Err(anyhow::anyhow!("WebGPU backend should use existing WGPU implementation"));
            }
            
            GpuBackend::CPU => {
                return Err(anyhow::anyhow!("CPU backend not implemented in GPU module"));
            }
            
            _ => {
                return Err(anyhow::anyhow!("Backend {} not available on this platform", backend.name()));
            }
        };
        
        Ok(engine)
    }

    /// Get the current compute engine
    pub fn get_engine(&self) -> Option<Arc<dyn GpuComputeEngine>> {
        self.compute_engine.clone()
    }

    /// List all detected GPU devices
    pub async fn list_devices(&mut self) -> Result<Vec<GpuDevice>> {
        self.devices.clear();
        
        for backend in &self.available_backends {
            match backend {
                #[cfg(feature = "cuda")]
                GpuBackend::CUDA => {
                    if let Ok(devices) = cuda::CudaEngine::list_devices() {
                        self.devices.extend(devices);
                    }
                }
                
                #[cfg(all(target_os = "windows", feature = "directx12"))]
                GpuBackend::DirectX12 => {
                    if let Ok(devices) = directx12::DirectX12Engine::list_devices() {
                        self.devices.extend(devices);
                    }
                }
                
                #[cfg(feature = "vulkan")]
                GpuBackend::Vulkan => {
                    if let Ok(devices) = vulkan::VulkanEngine::list_devices() {
                        self.devices.extend(devices);
                    }
                }
                
                _ => {}
            }
        }
        
        Ok(self.devices.clone())
    }

    /// Benchmark all available backends
    pub async fn benchmark_backends(&mut self) -> Result<Vec<(GpuBackend, PerformanceMetrics)>> {
        let mut results = Vec::new();
        
        for backend in self.available_backends.clone() {
            if let Ok(engine) = self.initialize_backend(backend).await {
                // Create test buffers
                let test_size = 1024 * 1024; // 1MB test
                let input_buffer = engine.create_buffer(test_size, BufferUsage::Storage).await?;
                let output_buffer = engine.create_buffer(test_size, BufferUsage::Storage).await?;
                
                // Upload test data
                let test_data = vec![0u8; test_size];
                engine.upload_to_buffer(&input_buffer, &test_data).await?;
                
                // Run a simple kernel (LRO as benchmark)
                let start = std::time::Instant::now();
                engine.execute_lro_kernel(
                    &input_buffer,
                    &output_buffer,
                    50,
                    (test_size / 4) as u32,
                ).await?;
                engine.synchronize().await?;
                let elapsed = start.elapsed();
                
                // Get metrics
                let mut metrics = engine.get_metrics();
                metrics.total_time_ms = elapsed.as_secs_f64() * 1000.0;
                
                results.push((backend, metrics));
                log::info!("Benchmark {}: {:.2}ms", backend.name(), metrics.total_time_ms);
            }
        }
        
        // Sort by performance
        results.sort_by(|a, b| a.1.total_time_ms.partial_cmp(&b.1.total_time_ms).unwrap());
        
        Ok(results)
    }
}

/// GPU-accelerated trading calculations
pub struct GpuTradingCalculator {
    engine: Arc<dyn GpuComputeEngine>,
    price_buffer: Option<GpuBuffer>,
    indicator_buffers: std::collections::HashMap<String, GpuBuffer>,
    batch_size: usize,
}

impl GpuTradingCalculator {
    pub fn new(engine: Arc<dyn GpuComputeEngine>) -> Self {
        Self {
            engine,
            price_buffer: None,
            indicator_buffers: std::collections::HashMap::new(),
            batch_size: 1024,
        }
    }

    /// Upload price data to GPU
    pub async fn upload_prices(&mut self, prices: &[f32]) -> Result<()> {
        let buffer_size = prices.len() * std::mem::size_of::<f32>();
        let buffer = self.engine.create_buffer(buffer_size, BufferUsage::Storage).await?;
        
        // Convert to bytes
        let bytes = unsafe {
            std::slice::from_raw_parts(
                prices.as_ptr() as *const u8,
                buffer_size,
            )
        };
        
        self.engine.upload_to_buffer(&buffer, bytes).await?;
        self.price_buffer = Some(buffer);
        
        Ok(())
    }

    /// Calculate multiple indicators in parallel
    pub async fn calculate_indicators(&mut self, indicators: &[IndicatorType]) -> Result<()> {
        let price_buffer = self.price_buffer.as_ref()
            .context("No price data uploaded")?;
        
        for indicator in indicators {
            let output_buffer = self.engine.create_buffer(
                price_buffer.size,
                BufferUsage::Storage,
            ).await?;
            
            let params = match indicator {
                IndicatorType::SMA => vec![20.0],
                IndicatorType::EMA => vec![12.0],
                IndicatorType::RSI => vec![14.0],
                IndicatorType::MACD => vec![12.0, 26.0, 9.0],
                IndicatorType::BollingerBands => vec![20.0, 2.0],
                IndicatorType::ATR => vec![14.0],
                _ => vec![],
            };
            
            self.engine.execute_indicator_kernel(
                price_buffer,
                &output_buffer,
                *indicator,
                &params,
            ).await?;
            
            self.indicator_buffers.insert(
                format!("{:?}", indicator),
                output_buffer,
            );
        }
        
        Ok(())
    }

    /// Get calculated indicator values
    pub async fn get_indicator(&self, indicator: IndicatorType) -> Result<Vec<f32>> {
        let buffer = self.indicator_buffers.get(&format!("{:?}", indicator))
            .context("Indicator not calculated")?;
        
        let bytes = self.engine.download_from_buffer(buffer).await?;
        
        // Convert bytes back to f32
        let floats = unsafe {
            std::slice::from_raw_parts(
                bytes.as_ptr() as *const f32,
                bytes.len() / std::mem::size_of::<f32>(),
            )
        }.to_vec();
        
        Ok(floats)
    }

    /// Calculate risk metrics for portfolio
    pub async fn calculate_risk(
        &self,
        positions: &[f32],
        market_data: &[f32],
        params: &RiskParameters,
    ) -> Result<Vec<f32>> {
        // Create buffers
        let positions_buffer = self.engine.create_buffer(
            positions.len() * std::mem::size_of::<f32>(),
            BufferUsage::Storage,
        ).await?;
        
        let market_buffer = self.engine.create_buffer(
            market_data.len() * std::mem::size_of::<f32>(),
            BufferUsage::Storage,
        ).await?;
        
        let output_buffer = self.engine.create_buffer(
            positions.len() * std::mem::size_of::<f32>(),
            BufferUsage::Storage,
        ).await?;
        
        // Upload data
        let pos_bytes = unsafe {
            std::slice::from_raw_parts(
                positions.as_ptr() as *const u8,
                positions.len() * std::mem::size_of::<f32>(),
            )
        };
        self.engine.upload_to_buffer(&positions_buffer, pos_bytes).await?;
        
        let market_bytes = unsafe {
            std::slice::from_raw_parts(
                market_data.as_ptr() as *const u8,
                market_data.len() * std::mem::size_of::<f32>(),
            )
        };
        self.engine.upload_to_buffer(&market_buffer, market_bytes).await?;
        
        // Execute risk kernel
        self.engine.execute_risk_kernel(
            &positions_buffer,
            &market_buffer,
            &output_buffer,
            params,
        ).await?;
        
        // Download results
        let result_bytes = self.engine.download_from_buffer(&output_buffer).await?;
        let results = unsafe {
            std::slice::from_raw_parts(
                result_bytes.as_ptr() as *const f32,
                result_bytes.len() / std::mem::size_of::<f32>(),
            )
        }.to_vec();
        
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_gpu_detection() {
        let mut manager = NativeGpuManager::new();
        let backends = manager.detect_backends().await.unwrap();
        assert!(!backends.is_empty());
        println!("Detected backends: {:?}", backends);
    }

    #[tokio::test]
    async fn test_backend_initialization() {
        let mut manager = NativeGpuManager::new();
        if let Ok(backend) = manager.initialize_best_backend().await {
            println!("Initialized backend: {}", backend.name());
            assert!(manager.get_engine().is_some());
        }
    }

    #[tokio::test]
    async fn test_device_listing() {
        let mut manager = NativeGpuManager::new();
        let devices = manager.list_devices().await.unwrap();
        for device in devices {
            println!("Device: {} - {} ({}MB)", device.name, device.vendor, device.memory_mb);
        }
    }
}