use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use rust_decimal::Decimal;
use rust_decimal::prelude::*;
use chrono::{DateTime, Utc, Duration};
use crate::models::{Trade, AccountInfo, PriceData, OrderRequest, TradeSide};
use crate::config::TradingConfig;
use crate::errors::{TradingError, TradingResult, TradingLogicErrorType};

/// Risk assessment levels
#[derive(Debug, Clone, PartialEq)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// Risk management rules and limits
#[derive(Debug, Clone)]
pub struct RiskLimits {
    pub max_position_size_percent: f64,
    pub max_daily_loss_percent: f64,
    pub max_drawdown_percent: f64,
    pub max_consecutive_losses: u32,
    pub min_risk_reward_ratio: f64,
    pub max_correlation_exposure: f64,
    pub volatility_threshold: f64,
}

impl Default for RiskLimits {
    fn default() -> Self {
        Self {
            max_position_size_percent: 5.0,
            max_daily_loss_percent: 2.0,
            max_drawdown_percent: 10.0,
            max_consecutive_losses: 3,
            min_risk_reward_ratio: 1.5,
            max_correlation_exposure: 20.0,
            volatility_threshold: 0.05,
        }
    }
}

/// Trading session statistics
#[derive(Debug, Clone, Default)]
pub struct TradingSession {
    pub start_time: Option<DateTime<Utc>>,
    pub total_trades: u32,
    pub winning_trades: u32,
    pub losing_trades: u32,
    pub consecutive_losses: u32,
    pub daily_pnl: Decimal,
    pub max_drawdown: Decimal,
    pub current_drawdown: Decimal,
    pub peak_balance: Decimal,
}

impl TradingSession {
    pub fn win_rate(&self) -> f64 {
        if self.total_trades == 0 {
            0.0
        } else {
            self.winning_trades as f64 / self.total_trades as f64
        }
    }

    pub fn profit_factor(&self) -> f64 {
        // This would need to track total profits vs total losses
        // Simplified implementation
        if self.losing_trades == 0 {
            if self.winning_trades > 0 { f64::INFINITY } else { 0.0 }
        } else {
            self.winning_trades as f64 / self.losing_trades as f64
        }
    }
}

/// Position tracking for risk management
#[derive(Debug, Clone)]
pub struct Position {
    pub symbol: String,
    pub side: TradeSide,
    pub size: Decimal,
    pub entry_price: Decimal,
    pub current_price: Decimal,
    pub unrealized_pnl: Decimal,
    pub stop_loss: Option<Decimal>,
    pub take_profit: Option<Decimal>,
    pub opened_at: DateTime<Utc>,
}

impl Position {
    pub fn calculate_pnl(&self) -> Decimal {
        match self.side {
            TradeSide::Buy => (self.current_price - self.entry_price) * self.size,
            TradeSide::Sell => (self.entry_price - self.current_price) * self.size,
        }
    }

    pub fn calculate_risk_percent(&self, account_balance: Decimal) -> f64 {
        if let Some(stop_loss) = self.stop_loss {
            let risk_amount = match self.side {
                TradeSide::Buy => (self.entry_price - stop_loss) * self.size,
                TradeSide::Sell => (stop_loss - self.entry_price) * self.size,
            };
            (risk_amount / account_balance).to_f64().unwrap_or(0.0) * 100.0
        } else {
            0.0
        }
    }
}

/// Enhanced risk management system
pub struct EnhancedRiskManager {
    config: TradingConfig,
    limits: RiskLimits,
    session: Arc<RwLock<TradingSession>>,
    positions: Arc<RwLock<HashMap<String, Position>>>,
    price_history: Arc<RwLock<HashMap<String, Vec<PriceData>>>>,
    correlation_matrix: Arc<RwLock<HashMap<(String, String), f64>>>,
}

