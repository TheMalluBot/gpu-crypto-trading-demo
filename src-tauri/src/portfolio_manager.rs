use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use chrono::{DateTime, Utc, Duration};
use rust_decimal::Decimal;
use rust_decimal::prelude::{ToPrimitive, FromPrimitive};
use tokio::sync::RwLock;
use std::sync::Arc;

use crate::models::{OrderBookDepth, MarketDepthAnalysis};
use crate::binance_client::BinanceClient;
use crate::gpu_trading_engine::GpuTradingEngine;
use crate::logging::{LogLevel, LogCategory};
use crate::{log_info, log_warning, log_error};

/// Token information for portfolio
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CryptoToken {
    pub symbol: String,
    pub name: String,
    pub price: f64,
    pub change_24h: f64,
    pub volume_24h: f64,
    pub market_cap: f64,
    pub selected: bool,
    pub allocation: f64, // Percentage of portfolio
    pub profitability: f64, // AI-calculated profitability score (0-100)
    pub risk: f64, // Risk score (0-100)
    pub momentum: f64, // Momentum indicator (0-100)
    pub volatility: f64,
    pub correlation: f64, // Correlation with portfolio
    pub technical_score: f64, // Technical analysis score
    pub fundamental_score: f64, // Fundamental analysis score
    pub sentiment_score: f64, // Market sentiment score
    pub position_size: Option<f64>, // Actual position size in base currency
    pub entry_price: Option<f64>,
    pub current_pnl: Option<f64>,
}

/// Portfolio configuration with Indian tax and Binance fees
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortfolioConfig {
    // Investment Settings
    pub total_investment: f64,
    pub currency: String, // "INR", "USD", "USDT"
    pub rebalance_frequency: RebalanceFrequency,
    pub risk_tolerance: RiskTolerance,
    
    // Profit Maintenance
    pub target_profit: f64, // Target profit percentage
    pub stop_loss: f64, // Stop loss percentage
    pub trailing_stop: bool,
    pub trailing_stop_percent: f64,
    pub profit_lock_threshold: f64, // Lock profits after this %
    
    // Indian Tax Configuration
    pub enable_tds: bool,
    pub tds_rate: f64, // Default 1% for crypto in India
    pub consider_stcg: bool, // Short Term Capital Gains
    pub stcg_rate: f64, // 30% for crypto in India
    pub consider_ltcg: bool, // Long Term Capital Gains
    pub ltcg_rate: f64, // 30% for crypto (no LTCG benefit)
    pub cess_rate: f64, // 4% cess on tax
    
    // Binance Fee Structure
    pub trading_fee_rate: f64, // Default 0.1%
    pub use_bnb_discount: bool, // 25% discount if using BNB
    pub vip_level: u8, // VIP level 0-9
    pub maker_fee: f64,
    pub taker_fee: f64,
    
    // Auto-Trading Settings
    pub auto_rebalance: bool,
    pub auto_compound: bool,
    pub max_positions: usize,
    pub min_position_size: f64, // Minimum position size as % of portfolio
    pub max_position_size: f64, // Maximum position size as % of portfolio
    
    // Risk Management
    pub max_drawdown: f64,
    pub daily_loss_limit: f64,
    pub correlation_limit: f64,
    pub diversification_ratio: f64,
    
    // Smart Features
    pub use_ai_allocation: bool,
    pub use_sentiment_analysis: bool,
    pub use_technical_analysis: bool,
    pub profit_taking_enabled: bool,
    pub loss_recovery_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RebalanceFrequency {
    Daily,
    Weekly,
    Monthly,
    Auto, // Based on market conditions
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskTolerance {
    Conservative,
    Moderate,
    Aggressive,
}

/// Portfolio statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortfolioStats {
    pub total_value: f64,
    pub total_pnl: f64,
    pub total_pnl_percent: f64,
    pub realized_pnl: f64,
    pub unrealized_pnl: f64,
    pub total_fees: f64,
    pub total_tax: f64,
    pub net_profit: f64,
    pub sharpe_ratio: f64,
    pub sortino_ratio: f64,
    pub max_drawdown: f64,
    pub current_drawdown: f64,
    pub win_rate: f64,
    pub profit_factor: f64,
    pub best_performer: String,
    pub worst_performer: String,
    pub portfolio_health: f64, // 0-100 score
    pub days_active: u32,
    pub total_trades: u32,
    pub winning_trades: u32,
    pub losing_trades: u32,
}

/// Tax calculation for Indian regulations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculation {
    pub gross_profit: f64,
    pub tds_amount: f64,
    pub stcg_amount: f64,
    pub ltcg_amount: f64,
    pub cess_amount: f64,
    pub total_tax: f64,
    pub net_profit: f64,
    pub effective_tax_rate: f64,
    pub tax_saved_with_losses: f64, // Tax harvesting
}

