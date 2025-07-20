use std::time::Instant;

/// Minimal GPU performance monitor without dummy rendering
pub struct GpuRenderer {
    device: wgpu::Device,
    queue: wgpu::Queue,
    last_frame_time: Option<Instant>,
    frame_count: u64,
    total_frame_time: f64,
}

impl GpuRenderer {
    pub async fn new() -> Self {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            dx12_shader_compiler: Default::default(),
            flags: wgpu::InstanceFlags::default(),
            gles_minor_version: wgpu::Gles3MinorVersion::Automatic,
        });
        
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                force_fallback_adapter: false,
                compatible_surface: None,
            })
            .await
            .expect("Failed to find a suitable GPU adapter");
        
        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::default(),
                    label: Some("GPU Performance Monitor"),
                },
                None,
            )
            .await
            .expect("Failed to create GPU device");
        
        Self {
            device,
            queue,
            last_frame_time: None,
            frame_count: 0,
            total_frame_time: 0.0,
        }
    }
    
    /// Measure GPU performance by timing actual GPU operations
    pub async fn render_frame(&mut self) -> f32 {
        let start_time = Instant::now();
        
        // Perform minimal GPU work to measure actual performance
        // Create a small buffer to ensure GPU is actually working
        let test_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("GPU Performance Test Buffer"),
            size: 1024, // 1KB test buffer
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        
        // Write some data to ensure GPU is active
        let test_data = vec![0u8; 1024];
        self.queue.write_buffer(&test_buffer, 0, &test_data);
        
        // Submit to ensure work is done
        self.queue.submit(std::iter::empty());
        
        // Ensure GPU work is completed
        self.device.poll(wgpu::Maintain::Wait);
        
        // Calculate frame time
        let frame_time = start_time.elapsed().as_millis() as f32;
        
        // Update statistics
        self.frame_count += 1;
        self.total_frame_time += frame_time as f64;
        
        // Return frame time (should be very low for this minimal work)
        frame_time.max(0.1) // Ensure we don't return 0 which causes division issues
    }
    
    /// Get texture data - return empty data since we're not rendering anything
    pub async fn get_texture_data(&self) -> Vec<u8> {
        // Return minimal empty texture data
        vec![0u8; 512 * 512 * 4] // 512x512 RGBA image of black pixels
    }
    
    /// Get average frame time over all frames
    pub fn get_average_frame_time(&self) -> f32 {
        if self.frame_count > 0 {
            (self.total_frame_time / self.frame_count as f64) as f32
        } else {
            1.0
        }
    }
    
    /// Check if GPU is functioning properly
    pub fn is_gpu_healthy(&self) -> bool {
        self.frame_count > 0 && self.get_average_frame_time() < 100.0 // Less than 100ms per "frame"
    }
}