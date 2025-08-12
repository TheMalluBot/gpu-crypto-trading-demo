use crate::enhanced_lro::{EnhancedLRO, LROConfig, LROSignal, MarketCondition};
use crate::models::PriceData;
use crate::tests::{generate_uptrend_data, generate_downtrend_data, generate_sideways_data, generate_volatile_data};
use rust_decimal::Decimal;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_default_enhanced_config() -> LROConfig {
        LROConfig {
            base_period: 20,
            min_period: 10,
            max_period: 50,
            overbought_threshold: 2.0,
            oversold_threshold: -2.0,
            signal_smoothing: 5,
            volume_weighting: true,
            multi_timeframe: true,
            divergence_detection: true,
            adaptive_periods: true,
        }
    }

    #[test]
    fn test_enhanced_lro_initialization() {
        let config = create_default_enhanced_config();
        let lro = EnhancedLRO::new(config.clone());
        
        assert_eq!(lro.get_config().base_period, config.base_period);
        assert_eq!(lro.get_config().min_period, config.min_period);
        assert_eq!(lro.get_config().max_period, config.max_period);
        assert!(lro.get_config().volume_weighting);
        assert!(lro.get_config().multi_timeframe);
    }

    #[test]
    fn test_adaptive_period_adjustment() {
        let config = create_default_enhanced_config();
        let mut lro = EnhancedLRO::new(config);
        
        // Generate volatile data to trigger adaptive period adjustment
        let volatile_data = generate_volatile_data(100.0, 30, 0.15);
        
        for data in volatile_data {
            lro.update(data);
        }
        
        let statistics = lro.get_statistics();
        
        // In volatile conditions, adaptive periods should be active
        assert!(statistics.adaptive_period_active, "Adaptive periods should be active in volatile conditions");
        
        // Current period should be within valid range
        assert!(statistics.current_period >= 10 && statistics.current_period <= 50,
               "Current period should be within min/max range: {}", statistics.current_period);
    }

    #[test]
    fn test_volume_weighted_calculations() {
        let mut config = create_default_enhanced_config();
        config.volume_weighting = true;
        let mut lro_weighted = EnhancedLRO::new(config);
        
        let mut config_no_weight = create_default_enhanced_config();
        config_no_weight.volume_weighting = false;
        let mut lro_no_weight = EnhancedLRO::new(config_no_weight);
        
        // Generate data with varying volume
        let mut data = generate_uptrend_data(100.0, 20, 1.0);
        for (i, price_data) in data.iter_mut().enumerate() {
            // Vary volume significantly
            price_data.volume = Decimal::from_f64(1000.0 + (i as f64 * 500.0)).unwrap();
        }
        
        for price_data in data {
            lro_weighted.update(price_data.clone());
            lro_no_weight.update(price_data);
        }
        
        let weighted_signals = lro_weighted.get_signals();
        let unweighted_signals = lro_no_weight.get_signals();
        
        // Volume weighting should produce different results
        if !weighted_signals.is_empty() && !unweighted_signals.is_empty() {
            let weighted_avg = weighted_signals.iter().map(|s| s.lro_value).sum::<f64>() / weighted_signals.len() as f64;
            let unweighted_avg = unweighted_signals.iter().map(|s| s.lro_value).sum::<f64>() / unweighted_signals.len() as f64;
            
            // Results should be different (within reasonable tolerance)
            assert!((weighted_avg - unweighted_avg).abs() > 0.01,
                   "Volume weighting should produce different results: {} vs {}", weighted_avg, unweighted_avg);
        }
    }

    #[test]
    fn test_multi_timeframe_analysis() {
        let config = create_default_enhanced_config();
        let mut lro = EnhancedLRO::new(config);
        
        // Generate sufficient data for multi-timeframe analysis
        let price_data = generate_uptrend_data(100.0, 60, 0.5);
        
        for data in price_data {
            lro.update(data);
        }
        
        let statistics = lro.get_statistics();
        
        // Multi-timeframe analysis should be active with sufficient data
        assert!(statistics.multi_timeframe_active, "Multi-timeframe analysis should be active");
        
        // Should have confluence scores calculated
        let signals = lro.get_signals();
        if !signals.is_empty() {
            let has_confluence = signals.iter().any(|s| s.confluence_score > 0.0);
            assert!(has_confluence, "Should have confluence scores from multi-timeframe analysis");
        }
    }

    #[test]
    fn test_divergence_detection() {
        let config = create_default_enhanced_config();
        let mut lro = EnhancedLRO::new(config);
        
        // Create divergence scenario: price makes new highs but LRO doesn't
        let mut price_data = generate_uptrend_data(100.0, 30, 1.0);
        
        // Add some declining volume to create divergence conditions
        for (i, data) in price_data.iter_mut().enumerate() {
            if i > 15 {
                // Later data has declining volume despite rising prices
                data.volume = Decimal::from_f64(2000.0 - (i as f64 * 50.0)).unwrap();
            }
        }
        
        for data in price_data {
            lro.update(data);
        }
        
        let signals = lro.get_signals();
        let statistics = lro.get_statistics();
        
        // Should detect divergence conditions
        assert!(statistics.divergence_detected, "Should detect divergence conditions");
        
        // Some signals should have divergence warnings
        let divergence_signals: Vec<_> = signals.iter().filter(|s| s.divergence_strength > 0.0).collect();
        assert!(!divergence_signals.is_empty(), "Should have signals with divergence warnings");
    }

    #[test]
    fn test_market_condition_detection() {
        let config = create_default_enhanced_config();
        
        // Test trending market
        let mut lro_trend = EnhancedLRO::new(config.clone());
        let trend_data = generate_uptrend_data(100.0, 25, 2.0);
        for data in trend_data {
            lro_trend.update(data);
        }
        
        let trend_stats = lro_trend.get_statistics();
        assert_eq!(trend_stats.market_condition, MarketCondition::Trending,
                  "Should detect trending market condition");
        
        // Test ranging market
        let mut lro_range = EnhancedLRO::new(config.clone());
        let range_data = generate_sideways_data(100.0, 25, 3.0);
        for data in range_data {
            lro_range.update(data);
        }
        
        let range_stats = lro_range.get_statistics();
        assert_eq!(range_stats.market_condition, MarketCondition::Ranging,
                  "Should detect ranging market condition");
        
        // Test volatile market
        let mut lro_volatile = EnhancedLRO::new(config);
        let volatile_data = generate_volatile_data(100.0, 25, 0.2);
        for data in volatile_data {
            lro_volatile.update(data);
        }
        
        let volatile_stats = lro_volatile.get_statistics();
        assert_eq!(volatile_stats.market_condition, MarketCondition::Volatile,
                  "Should detect volatile market condition");
    }

    #[test]
    fn test_signal_confidence_calculation() {
        let config = create_default_enhanced_config();
        let mut lro = EnhancedLRO::new(config);
        
        // Generate strong trending data for high confidence
        let strong_trend = generate_uptrend_data(100.0, 30, 3.0);
        
        for data in strong_trend {
            lro.update(data);
        }
        
        let signals = lro.get_signals();
        
        // Strong trends should produce high confidence signals
        let high_confidence_signals: Vec<_> = signals.iter().filter(|s| s.confidence > 0.8).collect();
        assert!(!high_confidence_signals.is_empty(), "Strong trends should produce high confidence signals");
        
        // Check confidence is within valid range
        for signal in &signals {
            assert!(signal.confidence >= 0.0 && signal.confidence <= 1.0,
                   "Confidence should be between 0 and 1: {}", signal.confidence);
        }
    }

    #[test]
    fn test_signal_smoothing() {
        let mut config = create_default_enhanced_config();
        config.signal_smoothing = 3;
        let mut lro_smoothed = EnhancedLRO::new(config);
        
        let mut config_no_smooth = create_default_enhanced_config();
        config_no_smooth.signal_smoothing = 1;
        let mut lro_raw = EnhancedLRO::new(config_no_smooth);
        
        // Generate noisy data
        let noisy_data = generate_volatile_data(100.0, 30, 0.1);
        
        for data in noisy_data {
            lro_smoothed.update(data.clone());
            lro_raw.update(data);
        }
        
        let smoothed_signals = lro_smoothed.get_signals();
        let raw_signals = lro_raw.get_signals();
        
        if smoothed_signals.len() > 5 && raw_signals.len() > 5 {
            // Calculate variance of LRO values
            let smoothed_variance = calculate_variance(&smoothed_signals.iter().map(|s| s.lro_value).collect::<Vec<_>>());
            let raw_variance = calculate_variance(&raw_signals.iter().map(|s| s.lro_value).collect::<Vec<_>>());
            
            // Smoothed signals should have lower variance
            assert!(smoothed_variance < raw_variance,
                   "Smoothed signals should have lower variance: {} vs {}", smoothed_variance, raw_variance);
        }
    }

    #[test]
    fn test_performance_metrics() {
        let config = create_default_enhanced_config();
        let mut lro = EnhancedLRO::new(config);
        
        let price_data = generate_uptrend_data(100.0, 100, 0.5);
        
        let start_time = std::time::Instant::now();
        for data in price_data {
            lro.update(data);
        }
        let duration = start_time.elapsed();
        
        // Performance should be reasonable (less than 100ms for 100 updates)
        assert!(duration.as_millis() < 100,
               "Performance should be reasonable: {}ms for 100 updates", duration.as_millis());
        
        let statistics = lro.get_statistics();
        assert_eq!(statistics.total_updates, 100, "Should track total updates correctly");
    }

    #[test]
    fn test_reset_functionality() {
        let config = create_default_enhanced_config();
        let mut lro = EnhancedLRO::new(config);
        
        // Add some data
        let price_data = generate_uptrend_data(100.0, 20, 1.0);
        for data in price_data {
            lro.update(data);
        }
        
        // Verify data exists
        assert!(!lro.get_signals().is_empty(), "Should have signals before reset");
        assert!(lro.get_statistics().total_updates > 0, "Should have updates before reset");
        
        // Reset
        lro.reset();
        
        // Verify reset
        let post_reset_stats = lro.get_statistics();
        assert_eq!(post_reset_stats.total_updates, 0, "Should have zero updates after reset");
        assert!(lro.get_signals().is_empty(), "Should have no signals after reset");
    }

    #[test]
    fn test_edge_case_extreme_values() {
        let config = create_default_enhanced_config();
        let mut lro = EnhancedLRO::new(config);
        
        // Create extreme price data
        let extreme_data = vec![
            PriceData {
                timestamp: chrono::Utc::now(),
                open: Decimal::from_f64(0.0001).unwrap(),
                high: Decimal::from_f64(0.0002).unwrap(),
                low: Decimal::from_f64(0.0001).unwrap(),
                close: Decimal::from_f64(0.0002).unwrap(),
                volume: Decimal::from_f64(1.0).unwrap(),
            },
            PriceData {
                timestamp: chrono::Utc::now(),
                open: Decimal::from_f64(10000.0).unwrap(),
                high: Decimal::from_f64(20000.0).unwrap(),
                low: Decimal::from_f64(10000.0).unwrap(),
                close: Decimal::from_f64(15000.0).unwrap(),
                volume: Decimal::from_f64(1000000.0).unwrap(),
            },
        ];
        
        // Should handle extreme values without panicking
        for data in extreme_data {
            lro.update(data);
        }
        
        // Should still be able to get statistics
        let stats = lro.get_statistics();
        assert!(stats.total_updates > 0, "Should track updates even with extreme values");
    }

    // Helper function to calculate variance
    fn calculate_variance(values: &[f64]) -> f64 {
        if values.is_empty() {
            return 0.0;
        }
        
        let mean = values.iter().sum::<f64>() / values.len() as f64;
        let variance = values.iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f64>() / values.len() as f64;
        
        variance
    }
}