/// Token analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenAnalysis {
    pub symbol: String,
    pub profitability_score: f64,
    pub risk_score: f64,
    pub allocation_recommendation: f64,
    pub entry_signals: Vec<String>,
    pub exit_signals: Vec<String>,
    pub market_conditions: MarketCondition,
    pub ai_confidence: f64,
    pub expected_return: f64,
    pub time_horizon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketCondition {
    pub trend: String, // "bullish", "bearish", "neutral"
    pub volatility: String, // "low", "medium", "high"
    pub volume: String, // "low", "average", "high"
    pub sentiment: f64, // -100 to 100
}

/// Profit maintenance strategy
#[derive(Debug, Clone)]
pub struct ProfitMaintenanceEngine {
    pub profit_targets: Vec<ProfitTarget>,
    pub loss_recovery_strategy: LossRecoveryStrategy,
    pub profit_lock_levels: Vec<f64>,
    pub rebalance_triggers: Vec<RebalanceTrigger>,
}

#[derive(Debug, Clone)]
pub struct ProfitTarget {
    pub level: f64, // Profit percentage
    pub action: ProfitAction,
    pub allocation_adjustment: f64,
}

#[derive(Debug, Clone)]
pub enum ProfitAction {
    TakePartialProfit(f64), // Take x% of position
    MoveStopLoss(f64), // Move stop loss to x%
    Rebalance,
    AddToWinners,
    ReduceLosers,
}

#[derive(Debug, Clone)]
pub struct LossRecoveryStrategy {
    pub max_recovery_attempts: u32,
    pub recovery_allocation: f64, // % of portfolio for recovery trades
    pub use_martingale: bool,
    pub use_dollar_cost_averaging: bool,
    pub use_mean_reversion: bool,
}

#[derive(Debug, Clone)]
pub enum RebalanceTrigger {
    TimeBasedl(Duration),
    ThresholdBased(f64), // Rebalance when allocation drifts by x%
    VolatilityBased(f64), // Rebalance when volatility exceeds x
    PerformanceBased(f64), // Rebalance when performance differs by x%
}

/// Main Portfolio Manager
pub struct MultiTokenPortfolioManager {
    config: Arc<RwLock<PortfolioConfig>>,
    tokens: Arc<RwLock<Vec<CryptoToken>>>,
    stats: Arc<RwLock<PortfolioStats>>,
    binance_client: Arc<BinanceClient>,
    gpu_engine: Arc<GpuTradingEngine>,
    profit_engine: Arc<ProfitMaintenanceEngine>,
    active_positions: Arc<RwLock<HashMap<String, Position>>>,
    trade_history: Arc<RwLock<Vec<Trade>>>,
    is_trading: Arc<RwLock<bool>>,
}

