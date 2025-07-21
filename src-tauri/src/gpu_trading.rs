use wgpu::util::DeviceExt;
use bytemuck::{Pod, Zeroable};
use std::sync::Arc;

/// GPU-accelerated Linear Regression Oscillator calculations
/// Utilizes compute shaders for parallel processing of price data
pub struct GpuLROCalculator {
    device: Arc<wgpu::Device>,
    queue: Arc<wgpu::Queue>,
    compute_pipeline: wgpu::ComputePipeline,
    price_buffer: wgpu::Buffer,
    result_buffer: wgpu::Buffer,
    readback_buffer: wgpu::Buffer,
    bind_group: wgpu::BindGroup,
    workgroup_size: u32,
    max_period: u32,
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct PriceData {
    close: f32,
    timestamp: f32, // Relative position for regression
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct LROParams {
    period: u32,
    signal_period: u32,
    data_length: u32,
    _padding: u32, // Align to 16 bytes
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct LROResult {
    lro_value: f32,
    signal_line: f32,
    predicted_price: f32,
    _padding: f32, // Align to 16 bytes
}

impl GpuLROCalculator {
    pub async fn new(device: Arc<wgpu::Device>, queue: Arc<wgpu::Queue>) -> Result<Self, String> {
        let max_period = 200u32; // Maximum LRO period supported
        let workgroup_size = 64u32; // Optimal workgroup size for most GPUs
        
        // Create compute shader for LRO calculation
        let shader_source = Self::create_lro_shader();
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("LRO Compute Shader"),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        // Create compute pipeline
        let compute_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("LRO Compute Pipeline"),
            layout: None,
            module: &shader,
            entry_point: "main",
        });

        // Create buffers
        let price_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Price Data Buffer"),
            size: (max_period * std::mem::size_of::<PriceData>() as u32) as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let result_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LRO Result Buffer"),
            size: std::mem::size_of::<LROResult>() as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let readback_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LRO Readback Buffer"),
            size: std::mem::size_of::<LROResult>() as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let params_buffer = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("LRO Params Buffer"),
            size: std::mem::size_of::<LROParams>() as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Create bind group
        let bind_group_layout = compute_pipeline.get_bind_group_layout(0);
        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("LRO Bind Group"),
            layout: &bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: params_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: price_buffer.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: result_buffer.as_entire_binding(),
                },
            ],
        });

        Ok(Self {
            device,
            queue,
            compute_pipeline,
            price_buffer,
            result_buffer,
            readback_buffer,
            bind_group,
            workgroup_size,
            max_period,
        })
    }

    /// Calculate LRO using GPU acceleration
    pub async fn calculate_lro(
        &self,
        prices: &[f64],
        period: usize,
        signal_period: usize,
    ) -> Result<(f64, f64), String> {
        if prices.len() < period {
            return Err("Insufficient data for LRO calculation".to_string());
        }

        if period > self.max_period as usize {
            return Err(format!("Period {} exceeds maximum {}", period, self.max_period));
        }

        // Convert prices to GPU format
        let gpu_prices: Vec<PriceData> = prices
            .iter()
            .enumerate()
            .map(|(i, &price)| PriceData {
                close: price as f32,
                timestamp: i as f32,
            })
            .collect();

        // Upload price data to GPU
        self.queue.write_buffer(
            &self.price_buffer,
            0,
            bytemuck::cast_slice(&gpu_prices),
        );

        // Upload parameters
        let params = LROParams {
            period: period as u32,
            signal_period: signal_period as u32,
            data_length: prices.len() as u32,
            _padding: 0,
        };

        self.queue.write_buffer(
            &self.price_buffer,
            0,
            bytemuck::bytes_of(&params),
        );

        // Execute compute shader
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("LRO Compute Encoder"),
        });

        {
            let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("LRO Compute Pass"),
                timestamp_writes: None,
            });

            compute_pass.set_pipeline(&self.compute_pipeline);
            compute_pass.set_bind_group(0, &self.bind_group, &[]);
            compute_pass.dispatch_workgroups(1, 1, 1); // Single workgroup for LRO calculation
        }

        // Copy result to readback buffer
        encoder.copy_buffer_to_buffer(
            &self.result_buffer,
            0,
            &self.readback_buffer,
            0,
            std::mem::size_of::<LROResult>() as u64,
        );

        self.queue.submit(std::iter::once(encoder.finish()));

        // Read back results
        let buffer_slice = self.readback_buffer.slice(..);
        let (tx, rx) = futures_intrusive::channel::shared::oneshot_channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = tx.send(result);
        });

        self.device.poll(wgpu::Maintain::Wait);
        let result = rx.receive().await.ok_or("Failed to receive GPU result")?;
        result.map_err(|e| format!("GPU buffer mapping failed: {:?}", e))?;

        let data = buffer_slice.get_mapped_range();
        let result: &LROResult = bytemuck::from_bytes(&data[..std::mem::size_of::<LROResult>()]);
        
        let lro_value = result.lro_value as f64;
        let signal_line = result.signal_line as f64;

        drop(data);
        self.readback_buffer.unmap();

        Ok((lro_value, signal_line))
    }

    /// Create WGSL compute shader for LRO calculation
    fn create_lro_shader() -> &'static str {
        r#"
