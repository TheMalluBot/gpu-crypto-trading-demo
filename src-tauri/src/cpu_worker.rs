use std::sync::Arc;
use std::time::Instant;
use tokio::task;

pub struct CpuWorker {
    sample_rate: usize,
    thread_count: usize,
}

impl CpuWorker {
    pub fn new() -> Self {
        Self {
            sample_rate: 1024,
            thread_count: 4,
        }
    }
    
    pub async fn generate_samples(&mut self) -> f32 {
        let start_time = Instant::now();
        
        // Generate sine waves in parallel across multiple threads
        let samples_per_thread = self.sample_rate / self.thread_count;
        let mut handles = Vec::new();
        
        for thread_id in 0..self.thread_count {
            let start_idx = thread_id * samples_per_thread;
            let end_idx = (thread_id + 1) * samples_per_thread;
            
            let handle = task::spawn_blocking(move || {
                let mut samples = Vec::with_capacity(samples_per_thread);
                let frequency = 440.0 + (thread_id as f32 * 110.0); // Different frequency per thread
                
                for i in start_idx..end_idx {
                    let t = i as f32 / 44100.0; // Sample rate
                    let sample = (2.0 * std::f32::consts::PI * frequency * t).sin();
                    
                    // Add some computational load
                    let processed_sample = sample * sample.cos() + (sample * 2.0).sin() * 0.3;
                    samples.push(processed_sample);
                }
                
                samples
            });
            
            handles.push(handle);
        }
        
        // Wait for all threads to complete and collect results
        let mut all_samples = Vec::with_capacity(self.sample_rate);
        for handle in handles {
            let thread_samples = handle.await.unwrap();
            all_samples.extend(thread_samples);
        }
        
        // Calculate RMS for CPU load simulation
        let rms: f32 = all_samples.iter().map(|s| s * s).sum::<f32>() / all_samples.len() as f32;
        let cpu_load = (rms.sqrt() * 100.0).min(100.0);
        
        // Simulate variable CPU load based on processing time
        let processing_time = start_time.elapsed().as_millis() as f32;
        let load_factor = (processing_time / 16.0).min(1.0); // 16ms target
        
        cpu_load * load_factor
    }
}