#[derive(Debug, Clone)]
struct Position {
    symbol: String,
    size: f64,
    entry_price: f64,
    current_price: f64,
    pnl: f64,
    pnl_percent: f64,
    stop_loss: Option<f64>,
    take_profit: Option<f64>,
    trailing_stop_distance: Option<f64>,
    highest_price: f64, // For trailing stop
    entry_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Trade {
    id: String,
    symbol: String,
    side: String, // "buy" or "sell"
    price: f64,
    quantity: f64,
    value: f64,
    fee: f64,
    tax: f64,
    net_value: f64,
    timestamp: DateTime<Utc>,
    profit_loss: Option<f64>,
    trade_type: String, // "entry", "exit", "rebalance", "profit_taking"
}

impl MultiTokenPortfolioManager {
    pub fn new(
        config: PortfolioConfig,
        binance_client: Arc<BinanceClient>,
        gpu_engine: Arc<GpuTradingEngine>,
    ) -> Self {
        let profit_engine = Arc::new(ProfitMaintenanceEngine {
            profit_targets: vec![
                ProfitTarget {
                    level: 5.0,
                    action: ProfitAction::MoveStopLoss(2.0),
                    allocation_adjustment: 0.0,
                },
                ProfitTarget {
                    level: 10.0,
                    action: ProfitAction::TakePartialProfit(25.0),
                    allocation_adjustment: -5.0,
                },
                ProfitTarget {
                    level: 20.0,
                    action: ProfitAction::TakePartialProfit(50.0),
                    allocation_adjustment: -10.0,
                },
            ],
            loss_recovery_strategy: LossRecoveryStrategy {
                max_recovery_attempts: 3,
                recovery_allocation: 20.0,
                use_martingale: false, // Dangerous, disabled by default
                use_dollar_cost_averaging: true,
                use_mean_reversion: true,
            },
            profit_lock_levels: vec![5.0, 10.0, 15.0, 20.0],
            rebalance_triggers: vec![
                RebalanceTrigger::ThresholdBased(5.0),
                RebalanceTrigger::VolatilityBased(30.0),
            ],
        });

        Self {
            config: Arc::new(RwLock::new(config)),
            tokens: Arc::new(RwLock::new(Vec::new())),
            stats: Arc::new(RwLock::new(PortfolioStats {
                total_value: 0.0,
                total_pnl: 0.0,
                total_pnl_percent: 0.0,
                realized_pnl: 0.0,
                unrealized_pnl: 0.0,
                total_fees: 0.0,
                total_tax: 0.0,
                net_profit: 0.0,
                sharpe_ratio: 0.0,
                sortino_ratio: 0.0,
                max_drawdown: 0.0,
                current_drawdown: 0.0,
                win_rate: 0.0,
                profit_factor: 0.0,
                best_performer: String::new(),
                worst_performer: String::new(),
                portfolio_health: 100.0,
                days_active: 0,
                total_trades: 0,
                winning_trades: 0,
                losing_trades: 0,
            })),
            binance_client,
            gpu_engine,
            profit_engine,
            active_positions: Arc::new(RwLock::new(HashMap::new())),
            trade_history: Arc::new(RwLock::new(Vec::new())),
            is_trading: Arc::new(RwLock::new(false)),
        }
    }

    /// Analyze tokens for profitability using AI and technical analysis
    pub async fn analyze_token_profitability(&self, tokens: Vec<CryptoToken>) -> Result<Vec<TokenAnalysis>, String> {
        let mut analyses = Vec::new();
        
        for token in tokens {
            // Get market data
            let market_data = self.binance_client
                .get_ticker(&format!("{}USDT", token.symbol))
                .await
                .map_err(|e| format!("Failed to get market data: {}", e))?;
            
            // Use GPU for technical analysis
            let technical_analysis = self.gpu_engine
                .analyze_market_data(&token.symbol)
                .await?;
            
            // Calculate profitability score using multiple factors
            let profitability_score = self.calculate_profitability_score(&token, &technical_analysis);
            
            // Calculate risk score
            let risk_score = self.calculate_risk_score(&token, &technical_analysis);
            
            // Determine optimal allocation
            let allocation = self.calculate_optimal_allocation(
                profitability_score,
                risk_score,
                &token
            );
            
            // Generate trading signals
            let entry_signals = self.generate_entry_signals(&token, &technical_analysis);
            let exit_signals = self.generate_exit_signals(&token, &technical_analysis);
            
            analyses.push(TokenAnalysis {
                symbol: token.symbol.clone(),
                profitability_score,
                risk_score,
                allocation_recommendation: allocation,
                entry_signals,
                exit_signals,
                market_conditions: self.assess_market_conditions(&token),
                ai_confidence: self.calculate_ai_confidence(&technical_analysis),
                expected_return: self.calculate_expected_return(profitability_score, risk_score),
                time_horizon: self.determine_time_horizon(&token),
            });
        }
        
        Ok(analyses)
    }