struct LROParams {
    period: u32,
    signal_period: u32,
    data_length: u32,
    padding: u32,
}

struct PriceData {
    close: f32,
    timestamp: f32,
}

struct LROResult {
    lro_value: f32,
    signal_line: f32,
    predicted_price: f32,
    padding: f32,
}

@group(0) @binding(0) var<uniform> params: LROParams;
@group(0) @binding(1) var<storage, read> prices: array<PriceData>;
@group(0) @binding(2) var<storage, read_write> result: LROResult;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if (global_id.x != 0u) {
        return; // Only first thread calculates LRO
    }
    
    let period = params.period;
    let signal_period = params.signal_period;
    let data_length = params.data_length;
    
    if (data_length < period) {
        return;
    }
    
    // Calculate linear regression for the last 'period' prices
    let start_idx = data_length - period;
    
    var sum_x: f32 = 0.0;
    var sum_y: f32 = 0.0;
    var sum_xy: f32 = 0.0;
    var sum_x2: f32 = 0.0;
    
    // Accumulate sums for regression
    for (var i = 0u; i < period; i = i + 1u) {
        let idx = start_idx + i;
        let x = f32(i);
        let y = prices[idx].close;
        
        sum_x += x;
        sum_y += y;
        sum_xy += x * y;
        sum_x2 += x * x;
    }
    
    let n = f32(period);
    
    // Calculate regression slope and intercept
    let denominator = n * sum_x2 - sum_x * sum_x;
    var slope: f32 = 0.0;
    var intercept: f32 = 0.0;
    
    if (abs(denominator) > 1e-10) {
        slope = (n * sum_xy - sum_x * sum_y) / denominator;
        intercept = (sum_y - slope * sum_x) / n;
    }
    
    // Calculate predicted price for current position
    let predicted_price = slope * f32(period - 1u) + intercept;
    let current_price = prices[data_length - 1u].close;
    
    // Calculate price range for normalization
    var min_price = prices[start_idx].close;
    var max_price = prices[start_idx].close;
    
    for (var i = 1u; i < period; i = i + 1u) {
        let price = prices[start_idx + i].close;
        min_price = min(min_price, price);
        max_price = max(max_price, price);
    }
    
    let price_range = max_price - min_price;
    
    // Calculate LRO value (normalized deviation)
    var lro_value: f32 = 0.0;
    if (price_range > 1e-10) {
        lro_value = (current_price - predicted_price) / price_range;
        lro_value = clamp(lro_value, -1.0, 1.0);
    }
    
    // Calculate signal line (moving average of recent LRO values)
    // For simplicity, use current LRO value as signal line
    // In practice, you'd maintain a history of LRO values
    let signal_line = lro_value * 0.8; // Simple approximation
    
    // Store results
    result.lro_value = lro_value;
    result.signal_line = signal_line;
    result.predicted_price = predicted_price;
}
"#
    }

    /// Check if GPU acceleration is available and beneficial
    pub fn should_use_gpu(data_length: usize, period: usize) -> bool {
        // Use GPU for larger datasets where parallel processing provides benefit
        // Adjust thresholds based on GPU capabilities
        data_length >= 50 && period >= 10
    }
}

