use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;
use wgpu::util::DeviceExt;
use crate::config::GpuConfig;
use crate::errors::{TradingError, TradingResult, GpuErrorType};

/// GPU memory allocation tracking
#[derive(Debug)]
pub struct MemoryAllocation {
    pub size: u64,
    pub usage: wgpu::BufferUsages,
    pub label: String,
    pub allocated_at: std::time::Instant,
    pub last_used: std::time::Instant,
}

/// GPU memory manager for efficient buffer allocation and reuse
pub struct GpuMemoryManager {
    device: Arc<wgpu::Device>,
    config: GpuConfig,
    allocations: Arc<RwLock<HashMap<String, MemoryAllocation>>>,
    total_allocated: Arc<RwLock<u64>>,
    buffer_pool: Arc<RwLock<Vec<MemoryAllocation>>>,
}

impl GpuMemoryManager {
    pub fn new(device: Arc<wgpu::Device>, config: GpuConfig) -> Self {
        Self {
            device,
            config,
            allocations: Arc::new(RwLock::new(HashMap::new())),
            total_allocated: Arc::new(RwLock::new(0)),
            buffer_pool: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Allocate a new buffer with automatic memory management
    pub async fn allocate_buffer(
        &self,
        label: &str,
        size: u64,
        usage: wgpu::BufferUsages,
        contents: Option<&[u8]>,
    ) -> TradingResult<wgpu::Buffer> {
        // Check memory limits
        let total_allocated = *self.total_allocated.read().await;
        let memory_limit = self.config.memory_limit_mb * 1024 * 1024;

        if total_allocated + size > memory_limit {
            // Try to free unused buffers
            self.cleanup_unused_buffers().await?;

            // Check again after cleanup
            let total_allocated = *self.total_allocated.read().await;
            if total_allocated + size > memory_limit {
                return Err(TradingError::gpu_error(
                    GpuErrorType::OutOfMemory,
                    format!("GPU memory limit exceeded: {} MB", self.config.memory_limit_mb)
                ));
            }
        }

        // Try to reuse a buffer from the pool
        if let Some(reused_buffer) = self.try_reuse_buffer(size, usage).await {
            return Ok(reused_buffer);
        }

        // Create new buffer
        let buffer = if let Some(data) = contents {
            self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some(label),
                contents: data,
                usage,
            })
        } else {
            self.device.create_buffer(&wgpu::BufferDescriptor {
                label: Some(label),
                size,
                usage,
                mapped_at_creation: false,
            })
        };

        // Track allocation
        let allocation = MemoryAllocation {
            size,
            usage,
            label: label.to_string(),
            allocated_at: std::time::Instant::now(),
            last_used: std::time::Instant::now(),
        };

        let mut allocations = self.allocations.write().await;
        allocations.insert(label.to_string(), allocation);

        let mut total_allocated = self.total_allocated.write().await;
        *total_allocated += size;

        Ok(buffer)
    }

    /// Try to reuse a buffer from the pool
    async fn try_reuse_buffer(&self, _size: u64, _usage: wgpu::BufferUsages) -> Option<wgpu::Buffer> {
        // Buffer reuse disabled since wgpu::Buffer doesn't implement Clone
        // TODO: Implement proper buffer pool with reference counting
        None
    }

    /// Mark a buffer as used (update last_used timestamp)
    pub async fn mark_buffer_used(&self, label: &str) {
        let mut allocations = self.allocations.write().await;
        if let Some(allocation) = allocations.get_mut(label) {
            allocation.last_used = std::time::Instant::now();
        }
    }

    /// Release a buffer back to the pool for reuse
    pub async fn release_buffer(&self, label: &str) -> TradingResult<()> {
        let mut allocations = self.allocations.write().await;

        if let Some(allocation) = allocations.remove(label) {
            let mut total_allocated = self.total_allocated.write().await;
            *total_allocated = total_allocated.saturating_sub(allocation.size);

            // Add to pool for potential reuse
            let mut pool = self.buffer_pool.write().await;
            pool.push(allocation);

            // Limit pool size to prevent memory bloat
            const MAX_POOL_SIZE: usize = 50;
            if pool.len() > MAX_POOL_SIZE {
                pool.sort_by_key(|a| a.last_used);
                pool.truncate(MAX_POOL_SIZE);
            }
        }

        Ok(())
    }

    /// Cleanup unused buffers based on age and usage
    pub async fn cleanup_unused_buffers(&self) -> TradingResult<()> {
        let now = std::time::Instant::now();
        let max_age = std::time::Duration::from_secs(300); // 5 minutes

        let mut allocations = self.allocations.write().await;
        let mut total_allocated = self.total_allocated.write().await;
        let mut freed_memory = 0u64;

        // Remove old unused allocations
        allocations.retain(|_, allocation| {
            let is_old = now.duration_since(allocation.last_used) > max_age;
            if is_old {
                freed_memory += allocation.size;
                false
            } else {
                true
            }
        });

        *total_allocated = total_allocated.saturating_sub(freed_memory);

        // Also cleanup the buffer pool
        let mut pool = self.buffer_pool.write().await;
        pool.retain(|allocation| {
            now.duration_since(allocation.last_used) <= max_age
        });

        if freed_memory > 0 {
            println!("GPU Memory Manager: Freed {} MB of unused buffers", freed_memory / (1024 * 1024));
        }

        Ok(())
    }

    /// Get memory usage statistics
    pub async fn get_memory_stats(&self) -> GpuMemoryStats {
        let allocations = self.allocations.read().await;
        let total_allocated = *self.total_allocated.read().await;
        let pool = self.buffer_pool.read().await;

        GpuMemoryStats {
            total_allocated_mb: total_allocated as f64 / (1024.0 * 1024.0),
            memory_limit_mb: self.config.memory_limit_mb as f64,
            active_allocations: allocations.len(),
            pooled_buffers: pool.len(),
            memory_utilization: (total_allocated as f64) / ((self.config.memory_limit_mb * 1024 * 1024) as f64),
        }
    }

    /// Force cleanup of all allocations (for shutdown)
    pub async fn cleanup_all(&self) {
        let mut allocations = self.allocations.write().await;
        let mut total_allocated = self.total_allocated.write().await;
        let mut pool = self.buffer_pool.write().await;

        allocations.clear();
        pool.clear();
        *total_allocated = 0;
    }
}

#[derive(Debug, Clone)]
pub struct GpuMemoryStats {
    pub total_allocated_mb: f64,
    pub memory_limit_mb: f64,
    pub active_allocations: usize,
    pub pooled_buffers: usize,
    pub memory_utilization: f64,
}