    /// Calculate Indian tax on crypto gains
    pub fn calculate_indian_tax(&self, profit: f64, holding_period_days: u32) -> TaxCalculation {
        let config = self.config.blocking_read();
        
        let mut tds_amount = 0.0;
        let mut stcg_amount = 0.0;
        let mut ltcg_amount = 0.0;
        let mut cess_amount = 0.0;
        
        // TDS (Tax Deducted at Source) - 1% on transactions
        if config.enable_tds {
            tds_amount = profit * (config.tds_rate / 100.0);
        }
        
        // In India, crypto gains are always taxed at 30% regardless of holding period
        // No distinction between STCG and LTCG for crypto
        if profit > 0.0 {
            if config.consider_stcg {
                stcg_amount = profit * (config.stcg_rate / 100.0);
            }
            
            // Add 4% cess on tax amount
            let base_tax = stcg_amount + ltcg_amount;
            cess_amount = base_tax * (config.cess_rate / 100.0);
        }
        
        let total_tax = tds_amount + stcg_amount + ltcg_amount + cess_amount;
        let net_profit = profit - total_tax;
        let effective_tax_rate = if profit > 0.0 {
            (total_tax / profit) * 100.0
        } else {
            0.0
        };
        
        // Calculate tax saved with loss harvesting
        let tax_saved_with_losses = if profit < 0.0 {
            // Losses can't be carried forward for crypto in India
            // But can be set off against gains in the same year
            profit.abs() * 0.3 // 30% of losses can reduce tax
        } else {
            0.0
        };
        
        TaxCalculation {
            gross_profit: profit,
            tds_amount,
            stcg_amount,
            ltcg_amount,
            cess_amount,
            total_tax,
            net_profit,
            effective_tax_rate,
            tax_saved_with_losses,
        }
    }

    /// Calculate Binance trading fees
    pub fn calculate_binance_fees(&self, trade_amount: f64, is_maker: bool) -> f64 {
        let config = self.config.blocking_read();
        
        let mut fee_rate = if is_maker {
            config.maker_fee
        } else {
            config.taker_fee
        };
        
        // Apply BNB discount (25% off)
        if config.use_bnb_discount {
            fee_rate *= 0.75;
        }
        
        // Apply VIP level discounts
        let vip_discounts = [0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45];
        if config.vip_level > 0 && config.vip_level <= 9 {
            fee_rate *= 1.0 - vip_discounts[config.vip_level as usize];
        }
        
        (trade_amount * fee_rate) / 100.0
    }

    /// Smart profit maintenance algorithm
    pub async fn maintain_profit(&self) -> Result<(), String> {
        let positions = self.active_positions.read().await;
        let mut actions = Vec::new();
        
        for (symbol, position) in positions.iter() {
            let pnl_percent = position.pnl_percent;
            
            // Check profit targets
            for target in &self.profit_engine.profit_targets {
                if pnl_percent >= target.level {
                    match &target.action {
                        ProfitAction::TakePartialProfit(percent) => {
                            actions.push((symbol.clone(), "partial_profit", *percent));
                        },
                        ProfitAction::MoveStopLoss(new_stop) => {
                            actions.push((symbol.clone(), "move_stop", *new_stop));
                        },
                        ProfitAction::Rebalance => {
                            actions.push((symbol.clone(), "rebalance", 0.0));
                        },
                        _ => {}
                    }
                }
            }
            
            // Check for losses and apply recovery strategy
            if pnl_percent < -5.0 && self.profit_engine.loss_recovery_strategy.use_dollar_cost_averaging {
                actions.push((symbol.clone(), "dca", 0.0));
            }
            
            // Trailing stop logic
            let config = self.config.read().await;
            if config.trailing_stop && position.current_price > position.highest_price {
                // Update highest price and adjust stop loss
                actions.push((symbol.clone(), "trailing_stop", config.trailing_stop_percent));
            }
        }
        
        // Execute actions
        for (symbol, action, value) in actions {
            self.execute_profit_action(&symbol, &action, value).await?;
        }
        
        Ok(())
    }