/// GPU-accelerated trading calculations manager
pub struct GpuTradingAccelerator {
    lro_calculator: Option<GpuLROCalculator>,
    device: Arc<wgpu::Device>,
    queue: Arc<wgpu::Queue>,
}

impl GpuTradingAccelerator {
    pub async fn new() -> Result<Self, String> {
        Self::new_with_diagnostics().await
    }

    /// Initialize GPU device with comprehensive diagnostics
    pub async fn new_with_diagnostics() -> Result<Self, String> {
        println!("🔍 Starting GPU initialization with Windows compatibility checks...");
        
        // Initialize GPU device with Windows/NVIDIA optimizations
        let backends = if cfg!(target_os = "windows") {
            // On Windows, prioritize DirectX 12, fallback to Vulkan, then OpenGL
            wgpu::Backends::DX12 | wgpu::Backends::VULKAN | wgpu::Backends::GL
        } else {
            // On other platforms, use all available backends
            wgpu::Backends::all()
        };

        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends,
            dx12_shader_compiler: wgpu::Dx12Compiler::Dxc {
                dxil_path: None,
                dxc_path: None,
            }, // Use DXC compiler for better Windows compatibility
            flags: wgpu::InstanceFlags::default(),
            gles_minor_version: wgpu::Gles3MinorVersion::Automatic,
        });

        // Try to get the best adapter for NVIDIA GPUs
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance, // Prefer dedicated GPU
                force_fallback_adapter: false,
                compatible_surface: None,
            })
            .await
            .ok_or_else(|| {
                let error_msg = "Failed to find suitable GPU adapter".to_string();
                eprintln!("❌ GPU Error: {}", error_msg);
                eprintln!("   Possible causes:");
                eprintln!("   - Outdated graphics drivers");
                eprintln!("   - No dedicated GPU present");
                eprintln!("   - Windows graphics settings blocking GPU access");
                error_msg
            })?;

        // Log adapter info for debugging
        let adapter_info = adapter.get_info();
        println!("🚀 GPU Adapter: {} ({})", adapter_info.name, adapter_info.backend.to_str());
        println!("   Vendor: 0x{:X}", adapter_info.vendor);
        println!("   Device: 0x{:X}", adapter_info.device);
        
        // Check GPU capabilities
        let limits = adapter.limits();
        let features = adapter.features();
        println!("   Max buffer size: {} MB", limits.max_buffer_size / 1_000_000);
        println!("   Max workgroup size: {}x{}x{}", 
                 limits.max_compute_workgroup_size_x,
                 limits.max_compute_workgroup_size_y,
                 limits.max_compute_workgroup_size_z);
        println!("   Features: {:?}", features);
        
        // Check if it's an NVIDIA GPU and detect architecture
        let is_nvidia = adapter_info.vendor == 0x10DE; // NVIDIA vendor ID
        let is_rtx = adapter_info.name.to_lowercase().contains("rtx");
        let is_gtx = adapter_info.name.to_lowercase().contains("gtx");
        let is_integrated = adapter_info.name.to_lowercase().contains("intel") || 
                           adapter_info.name.to_lowercase().contains("amd") && 
                           adapter_info.name.to_lowercase().contains("radeon") &&
                           !adapter_info.name.to_lowercase().contains("rx");
        
        if is_nvidia {
            println!("✅ NVIDIA GPU detected - enabling optimizations");
            if is_rtx {
                println!("   RTX series detected - enabling advanced features");
            } else if is_gtx {
                println!("   GTX series detected - using standard optimizations");
            }
        } else if is_integrated {
            println!("⚠️  Integrated GPU detected - using conservative settings");
            println!("   Consider using dedicated GPU for better performance");
        } else {
            println!("⚠️  Non-NVIDIA GPU detected - using generic optimizations");
        }

        // Enable advanced GPU features for better performance
        let mut features = wgpu::Features::empty();
        let supported_features = adapter.features();
        
        // Enable features that improve performance on NVIDIA GPUs
        if supported_features.contains(wgpu::Features::TIMESTAMP_QUERY) {
            features |= wgpu::Features::TIMESTAMP_QUERY;
            println!("   ✅ Timestamp queries enabled");
        }
        if supported_features.contains(wgpu::Features::PIPELINE_STATISTICS_QUERY) {
            features |= wgpu::Features::PIPELINE_STATISTICS_QUERY;
            println!("   ✅ Pipeline statistics enabled");
        }
        if supported_features.contains(wgpu::Features::SHADER_F64) {
            features |= wgpu::Features::SHADER_F64; // Better precision for financial calculations
            println!("   ✅ Double precision shaders enabled");
        }

        // Enhanced limits for high-performance trading calculations
        // Use adapter limits as baseline, then apply our minimum requirements
        let adapter_limits = adapter.limits();
        let mut limits = wgpu::Limits::default();
        
        // Ensure minimum requirements are met, but don't exceed adapter capabilities
        limits.max_compute_workgroup_size_x = adapter_limits.max_compute_workgroup_size_x.min(1024);
        limits.max_compute_workgroup_size_y = adapter_limits.max_compute_workgroup_size_y.min(1024);
        limits.max_compute_workgroup_size_z = adapter_limits.max_compute_workgroup_size_z.min(64);
        limits.max_compute_workgroups_per_dimension = adapter_limits.max_compute_workgroups_per_dimension.min(65535);
        
        // Conservative limits based on GPU type
        let max_buffer_size = if is_integrated {
            64_000_000 // 64MB for integrated GPUs
        } else {
            256_000_000 // 256MB for dedicated GPUs
        };
        
        limits.max_buffer_size = adapter_limits.max_buffer_size.min(max_buffer_size);
        limits.max_storage_buffer_binding_size = adapter_limits.max_storage_buffer_binding_size.min(max_buffer_size / 2);

        println!("   Using buffer size limit: {} MB", limits.max_buffer_size / 1_000_000);

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    required_features: features,
                    required_limits: limits,
                    label: Some("Trading GPU Device"),
                },
                None,
            )
            .await
            .map_err(|e| {
                let error_msg = format!("Failed to create GPU device: {:?}", e);
                eprintln!("❌ GPU Device Error: {}", error_msg);
                eprintln!("   Try updating your graphics drivers or running with --no-default-features");
                error_msg
            })?;
            
        println!("✅ GPU Device created with {} features enabled", features.bits().count_ones());

        let device = Arc::new(device);
        let queue = Arc::new(queue);

        let lro_calculator = match GpuLROCalculator::new(device.clone(), queue.clone()).await {
            Ok(calc) => {
                println!("✅ GPU LRO calculator initialized successfully");
                Some(calc)
            }
            Err(e) => {
                eprintln!("⚠️  Warning: Failed to initialize GPU LRO calculator: {}", e);
                eprintln!("   Application will use CPU fallback for calculations");
                None
            }
        };

        Ok(Self {
            lro_calculator,
            device,
            queue,
        })
    }

    /// Calculate LRO using GPU if available, fallback to CPU
    pub async fn calculate_lro_hybrid(
        &self,
        prices: &[f64],
        period: usize,
        signal_period: usize,
    ) -> Result<(f64, f64), String> {
        if let Some(ref calculator) = self.lro_calculator {
            if GpuLROCalculator::should_use_gpu(prices.len(), period) {
                match calculator.calculate_lro(prices, period, signal_period).await {
                    Ok(result) => return Ok(result),
                    Err(e) => {
                        eprintln!("GPU LRO calculation failed, falling back to CPU: {}", e);
                    }
                }
            }
        }

        // Fallback to CPU calculation
        Self::calculate_lro_cpu(prices, period, signal_period)
    }

    /// CPU fallback for LRO calculation
    fn calculate_lro_cpu(
        prices: &[f64],
        period: usize,
        _signal_period: usize,
    ) -> Result<(f64, f64), String> {
        if prices.len() < period {
            return Err("Insufficient data for LRO calculation".to_string());
        }

        let recent_prices = &prices[prices.len() - period..];
        
        // Calculate linear regression
        let n = period as f64;
        let sum_x = (0..period).map(|i| i as f64).sum::<f64>();
        let sum_y = recent_prices.iter().sum::<f64>();
        let sum_xy = recent_prices
            .iter()
            .enumerate()
            .map(|(i, &y)| i as f64 * y)
            .sum::<f64>();
        let sum_x2 = (0..period).map(|i| (i as f64).powi(2)).sum::<f64>();

        let denominator = n * sum_x2 - sum_x * sum_x;
        if denominator.abs() < 1e-10 {
            return Ok((0.0, 0.0));
        }

        let slope = (n * sum_xy - sum_x * sum_y) / denominator;
        let intercept = (sum_y - slope * sum_x) / n;

        // Calculate predicted price and LRO
        let predicted_price = slope * (period - 1) as f64 + intercept;
        let current_price = prices[prices.len() - 1];
        
        let min_price = recent_prices.iter().fold(f64::INFINITY, |a, &b| a.min(b));
        let max_price = recent_prices.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
        let price_range = max_price - min_price;

        let lro_value = if price_range > 1e-10 {
            ((current_price - predicted_price) / price_range).clamp(-1.0, 1.0)
        } else {
            0.0
        };

        let signal_line = lro_value * 0.8; // Simple approximation

        Ok((lro_value, signal_line))
    }

    pub fn is_gpu_available(&self) -> bool {
        self.lro_calculator.is_some()
    }
    
    /// Get detailed GPU diagnostics for troubleshooting
    pub async fn get_gpu_diagnostics() -> Result<String, String> {
        let mut diagnostics = String::new();
        diagnostics.push_str("=== GPU Diagnostics Report ===\n");
        
        let backends = if cfg!(target_os = "windows") {
            wgpu::Backends::DX12 | wgpu::Backends::VULKAN | wgpu::Backends::GL
        } else {
            wgpu::Backends::all()
        };

        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends,
            dx12_shader_compiler: wgpu::Dx12Compiler::Dxc {
                dxil_path: None,
                dxc_path: None,
            },
            flags: wgpu::InstanceFlags::default(),
            gles_minor_version: wgpu::Gles3MinorVersion::Automatic,
        });

        diagnostics.push_str(&format!("Platform: {}\n", std::env::consts::OS));
        diagnostics.push_str(&format!("Architecture: {}\n", std::env::consts::ARCH));
        diagnostics.push_str(&format!("WGPU Version: {}\n", env!("CARGO_PKG_VERSION")));

        match instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                force_fallback_adapter: false,
                compatible_surface: None,
            })
            .await
        {
            Some(adapter) => {
                let info = adapter.get_info();
                diagnostics.push_str(&format!("Adapter: {}\n", info.name));
                diagnostics.push_str(&format!("Backend: {}\n", info.backend.to_str()));
                diagnostics.push_str(&format!("Vendor ID: 0x{:X}\n", info.vendor));
                diagnostics.push_str(&format!("Device ID: 0x{:X}\n", info.device));
                
                let limits = adapter.limits();
                diagnostics.push_str(&format!("Max Buffer Size: {} MB\n", limits.max_buffer_size / 1_000_000));
                diagnostics.push_str(&format!("Max Workgroup Size: {}x{}x{}\n",
                    limits.max_compute_workgroup_size_x,
                    limits.max_compute_workgroup_size_y,
                    limits.max_compute_workgroup_size_z));
                
                let features = adapter.features();
                diagnostics.push_str(&format!("Features: {:?}\n", features));
                
                match adapter
                    .request_device(
                        &wgpu::DeviceDescriptor {
                            required_features: wgpu::Features::empty(),
                            required_limits: wgpu::Limits::default(),
                            label: None,
                        },
                        None,
                    )
                    .await
                {
                    Ok(_) => diagnostics.push_str("Device Creation: ✅ Success\n"),
                    Err(e) => diagnostics.push_str(&format!("Device Creation: ❌ Failed - {:?}\n", e)),
                }
            }
            None => diagnostics.push_str("No suitable GPU adapter found\n"),
        }

        Ok(diagnostics)
    }
    
    /// Get GPU device for risk manager initialization
    pub fn get_device(&self) -> Arc<wgpu::Device> {
        self.device.clone()
    }
    
    /// Get GPU queue for risk manager initialization
    pub fn get_queue(&self) -> Arc<wgpu::Queue> {
        self.queue.clone()
    }
}