use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub api_key: String,
    pub api_secret: String,
    pub base_url: String,
    pub testnet: bool,
    pub disable_animations: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            api_secret: String::new(),
            base_url: "https://api.binance.com".to_string(),
            testnet: false,
            disable_animations: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickerData {
    pub symbol: String,
    pub price: Decimal,
    pub price_change: Decimal,
    pub price_change_percent: Decimal,
    pub volume: Decimal,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolInfo {
    pub symbol: String,
    pub base_asset: String,
    pub quote_asset: String,
    pub status: String,
    pub price: Option<Decimal>,
    pub price_change_percent: Option<Decimal>,
    pub volume: Option<Decimal>,
    pub high: Option<Decimal>,
    pub low: Option<Decimal>,
    pub is_spot_trading_allowed: bool,
    pub is_margin_trading_allowed: bool,
    pub filters: Vec<SymbolFilter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolFilter {
    pub filter_type: String,
    pub min_price: Option<Decimal>,
    pub max_price: Option<Decimal>,
    pub tick_size: Option<Decimal>,
    pub min_qty: Option<Decimal>,
    pub max_qty: Option<Decimal>,
    pub step_size: Option<Decimal>,
    pub min_notional: Option<Decimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketStats {
    pub symbol: String,
    pub price: Decimal,
    pub price_change: Decimal,
    pub price_change_percent: Decimal,
    pub weighted_avg_price: Decimal,
    pub prev_close_price: Decimal,
    pub last_price: Decimal,
    pub last_qty: Decimal,
    pub bid_price: Decimal,
    pub ask_price: Decimal,
    pub high: Decimal,
    pub low: Decimal,
    pub volume: Decimal,
    pub quote_volume: Decimal,
    pub count: u64,
    pub open_time: DateTime<Utc>,
    pub close_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KlineData {
    pub open_time: DateTime<Utc>,
    pub close_time: DateTime<Utc>,
    pub open: Decimal,
    pub high: Decimal,
    pub low: Decimal,
    pub close: Decimal,
    pub volume: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub id: Uuid,
    pub symbol: String,
    pub side: TradeSide,
    pub order_type: OrderType,
    pub quantity: Decimal,
    pub entry_price: Decimal,
    pub exit_price: Option<Decimal>,
    pub take_profit: Option<Decimal>,
    pub stop_loss: Option<Decimal>,
    pub status: TradeStatus,
    pub created_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
    pub pnl: Option<Decimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TradeSide {
    Long,
    Short,
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderType {
    Market,
    Limit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TradeStatus {
    Open,
    Closed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderRequest {
    pub symbol: String,
    pub side: TradeSide,
    pub order_type: OrderType,
    pub quantity: Decimal,
    pub price: Option<Decimal>,
    pub take_profit_percent: Option<Decimal>,
    pub stop_loss_percent: Option<Decimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountInfo {
    pub balances: Vec<Balance>,
    pub can_trade: bool,
    pub total_wallet_balance: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub asset: String,
    pub free: Decimal,
    pub locked: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PnlData {
    pub timestamp: DateTime<Utc>,
    pub realized_pnl: Decimal,
    pub unrealized_pnl: Decimal,
    pub total_pnl: Decimal,
}

// Level 2 Market Data Structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderBookLevel {
    pub price: Decimal,
    pub quantity: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderBookDepth {
    pub symbol: String,
    pub last_update_id: u64,
    pub timestamp: DateTime<Utc>,
    pub bids: Vec<OrderBookLevel>, // Highest price first
    pub asks: Vec<OrderBookLevel>, // Lowest price first
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketDepthAnalysis {
    pub timestamp: DateTime<Utc>,
    pub symbol: String,
    // Liquidity metrics
    pub total_bid_volume: Decimal,
    pub total_ask_volume: Decimal,
    pub bid_ask_volume_ratio: f64,
    // Market pressure indicators
    pub large_bid_walls: Vec<OrderBookLevel>, // Significant support levels
    pub large_ask_walls: Vec<OrderBookLevel>, // Significant resistance levels
    // Depth imbalance
    pub depth_imbalance: f64, // Positive = more buying pressure, negative = more selling
    // Liquidity spread metrics
    pub avg_bid_depth_5: Decimal, // Average volume in top 5 bid levels
    pub avg_ask_depth_5: Decimal, // Average volume in top 5 ask levels
    pub liquidity_score: f64, // Overall market liquidity (0-1)
    // Market microstructure
    pub bid_ask_spread: Decimal,
    pub mid_price: Decimal,
    pub price_impact_1pct: f64, // Price impact for 1% of total volume
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityLevel {
    pub price: Decimal,
    pub volume: Decimal,
    pub level_type: LiquidityType,
    pub strength: f64, // 0-1, how significant this level is
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LiquidityType {
    Support,    // Large bid wall
    Resistance, // Large ask wall
    WhaleOrder, // Exceptionally large order
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceData {
    pub timestamp: DateTime<Utc>,
    pub open: Decimal,
    pub high: Decimal,
    pub low: Decimal,
    pub close: Decimal,
    pub volume: Decimal,
}