    /// Auto-rebalance portfolio based on conditions
    pub async fn auto_rebalance(&self) -> Result<(), String> {
        let config = self.config.read().await;
        if !config.auto_rebalance {
            return Ok(());
        }
        
        let tokens = self.tokens.read().await;
        let selected_tokens: Vec<_> = tokens.iter()
            .filter(|t| t.selected)
            .collect();
        
        if selected_tokens.is_empty() {
            return Ok(());
        }
        
        // Calculate current allocations
        let total_value: f64 = selected_tokens.iter()
            .map(|t| t.position_size.unwrap_or(0.0))
            .sum();
        
        let mut rebalance_needed = false;
        let mut rebalance_orders = Vec::new();
        
        for token in &selected_tokens {
            let current_allocation = if total_value > 0.0 {
                (token.position_size.unwrap_or(0.0) / total_value) * 100.0
            } else {
                0.0
            };
            
            let target_allocation = token.allocation;
            let drift = (current_allocation - target_allocation).abs();
            
            // Check if rebalance is needed based on triggers
            for trigger in &self.profit_engine.rebalance_triggers {
                match trigger {
                    RebalanceTrigger::ThresholdBased(threshold) => {
                        if drift > *threshold {
                            rebalance_needed = true;
                        }
                    },
                    RebalanceTrigger::VolatilityBased(vol_threshold) => {
                        if token.volatility > *vol_threshold {
                            rebalance_needed = true;
                        }
                    },
                    _ => {}
                }
            }
            
            if rebalance_needed {
                let target_value = (target_allocation / 100.0) * total_value;
                let current_value = token.position_size.unwrap_or(0.0);
                let difference = target_value - current_value;
                
                if difference.abs() > 10.0 { // Minimum rebalance amount
                    rebalance_orders.push((token.symbol.clone(), difference));
                }
            }
        }
        
        // Execute rebalance orders
        for (symbol, amount) in rebalance_orders {
            if amount > 0.0 {
                self.buy_token(&symbol, amount).await?;
            } else {
                self.sell_token(&symbol, amount.abs()).await?;
            }
        }
        
        Ok(())
    }

    /// Start automated trading
    pub async fn start_trading(&self, selected_tokens: Vec<CryptoToken>) -> Result<(), String> {
        let mut is_trading = self.is_trading.write().await;
        if *is_trading {
            return Err("Trading is already active".to_string());
        }
        
        *is_trading = true;
        
        // Initialize positions for selected tokens
        let config = self.config.read().await;
        let investment_per_token = config.total_investment / selected_tokens.len() as f64;
        
        for token in selected_tokens {
            // Calculate position size based on allocation
            let position_size = (token.allocation / 100.0) * config.total_investment;
            
            // Place initial orders
            self.buy_token(&token.symbol, position_size).await?;
        }
        
        // Start monitoring loop
        self.start_monitoring_loop().await;
        
        Ok(())
    }

    // Private helper methods
    
    fn calculate_profitability_score(&self, token: &CryptoToken, analysis: &str) -> f64 {
        // Combine multiple factors for profitability
        let technical_weight = 0.3;
        let fundamental_weight = 0.2;
        let sentiment_weight = 0.2;
        let momentum_weight = 0.3;
        
        token.technical_score * technical_weight +
        token.fundamental_score * fundamental_weight +
        token.sentiment_score * sentiment_weight +
        token.momentum * momentum_weight
    }
    
    fn calculate_risk_score(&self, token: &CryptoToken, analysis: &str) -> f64 {
        // Risk calculation based on volatility, correlation, and market conditions
        let volatility_weight = 0.4;
        let correlation_weight = 0.3;
        let market_cap_weight = 0.3;
        
        let market_cap_risk = if token.market_cap < 1_000_000_000.0 {
            80.0 // High risk for small caps
        } else if token.market_cap < 10_000_000_000.0 {
            50.0 // Medium risk
        } else {
            20.0 // Lower risk for large caps
        };
        
        token.volatility * volatility_weight +
        (token.correlation * 100.0) * correlation_weight +
        market_cap_risk * market_cap_weight
    }
    
    fn calculate_optimal_allocation(&self, profitability: f64, risk: f64, token: &CryptoToken) -> f64 {
        // Kelly Criterion inspired allocation
        let edge = profitability / 100.0;
        let odds = 2.0; // Assume 2:1 reward/risk ratio
        let kelly_percentage = (edge * odds - (1.0 - edge)) / odds;
        
        // Apply constraints
        let config = self.config.blocking_read();
        let allocation = kelly_percentage * 100.0;
        
        allocation.max(config.min_position_size)
                  .min(config.max_position_size)
    }
    
    fn generate_entry_signals(&self, token: &CryptoToken, analysis: &str) -> Vec<String> {
        let mut signals = Vec::new();
        
        if token.momentum > 70.0 {
            signals.push("Strong upward momentum detected".to_string());
        }
        
        if token.technical_score > 75.0 {
            signals.push("Technical indicators bullish".to_string());
        }
        
        if token.sentiment_score > 60.0 {
            signals.push("Positive market sentiment".to_string());
        }
        
        if token.change_24h > 5.0 && token.volume_24h > 1_000_000.0 {
            signals.push("Volume breakout detected".to_string());
        }
        
        signals
    }
    
