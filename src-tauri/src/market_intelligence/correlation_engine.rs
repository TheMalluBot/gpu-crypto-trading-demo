// Correlation Analysis Engine for Market Intelligence Agent
use crate::types::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::RwLock;
use std::sync::Arc;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationAnalysisEngine {
    correlation_calculators: HashMap<String, Box<dyn CorrelationCalculator + Send + Sync>>,
    pattern_detector: CorrelationPatternDetector,
    relationship_analyzer: MarketRelationshipAnalyzer,
    cross_asset_analyzer: CrossAssetCorrelationAnalyzer,
    temporal_analyzer: TemporalCorrelationAnalyzer,
    predictive_correlator: PredictiveCorrelationEngine,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationData {
    pub asset_a: String,
    pub asset_b: String,
    pub correlation_coefficient: f64,
    pub p_value: f64,
    pub confidence_interval: (f64, f64),
    pub sample_size: usize,
    pub calculation_method: CorrelationMethod,
    pub time_period: TimeRange,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CorrelationMethod {
    Pearson,
    Spearman,
    Kendall,
    RollingWindow,
    DynamicTimeWarping,
    MutualInformation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationMatrix {
    pub assets: Vec<String>,
    pub correlation_values: Vec<Vec<f64>>,
    pub p_values: Vec<Vec<f64>>,
    pub calculation_timestamp: DateTime<Utc>,
    pub method_used: CorrelationMethod,
    pub time_period: TimeRange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationAnalysisReport {
    pub analysis_timestamp: DateTime<Utc>,
    pub correlation_matrix: CorrelationMatrix,
    pub significant_correlations: Vec<CorrelationData>,
    pub correlation_patterns: Vec<CorrelationPattern>,
    pub market_relationships: Vec<MarketRelationship>,
    pub cross_asset_analysis: CrossAssetAnalysis,
    pub temporal_analysis: TemporalCorrelationAnalysis,
    pub predictive_insights: PredictiveCorrelationInsights,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationPattern {
    pub pattern_type: PatternType,
    pub assets_involved: Vec<String>,
    pub pattern_strength: f64,
    pub duration: std::time::Duration,
    pub frequency: f64,
    pub confidence_score: f64,
    pub historical_occurrences: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PatternType {
    PositiveCorrelation,
    NegativeCorrelation,
    LeadLagRelationship,
    SeasonalCorrelation,
    VolatilitySpillover,
    CopulaPattern,
    RegimeShift,
    NonLinearRelationship,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketRelationship {
    pub relationship_type: RelationshipType,
    pub primary_asset: String,
    pub secondary_asset: String,
    pub relationship_strength: f64,
    pub causal_direction: CausalDirection,
    pub time_lag: Option<std::time::Duration>,
    pub relationship_stability: f64,
    pub market_conditions: Vec<MarketCondition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RelationshipType {
    Causal,
    Spurious,
    CoIntegrated,
    MeanReverting,
    TrendFollowing,
    Contrarian,
    FlightToQuality,
    RiskOnRiskOff,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CausalDirection {
    AToB,
    BToA,
    Bidirectional,
    NoDirectionality,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MarketCondition {
    BullMarket,
    BearMarket,
    HighVolatility,
    LowVolatility,
    TrendingMarket,
    RangeBoundMarket,
    CrisisMode,
    NormalConditions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossAssetAnalysis {
    pub asset_class_correlations: HashMap<String, HashMap<String, f64>>,
    pub sector_correlations: HashMap<String, HashMap<String, f64>>,
    pub geographic_correlations: HashMap<String, HashMap<String, f64>>,
    pub currency_correlations: HashMap<String, HashMap<String, f64>>,
    pub factor_exposures: HashMap<String, FactorExposure>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactorExposure {
    pub market_factor: f64,
    pub size_factor: f64,
    pub value_factor: f64,
    pub momentum_factor: f64,
    pub quality_factor: f64,
    pub volatility_factor: f64,
    pub interest_rate_sensitivity: f64,
    pub inflation_sensitivity: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalCorrelationAnalysis {
    pub rolling_correlations: Vec<RollingCorrelationPoint>,
    pub correlation_breakpoints: Vec<CorrelationBreakpoint>,
    pub regime_changes: Vec<CorrelationRegime>,
    pub seasonal_patterns: Vec<SeasonalCorrelationPattern>,
    pub intraday_patterns: Vec<IntradayCorrelationPattern>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollingCorrelationPoint {
    pub timestamp: DateTime<Utc>,
    pub correlation: f64,
    pub window_size: usize,
    pub volatility: f64,
    pub significance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationBreakpoint {
    pub timestamp: DateTime<Utc>,
    pub pre_correlation: f64,
    pub post_correlation: f64,
    pub change_magnitude: f64,
    pub statistical_significance: f64,
    pub potential_causes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationRegime {
    pub regime_id: String,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub average_correlation: f64,
    pub correlation_volatility: f64,
    pub market_characteristics: Vec<MarketCondition>,
    pub regime_stability: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeasonalCorrelationPattern {
    pub season: SeasonType,
    pub average_correlation: f64,
    pub correlation_range: (f64, f64),
    pub statistical_significance: f64,
    pub years_of_data: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SeasonType {
    January,
    February,
    March,
    April,
    May,
    June,
    July,
    August,
    September,
    October,
    November,
    December,
    Q1,
    Q2,
    Q3,
    Q4,
    YearEnd,
    Earnings,
    OptionExpiry,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntradayCorrelationPattern {
    pub hour: u32,
    pub average_correlation: f64,
    pub correlation_volatility: f64,
    pub trading_volume_impact: f64,
    pub market_open_effect: bool,
    pub market_close_effect: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictiveCorrelationInsights {
    pub correlation_forecasts: Vec<CorrelationForecast>,
    pub relationship_stability_forecast: Vec<StabilityForecast>,
    pub regime_change_probability: Vec<RegimeChangeProbability>,
    pub correlation_extremes_forecast: Vec<ExtremeForecast>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationForecast {
    pub asset_pair: (String, String),
    pub forecast_horizon: std::time::Duration,
    pub predicted_correlation: f64,
    pub confidence_interval: (f64, f64),
    pub forecast_accuracy: f64,
    pub key_factors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StabilityForecast {
    pub asset_pair: (String, String),
    pub stability_score: f64,
    pub volatility_forecast: f64,
    pub breakdown_probability: f64,
    pub time_horizon: std::time::Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegimeChangeProbability {
    pub current_regime: String,
    pub potential_regime: String,
    pub transition_probability: f64,
    pub expected_timeframe: std::time::Duration,
    pub trigger_events: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtremeForecast {
    pub asset_pair: (String, String),
    pub extreme_type: ExtremeType,
    pub probability: f64,
    pub magnitude: f64,
    pub time_horizon: std::time::Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExtremeType {
    VeryHighCorrelation,
    VeryLowCorrelation,
    CorrelationBreakdown,
    CorrelationSpike,
    RegimeShift,
}

pub trait CorrelationCalculator {
    async fn calculate_correlation(&self, data_a: &[f64], data_b: &[f64]) -> TradingResult<CorrelationData>;
    async fn calculate_rolling_correlation(&self, data_a: &[f64], data_b: &[f64], window: usize) -> TradingResult<Vec<f64>>;
    async fn test_significance(&self, correlation: f64, sample_size: usize) -> TradingResult<f64>;
}

impl CorrelationAnalysisEngine {
    /// Create new correlation analysis engine
    pub async fn new() -> TradingResult<Self> {
        let correlation_calculators = Self::initialize_correlation_calculators().await?;
        let pattern_detector = CorrelationPatternDetector::new().await?;
        let relationship_analyzer = MarketRelationshipAnalyzer::new().await?;
        let cross_asset_analyzer = CrossAssetCorrelationAnalyzer::new().await?;
        let temporal_analyzer = TemporalCorrelationAnalyzer::new().await?;
        let predictive_correlator = PredictiveCorrelationEngine::new().await?;

        Ok(Self {
            correlation_calculators,
            pattern_detector,
            relationship_analyzer,
            cross_asset_analyzer,
            temporal_analyzer,
            predictive_correlator,
        })
    }

    /// Perform comprehensive correlation analysis
    pub async fn analyze_correlations(&self, assets: &[String], time_range: TimeRange) -> TradingResult<CorrelationAnalysisReport> {
        // Calculate correlation matrix
        let correlation_matrix = self.calculate_correlation_matrix(assets, time_range).await?;
        
        // Identify significant correlations
        let significant_correlations = self.identify_significant_correlations(&correlation_matrix).await?;
        
        // Detect correlation patterns
        let correlation_patterns = self.pattern_detector.detect_patterns(assets, time_range).await?;
        
        // Analyze market relationships
        let market_relationships = self.relationship_analyzer.analyze_relationships(assets, time_range).await?;
        
        // Perform cross-asset analysis
        let cross_asset_analysis = self.cross_asset_analyzer.analyze_cross_assets(assets, time_range).await?;
        
        // Analyze temporal correlations
        let temporal_analysis = self.temporal_analyzer.analyze_temporal_correlations(assets, time_range).await?;
        
        // Generate predictive insights
        let predictive_insights = self.predictive_correlator.generate_insights(assets, time_range).await?;

        Ok(CorrelationAnalysisReport {
            analysis_timestamp: Utc::now(),
            correlation_matrix,
            significant_correlations,
            correlation_patterns,
            market_relationships,
            cross_asset_analysis,
            temporal_analysis,
            predictive_insights,
        })
    }

    /// Calculate correlation matrix for multiple assets
    pub async fn calculate_correlation_matrix(&self, assets: &[String], time_range: TimeRange) -> TradingResult<CorrelationMatrix> {
        let n = assets.len();
        let mut correlation_values = vec![vec![0.0; n]; n];
        let mut p_values = vec![vec![1.0; n]; n];
        
        // Get price data for all assets
        let price_data = self.get_price_data(assets, time_range).await?;
        
        // Calculate pairwise correlations
        for i in 0..n {
            for j in 0..n {
                if i == j {
                    correlation_values[i][j] = 1.0;
                    p_values[i][j] = 0.0;
                } else if i < j {
                    let data_a = &price_data[&assets[i]];
                    let data_b = &price_data[&assets[j]];
                    
                    if let Some(calculator) = self.correlation_calculators.get("pearson") {
                        let correlation_data = calculator.calculate_correlation(data_a, data_b).await?;
                        correlation_values[i][j] = correlation_data.correlation_coefficient;
                        correlation_values[j][i] = correlation_data.correlation_coefficient;
                        p_values[i][j] = correlation_data.p_value;
                        p_values[j][i] = correlation_data.p_value;
                    }
                }
            }
        }

        Ok(CorrelationMatrix {
            assets: assets.to_vec(),
            correlation_values,
            p_values,
            calculation_timestamp: Utc::now(),
            method_used: CorrelationMethod::Pearson,
            time_period: time_range,
        })
    }

    /// Calculate rolling correlation between two assets
    pub async fn calculate_rolling_correlation(
        &self,
        asset_a: &str,
        asset_b: &str,
        window_size: usize,
        time_range: TimeRange
    ) -> TradingResult<Vec<RollingCorrelationPoint>> {
        let price_data = self.get_price_data(&[asset_a.to_string(), asset_b.to_string()], time_range).await?;
        
        let data_a = &price_data[asset_a];
        let data_b = &price_data[asset_b];
        
        if let Some(calculator) = self.correlation_calculators.get("pearson") {
            let rolling_correlations = calculator.calculate_rolling_correlation(data_a, data_b, window_size).await?;
            
            let mut result = Vec::new();
            for (i, correlation) in rolling_correlations.iter().enumerate() {
                if i >= window_size {
                    result.push(RollingCorrelationPoint {
                        timestamp: Utc::now() - chrono::Duration::days((rolling_correlations.len() - i) as i64),
                        correlation: *correlation,
                        window_size,
                        volatility: self.calculate_correlation_volatility(&rolling_correlations, i, window_size).await?,
                        significance: calculator.test_significance(*correlation, window_size).await?,
                    });
                }
            }
            
            Ok(result)
        } else {
            Err(TradingError::CalculationError("Pearson calculator not found".to_string()))
        }
    }

    /// Detect correlation breakpoints
    pub async fn detect_correlation_breakpoints(
        &self,
        asset_a: &str,
        asset_b: &str,
        time_range: TimeRange
    ) -> TradingResult<Vec<CorrelationBreakpoint>> {
        let rolling_correlations = self.calculate_rolling_correlation(asset_a, asset_b, 30, time_range).await?;
        
        let mut breakpoints = Vec::new();
        let threshold = 0.3; // Minimum change in correlation to be considered a breakpoint
        
        for i in 1..rolling_correlations.len() {
            let change = (rolling_correlations[i].correlation - rolling_correlations[i-1].correlation).abs();
            
            if change > threshold {
                breakpoints.push(CorrelationBreakpoint {
                    timestamp: rolling_correlations[i].timestamp,
                    pre_correlation: rolling_correlations[i-1].correlation,
                    post_correlation: rolling_correlations[i].correlation,
                    change_magnitude: change,
                    statistical_significance: self.test_breakpoint_significance(
                        rolling_correlations[i-1].correlation,
                        rolling_correlations[i].correlation,
                        30
                    ).await?,
                    potential_causes: self.identify_potential_causes(rolling_correlations[i].timestamp).await?,
                });
            }
        }
        
        Ok(breakpoints)
    }

    /// Initialize correlation calculators
    async fn initialize_correlation_calculators() -> TradingResult<HashMap<String, Box<dyn CorrelationCalculator + Send + Sync>>> {
        let mut calculators = HashMap::new();
        
        calculators.insert(
            "pearson".to_string(),
            Box::new(PearsonCorrelationCalculator::new().await?) as Box<dyn CorrelationCalculator + Send + Sync>
        );
        
        calculators.insert(
            "spearman".to_string(),
            Box::new(SpearmanCorrelationCalculator::new().await?) as Box<dyn CorrelationCalculator + Send + Sync>
        );
        
        calculators.insert(
            "kendall".to_string(),
            Box::new(KendallCorrelationCalculator::new().await?) as Box<dyn CorrelationCalculator + Send + Sync>
        );

        Ok(calculators)
    }

    /// Get price data for assets
    async fn get_price_data(&self, assets: &[String], _time_range: TimeRange) -> TradingResult<HashMap<String, Vec<f64>>> {
        let mut price_data = HashMap::new();
        
        // Mock price data generation for demonstration
        for asset in assets {
            let mut prices = Vec::new();
            let mut price = 100.0;
            
            for i in 0..100 {
                price += (rand::random::<f64>() - 0.5) * 2.0; // Random walk
                if asset.contains("BTC") && i > 50 {
                    price += 0.5; // Add some correlation for BTC-related assets
                }
                prices.push(price);
            }
            
            price_data.insert(asset.clone(), prices);
        }
        
        Ok(price_data)
    }

    /// Identify significant correlations from matrix
    async fn identify_significant_correlations(&self, matrix: &CorrelationMatrix) -> TradingResult<Vec<CorrelationData>> {
        let mut significant_correlations = Vec::new();
        let significance_threshold = 0.05;
        let correlation_threshold = 0.3;
        
        for i in 0..matrix.assets.len() {
            for j in (i+1)..matrix.assets.len() {
                let correlation = matrix.correlation_values[i][j];
                let p_value = matrix.p_values[i][j];
                
                if p_value < significance_threshold && correlation.abs() > correlation_threshold {
                    significant_correlations.push(CorrelationData {
                        asset_a: matrix.assets[i].clone(),
                        asset_b: matrix.assets[j].clone(),
                        correlation_coefficient: correlation,
                        p_value,
                        confidence_interval: self.calculate_confidence_interval(correlation, 100).await?,
                        sample_size: 100, // Mock sample size
                        calculation_method: CorrelationMethod::Pearson,
                        time_period: matrix.time_period,
                        last_updated: Utc::now(),
                    });
                }
            }
        }
        
        // Sort by absolute correlation strength
        significant_correlations.sort_by(|a, b| {
            b.correlation_coefficient.abs().partial_cmp(&a.correlation_coefficient.abs())
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        
        Ok(significant_correlations)
    }

    /// Calculate confidence interval for correlation
    async fn calculate_confidence_interval(&self, correlation: f64, sample_size: usize) -> TradingResult<(f64, f64)> {
        // Fisher z-transformation for confidence interval calculation
        let z = 0.5 * ((1.0 + correlation) / (1.0 - correlation)).ln();
        let se = 1.0 / (sample_size as f64 - 3.0).sqrt();
        let z_critical = 1.96; // 95% confidence interval
        
        let z_lower = z - z_critical * se;
        let z_upper = z + z_critical * se;
        
        // Transform back to correlation scale
        let r_lower = (z_lower.exp() - 1.0) / (z_lower.exp() + 1.0);
        let r_upper = (z_upper.exp() - 1.0) / (z_upper.exp() + 1.0);
        
        Ok((r_lower, r_upper))
    }

    /// Calculate correlation volatility
    async fn calculate_correlation_volatility(&self, correlations: &[f64], index: usize, window: usize) -> TradingResult<f64> {
        if index < window {
            return Ok(0.0);
        }
        
        let start = index.saturating_sub(window);
        let end = index + 1;
        let slice = &correlations[start..end];
        
        let mean = slice.iter().sum::<f64>() / slice.len() as f64;
        let variance = slice.iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f64>() / slice.len() as f64;
        
        Ok(variance.sqrt())
    }

    /// Test breakpoint significance
    async fn test_breakpoint_significance(&self, pre_corr: f64, post_corr: f64, _sample_size: usize) -> TradingResult<f64> {
        // Simplified significance test - in practice would use Chow test or similar
        let change_magnitude = (post_corr - pre_corr).abs();
        Ok(1.0 - change_magnitude) // Mock p-value
    }

    /// Identify potential causes of correlation changes
    async fn identify_potential_causes(&self, _timestamp: DateTime<Utc>) -> TradingResult<Vec<String>> {
        // In practice, this would analyze news events, economic data releases, etc.
        Ok(vec![
            "Market volatility spike".to_string(),
            "Regulatory announcement".to_string(),
            "Economic data release".to_string(),
        ])
    }
}

// Mock implementations for various analyzers and calculators

pub struct CorrelationPatternDetector;
pub struct MarketRelationshipAnalyzer;
pub struct CrossAssetCorrelationAnalyzer;
pub struct TemporalCorrelationAnalyzer;
pub struct PredictiveCorrelationEngine;

impl CorrelationPatternDetector {
    pub async fn new() -> TradingResult<Self> {
        Ok(Self)
    }

    pub async fn detect_patterns(&self, _assets: &[String], _time_range: TimeRange) -> TradingResult<Vec<CorrelationPattern>> {
        Ok(vec![
            CorrelationPattern {
                pattern_type: PatternType::PositiveCorrelation,
                assets_involved: vec!["BTC".to_string(), "ETH".to_string()],
                pattern_strength: 0.75,
                duration: std::time::Duration::from_days(30),
                frequency: 0.8,
                confidence_score: 0.85,
                historical_occurrences: 15,
            }
        ])
    }
}

impl MarketRelationshipAnalyzer {
    pub async fn new() -> TradingResult<Self> {
        Ok(Self)
    }

    pub async fn analyze_relationships(&self, _assets: &[String], _time_range: TimeRange) -> TradingResult<Vec<MarketRelationship>> {
        Ok(vec![
            MarketRelationship {
                relationship_type: RelationshipType::Causal,
                primary_asset: "BTC".to_string(),
                secondary_asset: "ETH".to_string(),
                relationship_strength: 0.7,
                causal_direction: CausalDirection::AToB,
                time_lag: Some(std::time::Duration::from_hours(2)),
                relationship_stability: 0.8,
                market_conditions: vec![MarketCondition::BullMarket, MarketCondition::HighVolatility],
            }
        ])
    }
}

impl CrossAssetCorrelationAnalyzer {
    pub async fn new() -> TradingResult<Self> {
        Ok(Self)
    }

    pub async fn analyze_cross_assets(&self, _assets: &[String], _time_range: TimeRange) -> TradingResult<CrossAssetAnalysis> {
        let mut asset_class_correlations = HashMap::new();
        let mut crypto_correlations = HashMap::new();
        crypto_correlations.insert("BTC".to_string(), 0.75);
        crypto_correlations.insert("ETH".to_string(), 0.82);
        asset_class_correlations.insert("Cryptocurrency".to_string(), crypto_correlations);

        Ok(CrossAssetAnalysis {
            asset_class_correlations,
            sector_correlations: HashMap::new(),
            geographic_correlations: HashMap::new(),
            currency_correlations: HashMap::new(),
            factor_exposures: HashMap::new(),
        })
    }
}

impl TemporalCorrelationAnalyzer {
    pub async fn new() -> TradingResult<Self> {
        Ok(Self)
    }

    pub async fn analyze_temporal_correlations(&self, _assets: &[String], _time_range: TimeRange) -> TradingResult<TemporalCorrelationAnalysis> {
        Ok(TemporalCorrelationAnalysis {
            rolling_correlations: vec![],
            correlation_breakpoints: vec![],
            regime_changes: vec![],
            seasonal_patterns: vec![],
            intraday_patterns: vec![],
        })
    }
}

impl PredictiveCorrelationEngine {
    pub async fn new() -> TradingResult<Self> {
        Ok(Self)
    }

    pub async fn generate_insights(&self, _assets: &[String], _time_range: TimeRange) -> TradingResult<PredictiveCorrelationInsights> {
        Ok(PredictiveCorrelationInsights {
            correlation_forecasts: vec![],
            relationship_stability_forecast: vec![],
            regime_change_probability: vec![],
            correlation_extremes_forecast: vec![],
        })
    }
}

// Correlation calculator implementations

pub struct PearsonCorrelationCalculator;
pub struct SpearmanCorrelationCalculator;
pub struct KendallCorrelationCalculator;

impl PearsonCorrelationCalculator {
    pub async fn new() -> TradingResult<Self> {
        Ok(Self)
    }
}

impl CorrelationCalculator for PearsonCorrelationCalculator {
    async fn calculate_correlation(&self, data_a: &[f64], data_b: &[f64]) -> TradingResult<CorrelationData> {
        if data_a.len() != data_b.len() || data_a.is_empty() {
            return Err(TradingError::CalculationError("Invalid data for correlation calculation".to_string()));
        }

        let n = data_a.len() as f64;
        let mean_a = data_a.iter().sum::<f64>() / n;
        let mean_b = data_b.iter().sum::<f64>() / n;

        let numerator: f64 = data_a.iter().zip(data_b.iter())
            .map(|(a, b)| (a - mean_a) * (b - mean_b))
            .sum();

        let sum_sq_a: f64 = data_a.iter().map(|a| (a - mean_a).powi(2)).sum();
        let sum_sq_b: f64 = data_b.iter().map(|b| (b - mean_b).powi(2)).sum();

        let denominator = (sum_sq_a * sum_sq_b).sqrt();
        
        let correlation = if denominator != 0.0 {
            numerator / denominator
        } else {
            0.0
        };

        // Calculate t-statistic for significance testing
        let t_stat = correlation * ((n - 2.0) / (1.0 - correlation.powi(2))).sqrt();
        
        // Simplified p-value calculation (would use proper t-distribution in practice)
        let p_value = if t_stat.abs() > 2.0 { 0.01 } else { 0.1 };

        Ok(CorrelationData {
            asset_a: "Asset A".to_string(),
            asset_b: "Asset B".to_string(),
            correlation_coefficient: correlation,
            p_value,
            confidence_interval: (correlation - 0.1, correlation + 0.1),
            sample_size: data_a.len(),
            calculation_method: CorrelationMethod::Pearson,
            time_period: TimeRange::Days(30),
            last_updated: Utc::now(),
        })
    }

    async fn calculate_rolling_correlation(&self, data_a: &[f64], data_b: &[f64], window: usize) -> TradingResult<Vec<f64>> {
        if data_a.len() != data_b.len() || window > data_a.len() {
            return Err(TradingError::CalculationError("Invalid parameters for rolling correlation".to_string()));
        }

        let mut rolling_correlations = Vec::new();

        for i in window..=data_a.len() {
            let window_a = &data_a[i-window..i];
            let window_b = &data_b[i-window..i];
            
            let correlation_data = self.calculate_correlation(window_a, window_b).await?;
            rolling_correlations.push(correlation_data.correlation_coefficient);
        }

        Ok(rolling_correlations)
    }

    async fn test_significance(&self, correlation: f64, sample_size: usize) -> TradingResult<f64> {
        if sample_size < 3 {
            return Ok(1.0);
        }

        let t_stat = correlation * ((sample_size as f64 - 2.0) / (1.0 - correlation.powi(2))).sqrt();
        
        // Simplified p-value calculation
        let p_value = if t_stat.abs() > 2.576 { 0.01 }  // 99% confidence
                     else if t_stat.abs() > 1.96 { 0.05 }   // 95% confidence
                     else { 0.1 };

        Ok(p_value)
    }
}

impl SpearmanCorrelationCalculator {
    pub async fn new() -> TradingResult<Self> {
        Ok(Self)
    }
}

impl CorrelationCalculator for SpearmanCorrelationCalculator {
    async fn calculate_correlation(&self, data_a: &[f64], data_b: &[f64]) -> TradingResult<CorrelationData> {
        // Convert to ranks and calculate Pearson correlation on ranks
        let ranks_a = self.calculate_ranks(data_a).await?;
        let ranks_b = self.calculate_ranks(data_b).await?;
        
        // Use Pearson calculator on ranks
        let pearson_calc = PearsonCorrelationCalculator::new().await?;
        let mut result = pearson_calc.calculate_correlation(&ranks_a, &ranks_b).await?;
        result.calculation_method = CorrelationMethod::Spearman;
        
        Ok(result)
    }

    async fn calculate_rolling_correlation(&self, data_a: &[f64], data_b: &[f64], window: usize) -> TradingResult<Vec<f64>> {
        let mut rolling_correlations = Vec::new();

        for i in window..=data_a.len() {
            let window_a = &data_a[i-window..i];
            let window_b = &data_b[i-window..i];
            
            let correlation_data = self.calculate_correlation(window_a, window_b).await?;
            rolling_correlations.push(correlation_data.correlation_coefficient);
        }

        Ok(rolling_correlations)
    }

    async fn test_significance(&self, correlation: f64, sample_size: usize) -> TradingResult<f64> {
        // Similar to Pearson but adjusted for rank correlation
        if sample_size < 3 {
            return Ok(1.0);
        }

        let t_stat = correlation * ((sample_size as f64 - 2.0) / (1.0 - correlation.powi(2))).sqrt();
        let p_value = if t_stat.abs() > 2.0 { 0.01 } else { 0.1 };

        Ok(p_value)
    }
}

impl SpearmanCorrelationCalculator {
    async fn calculate_ranks(&self, data: &[f64]) -> TradingResult<Vec<f64>> {
        let mut indexed_data: Vec<(usize, f64)> = data.iter().enumerate().map(|(i, &x)| (i, x)).collect();
        indexed_data.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        
        let mut ranks = vec![0.0; data.len()];
        for (rank, &(original_index, _)) in indexed_data.iter().enumerate() {
            ranks[original_index] = (rank + 1) as f64;
        }
        
        Ok(ranks)
    }
}

impl KendallCorrelationCalculator {
    pub async fn new() -> TradingResult<Self> {
        Ok(Self)
    }
}

impl CorrelationCalculator for KendallCorrelationCalculator {
    async fn calculate_correlation(&self, data_a: &[f64], data_b: &[f64]) -> TradingResult<CorrelationData> {
        if data_a.len() != data_b.len() || data_a.is_empty() {
            return Err(TradingError::CalculationError("Invalid data for Kendall correlation".to_string()));
        }

        let n = data_a.len();
        let mut concordant_pairs = 0;
        let mut discordant_pairs = 0;

        for i in 0..n {
            for j in (i+1)..n {
                let sign_a = (data_a[j] - data_a[i]).signum();
                let sign_b = (data_b[j] - data_b[i]).signum();
                
                if sign_a * sign_b > 0.0 {
                    concordant_pairs += 1;
                } else if sign_a * sign_b < 0.0 {
                    discordant_pairs += 1;
                }
            }
        }

        let total_pairs = n * (n - 1) / 2;
        let tau = (concordant_pairs as f64 - discordant_pairs as f64) / total_pairs as f64;

        Ok(CorrelationData {
            asset_a: "Asset A".to_string(),
            asset_b: "Asset B".to_string(),
            correlation_coefficient: tau,
            p_value: 0.05, // Simplified
            confidence_interval: (tau - 0.1, tau + 0.1),
            sample_size: n,
            calculation_method: CorrelationMethod::Kendall,
            time_period: TimeRange::Days(30),
            last_updated: Utc::now(),
        })
    }

    async fn calculate_rolling_correlation(&self, data_a: &[f64], data_b: &[f64], window: usize) -> TradingResult<Vec<f64>> {
        let mut rolling_correlations = Vec::new();

        for i in window..=data_a.len() {
            let window_a = &data_a[i-window..i];
            let window_b = &data_b[i-window..i];
            
            let correlation_data = self.calculate_correlation(window_a, window_b).await?;
            rolling_correlations.push(correlation_data.correlation_coefficient);
        }

        Ok(rolling_correlations)
    }

    async fn test_significance(&self, _correlation: f64, sample_size: usize) -> TradingResult<f64> {
        // Simplified significance test for Kendall's tau
        if sample_size < 10 {
            return Ok(0.1);
        }
        
        Ok(0.05)
    }
}