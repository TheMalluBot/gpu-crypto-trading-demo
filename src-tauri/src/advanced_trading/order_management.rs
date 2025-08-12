// Professional Order Management System
// Advanced Trading Agent - Week 7 Implementation

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::errors::{TradingResult, TradingError, TradingLogicErrorType};
use super::{AdvancedOrderRequest, AdvancedOrderType, OrderSide, TimeInForce};

/// Professional order manager with advanced features
pub struct ProfessionalOrderManager {
    active_orders: Arc<RwLock<HashMap<String, ActiveOrder>>>,
    order_history: Arc<RwLock<Vec<CompletedOrder>>>,
    order_execution_engine: OrderExecutionEngine,
    smart_routing: SmartOrderRouting,
    slippage_control: SlippageProtection,
}

/// Active order with professional tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveOrder {
    pub id: String,
    pub client_order_id: Option<String>,
    pub symbol: String,
    pub side: OrderSide,
    pub order_type: AdvancedOrderType,
    pub quantity: Decimal,
    pub filled_quantity: Decimal,
    pub remaining_quantity: Decimal,
    pub price: Option<Decimal>,
    pub average_fill_price: Option<Decimal>,
    pub status: OrderStatus,
    pub time_in_force: TimeInForce,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub fills: Vec<OrderFill>,
    pub stop_price: Option<Decimal>,
    pub trail_amount: Option<Decimal>,
    pub parent_order_id: Option<String>, // For OCO and Bracket orders
    pub child_order_ids: Vec<String>,
    pub risk_limits: Option<super::RiskLimits>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderStatus {
    New,
    PartiallyFilled,
    Filled,
    Cancelled,
    Rejected,
    Expired,
    Pending,
    Triggered,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderFill {
    pub fill_id: String,
    pub price: Decimal,
    pub quantity: Decimal,
    pub fee: Decimal,
    pub fee_asset: String,
    pub timestamp: DateTime<Utc>,
    pub trade_id: String,
    pub commission_rate: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletedOrder {
    pub order: ActiveOrder,
    pub completion_reason: String,
    pub final_status: OrderStatus,
    pub completed_at: DateTime<Utc>,
    pub total_fee: Decimal,
    pub net_pnl: Option<Decimal>,
}

/// Smart order routing for optimal execution
pub struct SmartOrderRouting {
    routing_algorithms: Vec<RoutingAlgorithm>,
}

#[derive(Debug, Clone)]
pub enum RoutingAlgorithm {
    TWAP, // Time-Weighted Average Price
    VWAP, // Volume-Weighted Average Price
    Implementation, // Implementation Shortfall
    POV,  // Percentage of Volume
}

/// Slippage protection system
pub struct SlippageProtection {
    max_slippage_percent: Decimal,
    price_impact_limit: Decimal,
    adaptive_sizing: bool,
}

/// Order execution engine
pub struct OrderExecutionEngine {
    execution_strategies: HashMap<AdvancedOrderType, ExecutionStrategy>,
}

#[derive(Debug, Clone)]
pub enum ExecutionStrategy {
    Immediate,
    Gradual { chunks: u32, interval_ms: u64 },
    Opportunistic { price_improvement_threshold: Decimal },
    Iceberg { visible_quantity: Decimal },
}

impl ProfessionalOrderManager {
    pub async fn new() -> TradingResult<Self> {
        let mut execution_strategies = HashMap::new();
        
        // Configure execution strategies for different order types
        execution_strategies.insert(
            AdvancedOrderType::Market,
            ExecutionStrategy::Immediate
        );
        
        execution_strategies.insert(
            AdvancedOrderType::Limit,
            ExecutionStrategy::Opportunistic { 
                price_improvement_threshold: Decimal::from_f64_retain(0.001).unwrap() 
            }
        );

        let order_execution_engine = OrderExecutionEngine {
            execution_strategies,
        };

        let smart_routing = SmartOrderRouting {
            routing_algorithms: vec![
                RoutingAlgorithm::VWAP,
                RoutingAlgorithm::TWAP,
                RoutingAlgorithm::Implementation,
            ],
        };

        let slippage_control = SlippageProtection {
            max_slippage_percent: Decimal::from_f64_retain(0.005).unwrap(), // 0.5%
            price_impact_limit: Decimal::from_f64_retain(0.01).unwrap(), // 1%
            adaptive_sizing: true,
        };

        Ok(Self {
            active_orders: Arc::new(RwLock::new(HashMap::new())),
            order_history: Arc::new(RwLock::new(Vec::new())),
            order_execution_engine,
            smart_routing,
            slippage_control,
        })
    }

    /// Place an advanced order with professional features
    pub async fn place_advanced_order(&mut self, request: AdvancedOrderRequest) -> TradingResult<String> {
        let order_id = Uuid::new_v4().to_string();
        
        // Validate order request
        self.validate_order_request(&request).await?;
        
        // Apply slippage protection
        let protected_request = self.apply_slippage_protection(request).await?;
        
        // Create order based on type
        let order = match protected_request.order_type.clone() {
            AdvancedOrderType::OCO { stop_price, limit_price } => {
                self.create_oco_order(order_id.clone(), protected_request, stop_price, limit_price).await?
            },
            AdvancedOrderType::Bracket { take_profit, stop_loss } => {
                self.create_bracket_order(order_id.clone(), protected_request, take_profit, stop_loss).await?
            },
            AdvancedOrderType::TrailingStop { trail_amount, trail_percent: _ } => {
                self.create_trailing_stop_order(order_id.clone(), protected_request, trail_amount).await?
            },
            _ => {
                self.create_standard_order(order_id.clone(), protected_request).await?
            }
        };

        // Add to active orders
        {
            let mut active_orders = self.active_orders.write().await;
            active_orders.insert(order_id.clone(), order);
        }

        // Start order monitoring
        self.start_order_monitoring(&order_id).await?;

        Ok(order_id)
    }

    /// Cancel a specific order
    pub async fn cancel_order(&mut self, order_id: &str) -> TradingResult<()> {
        let mut active_orders = self.active_orders.write().await;
        
        if let Some(mut order) = active_orders.remove(order_id) {
            order.status = OrderStatus::Cancelled;
            order.updated_at = Utc::now();
            
            // Handle parent-child relationships for complex orders
            if !order.child_order_ids.is_empty() {
                for child_id in &order.child_order_ids {
                    if let Some(mut child_order) = active_orders.remove(child_id) {
                        child_order.status = OrderStatus::Cancelled;
                        child_order.updated_at = Utc::now();
                        
                        // Add to history
                        let completed_order = CompletedOrder {
                            order: child_order,
                            completion_reason: "Parent order cancelled".to_string(),
                            final_status: OrderStatus::Cancelled,
                            completed_at: Utc::now(),
                            total_fee: Decimal::ZERO,
                            net_pnl: None,
                        };
                        
                        self.order_history.write().await.push(completed_order);
                    }
                }
            }
            
            // Add to history
            let completed_order = CompletedOrder {
                order,
                completion_reason: "User cancelled".to_string(),
                final_status: OrderStatus::Cancelled,
                completed_at: Utc::now(),
                total_fee: Decimal::ZERO,
                net_pnl: None,
            };
            
            self.order_history.write().await.push(completed_order);
            
            Ok(())
        } else {
            Err(TradingError::trading_logic_error(
                TradingLogicErrorType::OrderNotFound,
                format!("Order {} not found", order_id),
                None,
            ))
        }
    }

    /// Cancel all active orders
    pub async fn cancel_all_orders(&mut self) -> TradingResult<()> {
        let order_ids: Vec<String> = {
            let active_orders = self.active_orders.read().await;
            active_orders.keys().cloned().collect()
        };

        for order_id in order_ids {
            if let Err(e) = self.cancel_order(&order_id).await {
                eprintln!("Failed to cancel order {}: {}", order_id, e);
            }
        }

        Ok(())
    }

    /// Close all positions (emergency function)
    pub async fn close_all_positions(&mut self) -> TradingResult<()> {
        // This would implement position closure logic
        // For now, we'll cancel all orders as a safety measure
        self.cancel_all_orders().await
    }

    /// Get active orders
    pub async fn get_active_orders(&self) -> TradingResult<Vec<ActiveOrder>> {
        let active_orders = self.active_orders.read().await;
        Ok(active_orders.values().cloned().collect())
    }

    /// Get order history
    pub async fn get_order_history(&self, limit: Option<usize>) -> TradingResult<Vec<CompletedOrder>> {
        let order_history = self.order_history.read().await;
        let orders = if let Some(limit) = limit {
            order_history.iter().rev().take(limit).cloned().collect()
        } else {
            order_history.clone()
        };
        Ok(orders)
    }

    // Private helper methods

    async fn validate_order_request(&self, request: &AdvancedOrderRequest) -> TradingResult<()> {
        if request.symbol.is_empty() {
            return Err(TradingError::validation_error(
                "symbol".to_string(),
                "Symbol cannot be empty".to_string(),
                Some(request.symbol.clone()),
            ));
        }

        if request.quantity <= Decimal::ZERO {
            return Err(TradingError::validation_error(
                "quantity".to_string(),
                "Quantity must be greater than zero".to_string(),
                Some(request.quantity.to_string()),
            ));
        }

        // Validate risk limits if provided
        if let Some(ref risk_limits) = request.risk_limits {
            if let Some(max_size) = risk_limits.max_position_size {
                if request.quantity > max_size {
                    return Err(TradingError::trading_logic_error(
                        TradingLogicErrorType::RiskLimitExceeded,
                        format!("Order quantity {} exceeds maximum position size {}", request.quantity, max_size),
                        Some(request.symbol.clone()),
                    ));
                }
            }
        }

        Ok(())
    }

    async fn apply_slippage_protection(&self, mut request: AdvancedOrderRequest) -> TradingResult<AdvancedOrderRequest> {
        // Apply slippage protection based on order type and market conditions
        match request.order_type {
            AdvancedOrderType::Market => {
                // For market orders, we might want to convert to limit orders with slippage protection
                // This is a simplified implementation
                if self.slippage_control.adaptive_sizing {
                    // Reduce quantity if market impact is too high
                    // This would involve market depth analysis in a real implementation
                }
            },
            _ => {
                // Other order types already have price protection
            }
        }

        Ok(request)
    }

    async fn create_standard_order(&self, order_id: String, request: AdvancedOrderRequest) -> TradingResult<ActiveOrder> {
        Ok(ActiveOrder {
            id: order_id,
            client_order_id: request.client_order_id,
            symbol: request.symbol,
            side: request.side,
            order_type: request.order_type,
            quantity: request.quantity,
            filled_quantity: Decimal::ZERO,
            remaining_quantity: request.quantity,
            price: request.price,
            average_fill_price: None,
            status: OrderStatus::New,
            time_in_force: request.time_in_force,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            fills: Vec::new(),
            stop_price: None,
            trail_amount: None,
            parent_order_id: None,
            child_order_ids: Vec::new(),
            risk_limits: request.risk_limits,
        })
    }

    async fn create_oco_order(&self, order_id: String, request: AdvancedOrderRequest, stop_price: Decimal, limit_price: Decimal) -> TradingResult<ActiveOrder> {
        // Create parent OCO order
        let mut parent_order = self.create_standard_order(order_id.clone(), request.clone()).await?;
        
        // Create child orders
        let stop_order_id = Uuid::new_v4().to_string();
        let limit_order_id = Uuid::new_v4().to_string();
        
        parent_order.child_order_ids = vec![stop_order_id.clone(), limit_order_id.clone()];
        
        // In a real implementation, we would create and manage the child orders
        // For now, we'll store the OCO structure in the parent order
        
        Ok(parent_order)
    }

    async fn create_bracket_order(&self, order_id: String, request: AdvancedOrderRequest, take_profit: Decimal, stop_loss: Decimal) -> TradingResult<ActiveOrder> {
        // Similar to OCO but with specific take-profit and stop-loss logic
        let mut parent_order = self.create_standard_order(order_id, request).await?;
        
        // Set bracket parameters
        parent_order.order_type = AdvancedOrderType::Bracket { take_profit, stop_loss };
        
        Ok(parent_order)
    }

    async fn create_trailing_stop_order(&self, order_id: String, request: AdvancedOrderRequest, trail_amount: Decimal) -> TradingResult<ActiveOrder> {
        let mut order = self.create_standard_order(order_id, request).await?;
        order.trail_amount = Some(trail_amount);
        Ok(order)
    }

    async fn start_order_monitoring(&self, _order_id: &str) -> TradingResult<()> {
        // In a real implementation, this would start a background task to monitor order status
        // For now, we'll just acknowledge the start
        Ok(())
    }
}

impl OrderExecutionEngine {
    pub fn get_execution_strategy(&self, order_type: &AdvancedOrderType) -> ExecutionStrategy {
        self.execution_strategies
            .get(order_type)
            .cloned()
            .unwrap_or(ExecutionStrategy::Immediate)
    }
}

impl SmartOrderRouting {
    pub fn select_optimal_routing(&self, _symbol: &str, _quantity: Decimal, _market_conditions: &str) -> RoutingAlgorithm {
        // In a real implementation, this would analyze market conditions and select the best routing
        // For now, return VWAP as default
        RoutingAlgorithm::VWAP
    }
}

impl SlippageProtection {
    pub fn calculate_slippage_adjusted_price(&self, _market_price: Decimal, _side: &OrderSide) -> Decimal {
        // In a real implementation, this would calculate price adjustments based on slippage tolerance
        // For now, return the market price as-is
        _market_price
    }
}