    fn generate_exit_signals(&self, token: &CryptoToken, analysis: &str) -> Vec<String> {
        let mut signals = Vec::new();
        
        if token.momentum < 30.0 {
            signals.push("Momentum weakening".to_string());
        }
        
        if token.volatility > 50.0 {
            signals.push("High volatility - consider reducing position".to_string());
        }
        
        if token.technical_score < 25.0 {
            signals.push("Technical indicators bearish".to_string());
        }
        
        signals
    }
    
    fn assess_market_conditions(&self, token: &CryptoToken) -> MarketCondition {
        let trend = if token.change_24h > 3.0 {
            "bullish"
        } else if token.change_24h < -3.0 {
            "bearish"
        } else {
            "neutral"
        };
        
        let volatility = if token.volatility > 40.0 {
            "high"
        } else if token.volatility > 20.0 {
            "medium"
        } else {
            "low"
        };
        
        let volume = if token.volume_24h > 10_000_000_000.0 {
            "high"
        } else if token.volume_24h > 1_000_000_000.0 {
            "average"
        } else {
            "low"
        };
        
        MarketCondition {
            trend: trend.to_string(),
            volatility: volatility.to_string(),
            volume: volume.to_string(),
            sentiment: token.sentiment_score - 50.0, // Normalize to -50 to +50
        }
    }
    
    fn calculate_ai_confidence(&self, analysis: &str) -> f64 {
        // Placeholder for AI confidence calculation
        // In production, this would use actual ML model confidence scores
        75.0
    }
    
    fn calculate_expected_return(&self, profitability: f64, risk: f64) -> f64 {
        // Expected return based on profitability and risk
        let risk_adjusted_return = profitability * (1.0 - risk / 100.0);
        risk_adjusted_return * 0.5 // Conservative estimate
    }
    
    fn determine_time_horizon(&self, token: &CryptoToken) -> String {
        if token.volatility > 40.0 {
            "Short-term (1-7 days)"
        } else if token.momentum > 60.0 {
            "Medium-term (1-4 weeks)"
        } else {
            "Long-term (1-3 months)"
        }.to_string()
    }
    
    async fn execute_profit_action(&self, symbol: &str, action: &str, value: f64) -> Result<(), String> {
        match action {
            "partial_profit" => {
                // Sell a portion of the position
                let positions = self.active_positions.read().await;
                if let Some(position) = positions.get(symbol) {
                    let sell_amount = position.size * (value / 100.0);
                    drop(positions);
                    self.sell_token(symbol, sell_amount).await?;
                }
            },
            "move_stop" => {
                // Update stop loss
                let mut positions = self.active_positions.write().await;
                if let Some(position) = positions.get_mut(symbol) {
                    position.stop_loss = Some(position.entry_price * (1.0 + value / 100.0));
                }
            },
            "trailing_stop" => {
                // Update trailing stop
                let mut positions = self.active_positions.write().await;
                if let Some(position) = positions.get_mut(symbol) {
                    let stop_price = position.current_price * (1.0 - value / 100.0);
                    position.stop_loss = Some(stop_price.max(position.stop_loss.unwrap_or(0.0)));
                    position.highest_price = position.current_price.max(position.highest_price);
                }
            },
            "dca" => {
                // Dollar cost averaging - buy more at lower price
                let config = self.config.read().await;
                let dca_amount = config.total_investment * 0.05; // 5% for DCA
                self.buy_token(symbol, dca_amount).await?;
            },
            _ => {}
        }
        
        Ok(())
    }
    
    async fn buy_token(&self, symbol: &str, amount: f64) -> Result<(), String> {
        // Calculate fees and tax
        let fee = self.calculate_binance_fees(amount, false); // Assume taker order
        let total_cost = amount + fee;
        
        // Place order via Binance
        log_info!(LogCategory::Trading, 
            "Buying {} worth ${:.2} (including ${:.2} fees)", 
            symbol, amount, fee
        );
        
        // Update position
        let mut positions = self.active_positions.write().await;
        let current_price = self.get_current_price(symbol).await?;
        let quantity = amount / current_price;
        
        positions.insert(symbol.to_string(), Position {
            symbol: symbol.to_string(),
            size: quantity,
            entry_price: current_price,
            current_price,
            pnl: 0.0,
            pnl_percent: 0.0,
            stop_loss: Some(current_price * 0.95), // 5% stop loss by default
            take_profit: Some(current_price * 1.20), // 20% take profit
            trailing_stop_distance: Some(5.0),
            highest_price: current_price,
            entry_time: Utc::now(),
        });
        
        // Record trade
        let mut history = self.trade_history.write().await;
        history.push(Trade {
            id: format!("trade_{}", Utc::now().timestamp()),
            symbol: symbol.to_string(),
            side: "buy".to_string(),
            price: current_price,
            quantity,
            value: amount,
            fee,
            tax: 0.0, // Tax on sale only
            net_value: total_cost,
            timestamp: Utc::now(),
            profit_loss: None,
            trade_type: "entry".to_string(),
        });
        
        Ok(())
    }
    
