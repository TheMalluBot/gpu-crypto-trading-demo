use std::time::Instant;
use sysinfo::{System, Cpu};

pub struct CpuWorker {
    system: System,
    last_measurement: Option<Instant>,
}

impl CpuWorker {
    pub fn new() -> Self {
        let mut system = System::new_all();
        system.refresh_cpu(); // Initial refresh
        
        Self {
            system,
            last_measurement: None,
        }
    }
    
    /// Get actual CPU load from system
    pub async fn generate_samples(&mut self) -> f32 {
        let start_time = Instant::now();
        
        // Only measure CPU every 500ms to avoid overhead
        if let Some(last) = self.last_measurement {
            if start_time.duration_since(last).as_millis() < 500 {
                // Return cached value if measured recently
                return self.get_cached_cpu_load();
            }
        }
        
        // Refresh CPU information
        self.system.refresh_cpu();
        self.last_measurement = Some(start_time);
        
        // Calculate average CPU usage across all cores
        let cpu_usage = self.system.cpus()
            .iter()
            .map(|cpu| cpu.cpu_usage())
            .sum::<f32>() / self.system.cpus().len() as f32;
        
        // Ensure we return a reasonable value
        cpu_usage.max(0.0).min(100.0)
    }
    
    /// Get cached CPU load without refreshing
    fn get_cached_cpu_load(&self) -> f32 {
        let cpu_usage = self.system.cpus()
            .iter()
            .map(|cpu| cpu.cpu_usage())
            .sum::<f32>() / self.system.cpus().len() as f32;
        
        cpu_usage.max(0.0).min(100.0)
    }
    
    /// Get CPU core count
    pub fn get_cpu_core_count(&self) -> usize {
        self.system.cpus().len()
    }
    
    /// Get system memory usage
    pub fn get_memory_usage(&mut self) -> (u64, u64) {
        self.system.refresh_memory();
        (self.system.used_memory(), self.system.total_memory())
    }
}