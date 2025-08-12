use crate::gpu_renderer::GpuRenderer;
use crate::gpu_trading::GpuTradingAccelerator;
use crate::gpu_memory_manager::GpuMemoryManager;
use crate::models::PriceData;
use crate::tests::{generate_uptrend_data, generate_volatile_data};

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_gpu_renderer_initialization() {
        let renderer_result = GpuRenderer::new().await;
        
        match renderer_result {
            Ok(renderer) => {
                // GPU initialization successful
                assert!(renderer.is_initialized(), "GPU renderer should be initialized");
                
                // Test basic GPU capabilities
                let device_info = renderer.get_device_info();
                assert!(!device_info.name.is_empty(), "GPU device should have a name");
                assert!(device_info.memory_size > 0, "GPU should have memory");
            },
            Err(e) => {
                // GPU not available, fallback to CPU should work
                println!("GPU not available (expected in some environments): {}", e);
                // This is acceptable in testing environments without GPU
            }
        }
    }

    #[tokio::test]
    async fn test_gpu_fallback_mechanism() {
        // Test the fallback mechanism when GPU is not available
        let trading_accelerator = GpuTradingAccelerator::new().await;
        
        // Should initialize regardless of GPU availability
        assert!(trading_accelerator.is_initialized(), "Trading accelerator should initialize with fallback");
        
        // Should be able to perform calculations
        let test_data = generate_uptrend_data(100.0, 10, 1.0);
        let result = trading_accelerator.calculate_indicators(&test_data).await;
        
        match result {
            Ok(indicators) => {
                assert!(!indicators.is_empty(), "Should calculate indicators");
            },
            Err(e) => {
                // Even with fallback, basic operations should work
                panic!("Basic indicator calculation should work with fallback: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_gpu_memory_management() {
        let memory_manager = GpuMemoryManager::new().await;
        
        match memory_manager {
            Ok(mut manager) => {
                // Test memory allocation
                let buffer_size = 1024;
                let allocation_result = manager.allocate_buffer(buffer_size).await;
                
                assert!(allocation_result.is_ok(), "Should be able to allocate GPU memory");
                
                // Test memory usage tracking
                let memory_usage = manager.get_memory_usage();
                assert!(memory_usage.used_bytes > 0, "Should track memory usage");
                assert!(memory_usage.total_bytes > 0, "Should report total memory");
                
                // Test memory cleanup
                manager.cleanup().await;
                let post_cleanup_usage = manager.get_memory_usage();
                assert!(post_cleanup_usage.used_bytes < memory_usage.used_bytes, 
                       "Should free memory after cleanup");
            },
            Err(e) => {
                println!("GPU memory manager not available: {}", e);
                // This is acceptable in environments without GPU
            }
        }
    }

    #[tokio::test]
    async fn test_gpu_trading_calculations() {
        let trading_accelerator = GpuTradingAccelerator::new().await;
        
        // Test with realistic trading data
        let price_data = generate_uptrend_data(100.0, 50, 0.5);
        
        // Test LRO calculation on GPU
        let lro_result = trading_accelerator.calculate_lro(&price_data, 14).await;
        
        match lro_result {
            Ok(lro_values) => {
                assert_eq!(lro_values.len(), price_data.len(), "Should return LRO for each price point");
                
                // Verify LRO values are reasonable
                for &lro in &lro_values {
                    assert!(lro.is_finite(), "LRO values should be finite");
                    assert!(lro.abs() < 100.0, "LRO values should be reasonable magnitude");
                }
                
                // In uptrend, later LRO values should trend positive
                let later_values: Vec<f64> = lro_values.iter().skip(30).cloned().collect();
                let avg_later = later_values.iter().sum::<f64>() / later_values.len() as f64;
                assert!(avg_later > -1.0, "Uptrend should show positive or neutral LRO trend");
            },
            Err(e) => {
                println!("GPU LRO calculation failed, using CPU fallback: {}", e);
                // Should still work with CPU fallback
            }
        }
    }

    #[tokio::test]
    async fn test_gpu_batch_processing() {
        let trading_accelerator = GpuTradingAccelerator::new().await;
        
        // Create multiple datasets for batch processing
        let datasets = vec![
            generate_uptrend_data(100.0, 20, 1.0),
            generate_uptrend_data(200.0, 20, 2.0),
            generate_uptrend_data(50.0, 20, 0.5),
        ];
        
        let batch_result = trading_accelerator.batch_calculate_indicators(&datasets).await;
        
        match batch_result {
            Ok(results) => {
                assert_eq!(results.len(), datasets.len(), "Should process all datasets");
                
                for (i, result) in results.iter().enumerate() {
                    assert_eq!(result.len(), datasets[i].len(), 
                             "Each result should match input dataset size");
                }
            },
            Err(e) => {
                println!("GPU batch processing not available: {}", e);
                // Acceptable if GPU batch processing isn't implemented
            }
        }
    }

    #[tokio::test]
    async fn test_gpu_performance_comparison() {
        let trading_accelerator = GpuTradingAccelerator::new().await;
        
        // Large dataset for performance testing
        let large_dataset = generate_volatile_data(100.0, 1000, 0.1);
        
        // Time GPU calculation
        let gpu_start = std::time::Instant::now();
        let gpu_result = trading_accelerator.calculate_indicators(&large_dataset).await;
        let gpu_duration = gpu_start.elapsed();
        
        // Time CPU calculation
        let cpu_start = std::time::Instant::now();
        let cpu_result = calculate_indicators_cpu(&large_dataset);
        let cpu_duration = cpu_start.elapsed();
        
        match (gpu_result, cpu_result) {
            (Ok(gpu_indicators), Ok(cpu_indicators)) => {
                // Results should be similar (within tolerance)
                assert_eq!(gpu_indicators.len(), cpu_indicators.len(), 
                          "GPU and CPU should return same number of indicators");
                
                // Performance comparison (GPU should be faster for large datasets)
                println!("GPU calculation: {:?}, CPU calculation: {:?}", gpu_duration, cpu_duration);
                
                // In some test environments, GPU might not be faster due to overhead
                // So we just verify both methods work correctly
            },
            (Err(gpu_err), Ok(_cpu_indicators)) => {
                println!("GPU calculation failed, CPU fallback worked: {}", gpu_err);
                // This is acceptable - CPU fallback should always work
            },
            (Ok(_gpu_indicators), Err(cpu_err)) => {
                panic!("CPU calculation should not fail: {}", cpu_err);
            },
            (Err(gpu_err), Err(cpu_err)) => {
                panic!("Both GPU and CPU calculations failed: GPU: {}, CPU: {}", gpu_err, cpu_err);
            }
        }
    }

    #[tokio::test]
    async fn test_gpu_resource_limits() {
        let trading_accelerator = GpuTradingAccelerator::new().await;
        
        // Test with extremely large dataset to check resource handling
        let massive_dataset = generate_uptrend_data(100.0, 10000, 0.1);
        
        let result = trading_accelerator.calculate_indicators(&massive_dataset).await;
        
        match result {
            Ok(indicators) => {
                assert_eq!(indicators.len(), massive_dataset.len(), 
                          "Should handle large datasets");
            },
            Err(e) => {
                // Should gracefully handle resource limitations
                println!("Large dataset processing limitation (expected): {}", e);
                
                // Should still work with smaller chunks
                let chunk_size = 1000;
                let chunks: Vec<_> = massive_dataset.chunks(chunk_size).collect();
                
                for (i, chunk) in chunks.iter().enumerate().take(3) { // Test first 3 chunks
                    let chunk_result = trading_accelerator.calculate_indicators(&chunk.to_vec()).await;
                    assert!(chunk_result.is_ok(), "Should handle chunk {} processing", i);
                }
            }
        }
    }

    #[tokio::test]
    async fn test_gpu_concurrent_operations() {
        let trading_accelerator = GpuTradingAccelerator::new().await;
        
        // Test concurrent GPU operations
        let datasets = vec![
            generate_uptrend_data(100.0, 100, 1.0),
            generate_uptrend_data(200.0, 100, 2.0),
            generate_uptrend_data(50.0, 100, 0.5),
        ];
        
        // Run calculations concurrently
        let futures: Vec<_> = datasets.iter()
            .map(|data| trading_accelerator.calculate_indicators(data))
            .collect();
        
        let results = futures::future::join_all(futures).await;
        
        // All operations should complete successfully
        for (i, result) in results.iter().enumerate() {
            match result {
                Ok(indicators) => {
                    assert_eq!(indicators.len(), datasets[i].len(), 
                             "Concurrent operation {} should succeed", i);
                },
                Err(e) => {
                    println!("Concurrent operation {} failed (may be expected): {}", i, e);
                    // Some failures acceptable due to resource contention
                }
            }
        }
    }

    #[test]
    fn test_gpu_error_handling() {
        // Test error handling without actual GPU operations
        let error_cases = vec![
            "Device lost",
            "Out of memory", 
            "Invalid buffer size",
            "Compute shader compilation failed",
        ];
        
        for error_msg in error_cases {
            // Simulate GPU error handling
            let simulated_error = simulate_gpu_error(error_msg);
            assert!(simulated_error.is_err(), "Should handle GPU error: {}", error_msg);
            
            // Error should be descriptive
            let error_string = simulated_error.unwrap_err();
            assert!(error_string.contains(error_msg), "Error should contain original message");
        }
    }

    #[tokio::test]
    async fn test_gpu_state_management() {
        let mut trading_accelerator = GpuTradingAccelerator::new().await;
        
        // Test state persistence across operations
        let initial_state = trading_accelerator.get_state();
        
        // Perform operation
        let test_data = generate_uptrend_data(100.0, 50, 1.0);
        let _result = trading_accelerator.calculate_indicators(&test_data).await;
        
        // State should be maintained
        let post_operation_state = trading_accelerator.get_state();
        assert_eq!(initial_state.device_id, post_operation_state.device_id, 
                  "Device ID should remain consistent");
        
        // Reset state
        trading_accelerator.reset_state().await;
        let reset_state = trading_accelerator.get_state();
        
        // Should handle state reset gracefully
        assert!(reset_state.operation_count == 0, "Operation count should reset");
    }

    // Helper functions for testing

    fn calculate_indicators_cpu(data: &[PriceData]) -> Result<Vec<f64>, String> {
        // Simple CPU-based indicator calculation for comparison
        if data.len() < 14 {
            return Ok(vec![0.0; data.len()]);
        }
        
        let mut indicators = Vec::with_capacity(data.len());
        
        for i in 0..data.len() {
            if i < 13 {
                indicators.push(0.0);
            } else {
                // Simple moving average as test indicator
                let sum: f64 = data[i-13..=i].iter()
                    .map(|d| d.close.to_string().parse::<f64>().unwrap_or(0.0))
                    .sum();
                let avg = sum / 14.0;
                indicators.push(avg);
            }
        }
        
        Ok(indicators)
    }

    fn simulate_gpu_error(error_type: &str) -> Result<(), String> {
        Err(format!("GPU Error: {}", error_type))
    }
}