    async fn sell_token(&self, symbol: &str, amount: f64) -> Result<(), String> {
        let positions = self.active_positions.read().await;
        if let Some(position) = positions.get(symbol) {
            let current_price = self.get_current_price(symbol).await?;
            let sell_value = amount * current_price;
            
            // Calculate profit/loss
            let cost_basis = amount * position.entry_price;
            let profit = sell_value - cost_basis;
            
            // Calculate fees and tax
            let fee = self.calculate_binance_fees(sell_value, false);
            let tax_calc = self.calculate_indian_tax(profit, 30); // Assume 30 days
            
            let net_proceeds = sell_value - fee - tax_calc.total_tax;
            
            log_info!(LogCategory::Trading,
                "Selling {} worth ${:.2} (profit: ${:.2}, tax: ${:.2}, fees: ${:.2})",
                symbol, sell_value, profit, tax_calc.total_tax, fee
            );
            
            // Record trade
            let mut history = self.trade_history.write().await;
            history.push(Trade {
                id: format!("trade_{}", Utc::now().timestamp()),
                symbol: symbol.to_string(),
                side: "sell".to_string(),
                price: current_price,
                quantity: amount,
                value: sell_value,
                fee,
                tax: tax_calc.total_tax,
                net_value: net_proceeds,
                timestamp: Utc::now(),
                profit_loss: Some(profit),
                trade_type: "exit".to_string(),
            });
        }
        
        Ok(())
    }
    
    async fn get_current_price(&self, symbol: &str) -> Result<f64, String> {
        // Get current price from Binance
        self.binance_client
            .get_ticker(&format!("{}USDT", symbol))
            .await
            .map(|ticker| ticker.last_price)
            .map_err(|e| format!("Failed to get price: {}", e))
    }
    