impl EnhancedRiskManager {
    pub fn new(config: TradingConfig, limits: Option<RiskLimits>) -> Self {
        Self {
            config,
            limits: limits.unwrap_or_default(),
            session: Arc::new(RwLock::new(TradingSession::default())),
            positions: Arc::new(RwLock::new(HashMap::new())),
            price_history: Arc::new(RwLock::new(HashMap::new())),
            correlation_matrix: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Assess risk for a potential trade
    pub async fn assess_trade_risk(
        &self,
        order: &OrderRequest,
        account_info: &AccountInfo,
        current_price: Decimal,
    ) -> TradingResult<RiskAssessment> {
        let mut assessment = RiskAssessment::default();

        // Position size risk
        let position_value = order.quantity * current_price;
        let account_balance = account_info.total_wallet_balance;
        let position_percent = (position_value / account_balance).to_f64().unwrap_or(0.0) * 100.0;

        if position_percent > self.limits.max_position_size_percent {
            assessment.violations.push(format!(
                "Position size {}% exceeds limit of {}%",
                position_percent, self.limits.max_position_size_percent
            ));
            assessment.risk_level = RiskLevel::High;
        }

        // Daily loss limit check
        let session = self.session.read().await;
        let daily_loss_percent = (session.daily_pnl / account_balance).to_f64().unwrap_or(0.0) * 100.0;

        if daily_loss_percent.abs() > self.limits.max_daily_loss_percent {
            assessment.violations.push(format!(
                "Daily loss {}% exceeds limit of {}%",
                daily_loss_percent.abs(), self.limits.max_daily_loss_percent
            ));
            assessment.risk_level = RiskLevel::Critical;
        }

        // Consecutive losses check
        if session.consecutive_losses >= self.limits.max_consecutive_losses {
            assessment.violations.push(format!(
                "Consecutive losses {} exceeds limit of {}",
                session.consecutive_losses, self.limits.max_consecutive_losses
            ));
            assessment.risk_level = RiskLevel::High;
        }

        // Correlation exposure check
        let correlation_exposure = self.calculate_correlation_exposure(&order.symbol).await;
        if correlation_exposure > self.limits.max_correlation_exposure {
            assessment.violations.push(format!(
                "Correlation exposure {}% exceeds limit of {}%",
                correlation_exposure, self.limits.max_correlation_exposure
            ));
            assessment.risk_level = RiskLevel::Medium;
        }

        // Volatility check
        let volatility = self.calculate_volatility(&order.symbol).await;
        if volatility > self.limits.volatility_threshold {
            assessment.warnings.push(format!(
                "High volatility detected: {:.2}%",
                volatility * 100.0
            ));
        }

        // Risk-reward ratio check (if stop loss and take profit are set)
        if let Some(price) = order.price {
            if let Some(risk_reward) = self.calculate_risk_reward_ratio(order, price) {
                if risk_reward < self.limits.min_risk_reward_ratio {
                    assessment.warnings.push(format!(
                        "Risk-reward ratio {:.2} below recommended {:.2}",
                        risk_reward, self.limits.min_risk_reward_ratio
                    ));
                }
                assessment.risk_reward_ratio = Some(risk_reward);
            }
        }

        // Set overall risk score
        assessment.risk_score = self.calculate_risk_score(&assessment);

        Ok(assessment)
    }

    async fn calculate_correlation_exposure(&self, symbol: &str) -> f64 {
        let positions = self.positions.read().await;
        let mut total_exposure = 0.0;
        let mut correlation_count = 0;
        
        for position in positions.values() {
            if position.symbol != symbol {
                // Simplified correlation calculation - in production, use actual price correlation
                let correlation = match (symbol, position.symbol.as_str()) {
                    ("BTCUSDT", "ETHUSDT") | ("ETHUSDT", "BTCUSDT") => 0.7,
                    ("BTCUSDT", "ADAUSDT") | ("ADAUSDT", "BTCUSDT") => 0.6,
                    ("ETHUSDT", "ADAUSDT") | ("ADAUSDT", "ETHUSDT") => 0.5,
                    _ => 0.3, // Default low correlation
                };
                
                let position_exposure = (position.size * position.current_price).to_f64().unwrap_or(0.0);
                total_exposure += correlation.abs() * position_exposure;
                correlation_count += 1;
            }
        }
        
        if correlation_count > 0 {
            total_exposure / correlation_count as f64
        } else {
            0.0
        }
    }

    async fn calculate_volatility(&self, symbol: &str) -> f64 {
        let price_history = self.price_history.read().await;
        
        if let Some(prices) = price_history.get(symbol) {
            if prices.len() < 2 {
                return 0.0;
            }
            
            let returns: Vec<f64> = prices.windows(2)
                .filter_map(|window| {
                    let prev = window[0].close.to_f64()?;
                    let curr = window[1].close.to_f64()?;
                    if prev > 0.0 {
                        Some((curr - prev) / prev)
                    } else {
                        None
                    }
                })
                .collect();
            
            if returns.len() < 2 {
                return 0.0;
            }
            
            let mean = returns.iter().sum::<f64>() / returns.len() as f64;
            let variance = returns.iter()
                .map(|r| (r - mean).powi(2))
                .sum::<f64>() / (returns.len() - 1) as f64;
            
            variance.sqrt() * (252.0_f64).sqrt() // Annualized volatility
        } else {
            0.0
        }
    }

    fn calculate_risk_reward_ratio(&self, order: &OrderRequest, _price: Decimal) -> Option<f64> {
        let stop_loss_percent = order.stop_loss_percent?;
        let take_profit_percent = order.take_profit_percent?;
        
        if stop_loss_percent <= 0.0 || take_profit_percent <= 0.0 {
            return None;
        }
        
        let risk = stop_loss_percent / 100.0;
        let reward = take_profit_percent / 100.0;
        
        Some(reward / risk)
    }

    fn calculate_risk_score(&self, assessment: &RiskAssessment) -> f64 {
        let mut score = 0.0;
        
        score += match assessment.risk_level {
            RiskLevel::Low => 0.2,
            RiskLevel::Medium => 0.5,
            RiskLevel::High => 0.8,
            RiskLevel::Critical => 1.0,
        };
        
        score += assessment.violations.len() as f64 * 0.1;
        
        score += assessment.warnings.len() as f64 * 0.05;
        
        if let Some(rr_ratio) = assessment.risk_reward_ratio {
            if rr_ratio < 1.0 {
                score += 0.2; // Poor risk-reward ratio
            } else if rr_ratio > 2.0 {
                score -= 0.1; // Good risk-reward ratio
            }
        }
        
        score.max(0.0).min(1.0)
    }
}

/// Risk assessment result
#[derive(Debug, Clone, Default)]
pub struct RiskAssessment {
    pub risk_level: RiskLevel,
    pub risk_score: f64,
    pub violations: Vec<String>,
    pub warnings: Vec<String>,
    pub risk_reward_ratio: Option<f64>,
}

impl Default for RiskLevel {
    fn default() -> Self {
        RiskLevel::Low
    }
}