    async fn start_monitoring_loop(&self) {
        let manager = Arc::new(self);
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                // Check if still trading
                if !*manager.is_trading.read().await {
                    break;
                }
                
                // Update positions
                if let Err(e) = manager.update_positions().await {
                    log_error!(LogCategory::Trading, "Failed to update positions: {}", e);
                }
                
                // Maintain profit
                if let Err(e) = manager.maintain_profit().await {
                    log_error!(LogCategory::Trading, "Failed to maintain profit: {}", e);
                }
                
                // Auto-rebalance if needed
                if let Err(e) = manager.auto_rebalance().await {
                    log_error!(LogCategory::Trading, "Failed to auto-rebalance: {}", e);
                }
                
                // Update statistics
                if let Err(e) = manager.update_statistics().await {
                    log_error!(LogCategory::Trading, "Failed to update statistics: {}", e);
                }
            }
        });
    }
    
    async fn update_positions(&self) -> Result<(), String> {
        let mut positions = self.active_positions.write().await;
        
        for position in positions.values_mut() {
            let current_price = self.get_current_price(&position.symbol).await?;
            position.current_price = current_price;
            position.pnl = (current_price - position.entry_price) * position.size;
            position.pnl_percent = ((current_price - position.entry_price) / position.entry_price) * 100.0;
            
            // Check stop loss
            if let Some(stop_loss) = position.stop_loss {
                if current_price <= stop_loss {
                    log_warning!(LogCategory::Trading, 
                        "Stop loss triggered for {} at ${:.2}", 
                        position.symbol, current_price
                    );
                    // Execute stop loss order
                    // TODO: Implement stop loss execution
                }
            }
            
            // Check take profit
            if let Some(take_profit) = position.take_profit {
                if current_price >= take_profit {
                    log_info!(LogCategory::Trading,
                        "Take profit triggered for {} at ${:.2}",
                        position.symbol, current_price
                    );
                    // Execute take profit order
                    // TODO: Implement take profit execution
                }
            }
        }
        
        Ok(())
    }
    
    async fn update_statistics(&self) -> Result<(), String> {
        let positions = self.active_positions.read().await;
        let trades = self.trade_history.read().await;
        let mut stats = self.stats.write().await;
        
        // Calculate total value and P&L
        let mut total_value = 0.0;
        let mut unrealized_pnl = 0.0;
        
        for position in positions.values() {
            total_value += position.current_price * position.size;
            unrealized_pnl += position.pnl;
        }
        
        // Calculate realized P&L from trade history
        let mut realized_pnl = 0.0;
        let mut total_fees = 0.0;
        let mut total_tax = 0.0;
        let mut winning_trades = 0;
        let mut losing_trades = 0;
        
        for trade in trades.iter() {
            if let Some(pnl) = trade.profit_loss {
                realized_pnl += pnl;
                if pnl > 0.0 {
                    winning_trades += 1;
                } else {
                    losing_trades += 1;
                }
            }
            total_fees += trade.fee;
            total_tax += trade.tax;
        }
        
        stats.total_value = total_value;
        stats.unrealized_pnl = unrealized_pnl;
        stats.realized_pnl = realized_pnl;
        stats.total_pnl = realized_pnl + unrealized_pnl;
        stats.total_fees = total_fees;
        stats.total_tax = total_tax;
        stats.net_profit = stats.total_pnl - total_fees - total_tax;
        
        let config = self.config.read().await;
        stats.total_pnl_percent = (stats.total_pnl / config.total_investment) * 100.0;
        
        stats.total_trades = trades.len() as u32;
        stats.winning_trades = winning_trades;
        stats.losing_trades = losing_trades;
        
        if stats.total_trades > 0 {
            stats.win_rate = (winning_trades as f64 / stats.total_trades as f64) * 100.0;
        }
        
        // Calculate portfolio health
        stats.portfolio_health = self.calculate_portfolio_health(&stats, &positions);
        
        Ok(())
    }
    
    fn calculate_portfolio_health(&self, stats: &PortfolioStats, positions: &HashMap<String, Position>) -> f64 {
        let mut health_score = 100.0;
        
        // Deduct for losses
        if stats.total_pnl_percent < 0.0 {
            health_score -= stats.total_pnl_percent.abs().min(50.0);
        }
        
        // Deduct for high drawdown
        if stats.current_drawdown > 10.0 {
            health_score -= (stats.current_drawdown - 10.0).min(30.0);
        }
        
        // Deduct for low win rate
        if stats.win_rate < 40.0 {
            health_score -= (40.0 - stats.win_rate).min(20.0);
        }
        
        // Add for diversification
        let position_count = positions.len();
        if position_count >= 5 {
            health_score += 10.0;
        }
        
        health_score.max(0.0).min(100.0)
    }
}

// Tauri command handlers
#[tauri::command]
pub async fn analyze_token_profitability(
    tokens: Vec<CryptoToken>,
    config: PortfolioConfig,
) -> Result<Vec<TokenAnalysis>, String> {
    // This would be connected to the actual portfolio manager instance
    // For now, return mock data
    Ok(vec![])
}

#[tauri::command]
pub async fn start_portfolio_trading(
    tokens: Vec<CryptoToken>,
    config: PortfolioConfig,
) -> Result<(), String> {
    // Start the portfolio trading
    Ok(())
}

#[tauri::command]
pub async fn stop_portfolio_trading() -> Result<(), String> {
    // Stop the portfolio trading
    Ok(())
}

#[tauri::command]
pub async fn get_portfolio_stats() -> Result<PortfolioStats, String> {
    // Get current portfolio statistics
    Ok(PortfolioStats {
        total_value: 0.0,
        total_pnl: 0.0,
        total_pnl_percent: 0.0,
        realized_pnl: 0.0,
        unrealized_pnl: 0.0,
        total_fees: 0.0,
        total_tax: 0.0,
        net_profit: 0.0,
        sharpe_ratio: 0.0,
        sortino_ratio: 0.0,
        max_drawdown: 0.0,
        current_drawdown: 0.0,
        win_rate: 0.0,
        profit_factor: 0.0,
        best_performer: String::new(),
        worst_performer: String::new(),
        portfolio_health: 100.0,
        days_active: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
    })
}