use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use rust_decimal::Decimal;
use chrono::{DateTime, Utc};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio;

use crate::models::{AppSettings, AccountInfo, Balance, KlineData, OrderRequest, Trade, TradeSide, OrderType, TradeStatus, OrderBookDepth, OrderBookLevel, MarketDepthAnalysis, LiquidityLevel, LiquidityType, SymbolInfo, SymbolFilter, MarketStats};

// SAFETY NOTICE: This client is configured for PAPER TRADING ONLY
// Live trading functionality has been permanently removed to prevent accidental real money trading

#[derive(Clone)]
struct SymbolCache {
    symbols: Vec<SymbolInfo>,
    last_updated: Instant,
    ttl: Duration,
}

impl SymbolCache {
    fn new() -> Self {
        Self {
            symbols: Vec::new(),
            last_updated: Instant::now() - Duration::from_secs(3600), // Force initial load
            ttl: Duration::from_secs(300), // 5 minute cache
        }
    }
    
    fn is_expired(&self) -> bool {
        self.last_updated.elapsed() > self.ttl
    }
    
    fn update(&mut self, symbols: Vec<SymbolInfo>) {
        self.symbols = symbols;
        self.last_updated = Instant::now();
    }
    
    fn search(&self, query: &str, limit: usize) -> Vec<SymbolInfo> {
        let query_upper = query.to_uppercase();
        self.symbols
            .iter()
            .filter(|symbol| {
                symbol.symbol.contains(&query_upper) ||
                symbol.base_asset.contains(&query_upper) ||
                symbol.quote_asset.contains(&query_upper)
            })
            .take(limit)
            .cloned()
            .collect()
    }
}

pub struct BinanceClient {
    client: Client,
    base_url: String,
    api_key: String,
    api_secret: String,
    symbol_cache: Arc<Mutex<SymbolCache>>,
}

impl BinanceClient {
    pub fn new(settings: &AppSettings) -> Self {
        // Use correct URL based on testnet setting
        let base_url = if settings.testnet {
            "https://testnet.binance.vision".to_string()
        } else {
            settings.base_url.clone()
        };
        
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(3)) // Reduced timeout for better performance
                .build()
                .unwrap_or_default(),
            base_url,
            api_key: settings.api_key.clone(),
            api_secret: settings.api_secret.clone(),
            symbol_cache: Arc::new(Mutex::new(SymbolCache::new())),
        }
    }

    pub async fn test_connection(&self) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        // Validate API credentials first
        if self.api_key.is_empty() || self.api_secret.is_empty() {
            return Err("API key and secret are required".into());
        }
        
        let url = format!("{}/api/v3/ping", self.base_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    Ok(true)
                } else {
                    Err(format!("API request failed with status: {}", response.status()).into())
                }
            }
            Err(e) => {
                if e.is_timeout() {
                    Err("Connection timeout. Please check your internet connection.".into())
                } else if e.is_connect() {
                    Err("Failed to connect to Binance API. Please check your network connection.".into())
                } else {
                    Err(format!("Network error: {}", e).into())
                }
            }
        }
    }

    pub async fn get_account_info(&self) -> Result<AccountInfo, Box<dyn std::error::Error + Send + Sync>> {
        // Validate API credentials first
        if self.api_key.is_empty() || self.api_secret.is_empty() {
            return Err("API key and secret are required".into());
        }
        
        let url = format!("{}/api/v3/account", self.base_url);
        let timestamp = chrono::Utc::now().timestamp_millis();
        
        let mut params = HashMap::new();
        params.insert("timestamp", timestamp.to_string());
        
        let query_string = self.build_query_string(&params);
        let signature = self.sign_request(&query_string);
        
        let response = match self.client
            .get(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .query(&[("timestamp", timestamp.to_string())])
            .query(&[("signature", signature)])
            .send()
            .await {
            Ok(response) => response,
            Err(e) => {
                if e.is_timeout() {
                    return Err("Request timeout. Please try again.".into());
                } else if e.is_connect() {
                    return Err("Failed to connect to Binance API.".into());
                } else {
                    return Err(format!("Network error: {}", e).into());
                }
            }
        };

        // Check response status
        if !response.status().is_success() {
            let status = response.status();
            if status == 401 {
                return Err("Invalid API key or signature. Please check your credentials.".into());
            } else if status == 403 {
                return Err("API key does not have required permissions.".into());
            } else if status == 429 {
                return Err("Too many requests. Please try again later.".into());
            } else {
                return Err(format!("API request failed with status: {}", status).into());
            }
        }

        let data: Value = match response.json().await {
            Ok(data) => data,
            Err(e) => return Err(format!("Failed to parse response: {}", e).into()),
        };

        // Check if response contains error
        if let Some(error_msg) = data.get("msg") {
            return Err(format!("API Error: {}", error_msg.as_str().unwrap_or("Unknown error")).into());
        }
        
        let balances: Vec<Balance> = data["balances"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|b| {
                let asset = b["asset"].as_str()?.to_string();
                let free = b["free"].as_str()?.parse::<Decimal>().ok()?;
                let locked = b["locked"].as_str()?.parse::<Decimal>().ok()?;
                
                Some(Balance { asset, free, locked })
            })
            .collect();

        Ok(AccountInfo {
            balances,
            can_trade: data["canTrade"].as_bool().unwrap_or(false),
        })
    }

    pub async fn get_klines(&self, symbol: &str, interval: &str, limit: u32) -> Result<Vec<KlineData>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/v3/klines", self.base_url);
        
        let response = self.client
            .get(&url)
            .query(&[("symbol", symbol)])
            .query(&[("interval", interval)])
            .query(&[("limit", limit.to_string())])
            .send()
            .await?;

        let data: Value = response.json().await?;
        
        let klines: Vec<KlineData> = data.as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|k| {
                let kline = k.as_array()?;
                
                let open_time = DateTime::from_timestamp_millis(kline[0].as_i64()?)?;
                let close_time = DateTime::from_timestamp_millis(kline[6].as_i64()?)?;
                let open = kline[1].as_str()?.parse::<Decimal>().ok()?;
                let high = kline[2].as_str()?.parse::<Decimal>().ok()?;
                let low = kline[3].as_str()?.parse::<Decimal>().ok()?;
                let close = kline[4].as_str()?.parse::<Decimal>().ok()?;
                let volume = kline[5].as_str()?.parse::<Decimal>().ok()?;
                
                Some(KlineData {
                    open_time,
                    close_time,
                    open,
                    high,
                    low,
                    close,
                    volume,
                })
            })
            .collect();

        Ok(klines)
    }

    // REMOVED: Live trading functionality has been completely removed for safety
    // This function has been intentionally removed to prevent any possibility of live trading
    // All trading must go through the simulate_order() function for paper trading only
    
    pub async fn simulate_order(&self, order: &OrderRequest, current_market_price: Option<Decimal>) -> Result<Trade, Box<dyn std::error::Error + Send + Sync>> {
        // Paper trading simulation with realistic market data
        let market_price = current_market_price.unwrap_or(Decimal::from(67000)); // Use real market price if available
        
        let trade = Trade {
            id: uuid::Uuid::new_v4(),
            symbol: order.symbol.clone(),
            side: order.side.clone(),
            order_type: order.order_type.clone(),
            quantity: order.quantity,
            entry_price: order.price.unwrap_or(market_price), // Use market price for market orders
            exit_price: None,
            take_profit: order.take_profit_percent.map(|tp| {
                let base_price = order.price.unwrap_or(market_price);
                match order.side {
                    TradeSide::Long => base_price * (Decimal::from(100) + tp) / Decimal::from(100),
                    TradeSide::Short => base_price * (Decimal::from(100) - tp) / Decimal::from(100),
                }
            }),
            stop_loss: order.stop_loss_percent.map(|sl| {
                let base_price = order.price.unwrap_or(market_price);
                match order.side {
                    TradeSide::Long => base_price * (Decimal::from(100) - sl) / Decimal::from(100),
                    TradeSide::Short => base_price * (Decimal::from(100) + sl) / Decimal::from(100),
                }
            }),
            status: TradeStatus::Open,
            created_at: Utc::now(),
            closed_at: None,
            pnl: None,
        };

        Ok(trade)
    }
    
    pub async fn get_order_book_depth(&self, symbol: &str, limit: Option<u32>) -> Result<OrderBookDepth, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/v3/depth", self.base_url);
        let limit = limit.unwrap_or(100); // Default to 100 levels, max 5000 free
        
        let response = self.client
            .get(&url)
            .query(&[("symbol", symbol)])
            .query(&[("limit", limit.to_string())])
            .send()
            .await?;

        let data: Value = response.json().await?;
        
        // Parse bids (price, quantity)
        let bids: Vec<OrderBookLevel> = data["bids"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|bid| {
                let bid_array = bid.as_array()?;
                let price = bid_array[0].as_str()?.parse::<Decimal>().ok()?;
                let quantity = bid_array[1].as_str()?.parse::<Decimal>().ok()?;
                Some(OrderBookLevel { price, quantity })
            })
            .collect();
            
        // Parse asks (price, quantity)
        let asks: Vec<OrderBookLevel> = data["asks"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|ask| {
                let ask_array = ask.as_array()?;
                let price = ask_array[0].as_str()?.parse::<Decimal>().ok()?;
                let quantity = ask_array[1].as_str()?.parse::<Decimal>().ok()?;
                Some(OrderBookLevel { price, quantity })
            })
            .collect();

        Ok(OrderBookDepth {
            symbol: symbol.to_string(),
            last_update_id: data["lastUpdateId"].as_u64().unwrap_or(0),
            timestamp: chrono::Utc::now(),
            bids,
            asks,
        })
    }
    
    pub fn analyze_market_depth(&self, order_book: &OrderBookDepth) -> MarketDepthAnalysis {
        // Calculate total volumes
        let total_bid_volume: Decimal = order_book.bids.iter().map(|level| level.quantity).sum();
        let total_ask_volume: Decimal = order_book.asks.iter().map(|level| level.quantity).sum();
        
        // Calculate bid/ask volume ratio
        let bid_ask_volume_ratio = if total_ask_volume > Decimal::ZERO {
            (total_bid_volume / total_ask_volume).to_f64().unwrap_or(1.0)
        } else {
            1.0
        };
        
        // Detect large walls (orders significantly larger than average)
        let avg_bid_size = if !order_book.bids.is_empty() {
            total_bid_volume / Decimal::from(order_book.bids.len())
        } else {
            Decimal::ZERO
        };
        
        let avg_ask_size = if !order_book.asks.is_empty() {
            total_ask_volume / Decimal::from(order_book.asks.len())
        } else {
            Decimal::ZERO
        };
        
        // Find significant walls (3x average size)
        let wall_threshold_bids = avg_bid_size * Decimal::from(3);
        let wall_threshold_asks = avg_ask_size * Decimal::from(3);
        
        let large_bid_walls: Vec<OrderBookLevel> = order_book.bids
            .iter()
            .filter(|level| level.quantity >= wall_threshold_bids)
            .take(5) // Top 5 largest walls
            .cloned()
            .collect();
            
        let large_ask_walls: Vec<OrderBookLevel> = order_book.asks
            .iter()
            .filter(|level| level.quantity >= wall_threshold_asks)
            .take(5) // Top 5 largest walls
            .cloned()
            .collect();
        
        // Calculate depth imbalance (-1 to 1)
        let depth_imbalance = if total_bid_volume + total_ask_volume > Decimal::ZERO {
            let total_volume = total_bid_volume + total_ask_volume;
            let bid_ratio = (total_bid_volume / total_volume).to_f64().unwrap_or(0.5);
            (bid_ratio - 0.5) * 2.0 // Convert to -1 to 1 range
        } else {
            0.0
        };
        
        // Calculate average depth in top 5 levels
        let avg_bid_depth_5 = if order_book.bids.len() >= 5 {
            order_book.bids.iter().take(5).map(|l| l.quantity).sum::<Decimal>() / Decimal::from(5)
        } else {
            Decimal::ZERO
        };
        
        let avg_ask_depth_5 = if order_book.asks.len() >= 5 {
            order_book.asks.iter().take(5).map(|l| l.quantity).sum::<Decimal>() / Decimal::from(5)
        } else {
            Decimal::ZERO
        };
        
        // Calculate liquidity score (0-1 based on total volume and spread)
        let best_bid = order_book.bids.first().map(|l| l.price).unwrap_or_default();
        let best_ask = order_book.asks.first().map(|l| l.price).unwrap_or_default();
        let mid_price = if best_bid > Decimal::ZERO && best_ask > Decimal::ZERO {
            (best_bid + best_ask) / Decimal::from(2)
        } else {
            Decimal::ZERO
        };
        
        let bid_ask_spread = if best_ask > best_bid {
            best_ask - best_bid
        } else {
            Decimal::ZERO
        };
        
        // Liquidity score: higher volume and tighter spread = better liquidity
        let volume_score = ((total_bid_volume + total_ask_volume).to_f64().unwrap_or(0.0) / 1000.0).min(1.0);
        let spread_score = if mid_price > Decimal::ZERO {
            1.0 - ((bid_ask_spread / mid_price).to_f64().unwrap_or(1.0)).min(1.0)
        } else {
            0.0
        };
        let liquidity_score = (volume_score + spread_score) / 2.0;
        
        // Calculate price impact for 1% of total volume
        let target_volume = (total_bid_volume + total_ask_volume) * Decimal::from_f64_retain(0.01).unwrap_or_default();
        let price_impact_1pct = self.calculate_price_impact(&order_book.asks, target_volume, mid_price);
        
        MarketDepthAnalysis {
            timestamp: order_book.timestamp,
            symbol: order_book.symbol.clone(),
            total_bid_volume,
            total_ask_volume,
            bid_ask_volume_ratio,
            large_bid_walls,
            large_ask_walls,
            depth_imbalance,
            avg_bid_depth_5,
            avg_ask_depth_5,
            liquidity_score,
            bid_ask_spread,
            mid_price,
            price_impact_1pct,
        }
    }
    
    fn calculate_price_impact(&self, levels: &[OrderBookLevel], target_volume: Decimal, mid_price: Decimal) -> f64 {
        let mut remaining_volume = target_volume;
        let mut volume_weighted_price = Decimal::ZERO;
        let mut total_volume_used = Decimal::ZERO;
        
        for level in levels {
            if remaining_volume <= Decimal::ZERO {
                break;
            }
            
            let volume_to_use = remaining_volume.min(level.quantity);
            volume_weighted_price += level.price * volume_to_use;
            total_volume_used += volume_to_use;
            remaining_volume -= volume_to_use;
        }
        
        if total_volume_used > Decimal::ZERO && mid_price > Decimal::ZERO {
            let avg_execution_price = volume_weighted_price / total_volume_used;
            ((avg_execution_price - mid_price) / mid_price).to_f64().unwrap_or(0.0).abs()
        } else {
            0.0
        }
    }
    
    pub fn detect_liquidity_levels(&self, order_book: &OrderBookDepth, min_volume_threshold: Decimal) -> Vec<LiquidityLevel> {
        let mut liquidity_levels = Vec::new();
        
        // Calculate average volumes for comparison
        let avg_bid_volume = if !order_book.bids.is_empty() {
            order_book.bids.iter().map(|l| l.quantity).sum::<Decimal>() / Decimal::from(order_book.bids.len())
        } else {
            Decimal::ZERO
        };
        
        let avg_ask_volume = if !order_book.asks.is_empty() {
            order_book.asks.iter().map(|l| l.quantity).sum::<Decimal>() / Decimal::from(order_book.asks.len())
        } else {
            Decimal::ZERO
        };
        
        // Detect significant bid levels (support)
        for level in &order_book.bids {
            if level.quantity >= min_volume_threshold {
                let strength = if avg_bid_volume > Decimal::ZERO {
                    (level.quantity / avg_bid_volume).to_f64().unwrap_or(1.0).min(10.0) / 10.0
                } else {
                    1.0
                };
                
                let level_type = if level.quantity >= avg_bid_volume * Decimal::from(10) {
                    LiquidityType::WhaleOrder
                } else {
                    LiquidityType::Support
                };
                
                liquidity_levels.push(LiquidityLevel {
                    price: level.price,
                    volume: level.quantity,
                    level_type,
                    strength,
                });
            }
        }
        
        // Detect significant ask levels (resistance)
        for level in &order_book.asks {
            if level.quantity >= min_volume_threshold {
                let strength = if avg_ask_volume > Decimal::ZERO {
                    (level.quantity / avg_ask_volume).to_f64().unwrap_or(1.0).min(10.0) / 10.0
                } else {
                    1.0
                };
                
                let level_type = if level.quantity >= avg_ask_volume * Decimal::from(10) {
                    LiquidityType::WhaleOrder
                } else {
                    LiquidityType::Resistance
                };
                
                liquidity_levels.push(LiquidityLevel {
                    price: level.price,
                    volume: level.quantity,
                    level_type,
                    strength,
                });
            }
        }
        
        // Sort by strength (most significant first)
        liquidity_levels.sort_by(|a, b| b.strength.partial_cmp(&a.strength).unwrap_or(std::cmp::Ordering::Equal));
        
        liquidity_levels
    }

    fn build_query_string(&self, params: &HashMap<&str, String>) -> String {
        let mut query_parts: Vec<String> = Vec::new();
        let mut sorted_params: Vec<_> = params.iter().collect();
        sorted_params.sort_by_key(|&(k, _)| k);
        
        for (key, value) in sorted_params {
            query_parts.push(format!("{}={}", key, value));
        }
        query_parts.join("&")
    }

    fn sign_request(&self, query_string: &str) -> String {
        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        
        type HmacSha256 = Hmac<Sha256>;
        
        if self.api_secret.is_empty() {
            eprintln!("Warning: API secret is empty, signature will be invalid");
            return String::new();
        }
        
        let mut mac = match HmacSha256::new_from_slice(self.api_secret.as_bytes()) {
            Ok(mac) => mac,
            Err(e) => {
                eprintln!("Failed to create HMAC: {}", e);
                return String::new();
            }
        };
        
        mac.update(query_string.as_bytes());
        hex::encode(mac.finalize().into_bytes())
    }

    pub async fn get_all_symbols(&self) -> Result<Vec<SymbolInfo>, Box<dyn std::error::Error + Send + Sync>> {
        let exchange_info_url = format!("{}/api/v3/exchangeInfo", self.base_url);
        let ticker_url = format!("{}/api/v3/ticker/24hr", self.base_url);
        
        // Make parallel requests for better performance
        let (exchange_response, ticker_response) = tokio::try_join!(
            self.client.get(&exchange_info_url).send(),
            self.client.get(&ticker_url).send()
        )?;
        
        if !exchange_response.status().is_success() {
            return Err(format!("Failed to fetch exchange info: {}", exchange_response.status()).into());
        }
        
        let exchange_info: Value = exchange_response.json().await?;
        let symbols = exchange_info["symbols"].as_array()
            .ok_or("Invalid exchange info format")?;
        
        // Get 24hr ticker stats
        let ticker_stats: Vec<Value> = if ticker_response.status().is_success() {
            ticker_response.json().await.unwrap_or_default()
        } else {
            Vec::new()
        };
        
        // Create a map of symbol -> ticker data
        let mut ticker_map = HashMap::new();
        for ticker in ticker_stats {
            if let Some(symbol) = ticker["symbol"].as_str() {
                ticker_map.insert(symbol.to_string(), ticker);
            }
        }
        
        let mut symbol_infos = Vec::new();
        
        for symbol in symbols {
            let symbol_str = symbol["symbol"].as_str().unwrap_or_default();
            let base_asset = symbol["baseAsset"].as_str().unwrap_or_default();
            let quote_asset = symbol["quoteAsset"].as_str().unwrap_or_default();
            let status = symbol["status"].as_str().unwrap_or_default();
            let is_spot_trading_allowed = symbol["isSpotTradingAllowed"].as_bool().unwrap_or(false);
            let is_margin_trading_allowed = symbol["isMarginTradingAllowed"].as_bool().unwrap_or(false);
            
            // Parse filters
            let mut filters = Vec::new();
            if let Some(filter_array) = symbol["filters"].as_array() {
                for filter in filter_array {
                    let filter_type = filter["filterType"].as_str().unwrap_or_default();
                    let min_price = filter["minPrice"].as_str().and_then(|s| s.parse::<Decimal>().ok());
                    let max_price = filter["maxPrice"].as_str().and_then(|s| s.parse::<Decimal>().ok());
                    let tick_size = filter["tickSize"].as_str().and_then(|s| s.parse::<Decimal>().ok());
                    let min_qty = filter["minQty"].as_str().and_then(|s| s.parse::<Decimal>().ok());
                    let max_qty = filter["maxQty"].as_str().and_then(|s| s.parse::<Decimal>().ok());
                    let step_size = filter["stepSize"].as_str().and_then(|s| s.parse::<Decimal>().ok());
                    let min_notional = filter["minNotional"].as_str().and_then(|s| s.parse::<Decimal>().ok());
                    
                    filters.push(SymbolFilter {
                        filter_type: filter_type.to_string(),
                        min_price,
                        max_price,
                        tick_size,
                        min_qty,
                        max_qty,
                        step_size,
                        min_notional,
                    });
                }
            }
            
            // Get ticker data if available
            let ticker_data = ticker_map.get(symbol_str);
            let price = ticker_data.and_then(|t| t["lastPrice"].as_str().and_then(|s| s.parse::<Decimal>().ok()));
            let price_change_percent = ticker_data.and_then(|t| t["priceChangePercent"].as_str().and_then(|s| s.parse::<Decimal>().ok()));
            let volume = ticker_data.and_then(|t| t["volume"].as_str().and_then(|s| s.parse::<Decimal>().ok()));
            let high = ticker_data.and_then(|t| t["highPrice"].as_str().and_then(|s| s.parse::<Decimal>().ok()));
            let low = ticker_data.and_then(|t| t["lowPrice"].as_str().and_then(|s| s.parse::<Decimal>().ok()));
            
            // Only include active spot trading symbols
            if status == "TRADING" && is_spot_trading_allowed {
                symbol_infos.push(SymbolInfo {
                    symbol: symbol_str.to_string(),
                    base_asset: base_asset.to_string(),
                    quote_asset: quote_asset.to_string(),
                    status: status.to_string(),
                    price,
                    price_change_percent,
                    volume,
                    high,
                    low,
                    is_spot_trading_allowed,
                    is_margin_trading_allowed,
                    filters,
                });
            }
        }
        
        // Sort by volume (descending) to show most active symbols first
        symbol_infos.sort_by(|a, b| {
            let vol_a = a.volume.unwrap_or(Decimal::ZERO);
            let vol_b = b.volume.unwrap_or(Decimal::ZERO);
            vol_b.partial_cmp(&vol_a).unwrap_or(std::cmp::Ordering::Equal)
        });
        
        Ok(symbol_infos)
    }

    pub async fn get_market_stats(&self, symbol: &str) -> Result<MarketStats, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/v3/ticker/24hr?symbol={}", self.base_url, symbol);
        
        let response = self.client.get(&url).send().await?;
        if !response.status().is_success() {
            return Err(format!("Failed to fetch market stats: {}", response.status()).into());
        }
        
        let data: Value = response.json().await?;
        
        let symbol = data["symbol"].as_str().unwrap_or_default().to_string();
        let price = data["lastPrice"].as_str().unwrap_or("0").parse::<Decimal>().unwrap_or(Decimal::ZERO);
        let price_change = data["priceChange"].as_str().unwrap_or("0").parse::<Decimal>().unwrap_or(Decimal::ZERO);
        let price_change_percent = data["priceChangePercent"].as_str().unwrap_or("0").parse::<Decimal>().unwrap_or(Decimal::ZERO);
        let high = data["highPrice"].as_str().unwrap_or("0").parse::<Decimal>().unwrap_or(Decimal::ZERO);
        let low = data["lowPrice"].as_str().unwrap_or("0").parse::<Decimal>().unwrap_or(Decimal::ZERO);
        let volume = data["volume"].as_str().unwrap_or("0").parse::<Decimal>().unwrap_or(Decimal::ZERO);
        let quote_volume = data["quoteVolume"].as_str().unwrap_or("0").parse::<Decimal>().unwrap_or(Decimal::ZERO);
        let count = data["count"].as_u64().unwrap_or(0);
        let open_time = DateTime::from_timestamp_millis(data["openTime"].as_i64().unwrap_or(0)).unwrap_or(Utc::now());
        let close_time = DateTime::from_timestamp_millis(data["closeTime"].as_i64().unwrap_or(0)).unwrap_or(Utc::now());
        
        Ok(MarketStats {
            symbol,
            price,
            price_change,
            price_change_percent,
            high,
            low,
            volume,
            quote_volume,
            count,
            open_time,
            close_time,
        })
    }

    pub async fn search_symbols(&self, query: &str, limit: usize) -> Result<Vec<SymbolInfo>, Box<dyn std::error::Error + Send + Sync>> {
        // Check cache first
        {
            let cache = self.symbol_cache.lock().unwrap();
            if !cache.is_expired() && !cache.symbols.is_empty() {
                return Ok(cache.search(query, limit));
            }
        }
        
        // Cache is expired or empty, fetch fresh data
        let all_symbols = self.get_all_symbols().await?;
        
        // Update cache
        {
            let mut cache = self.symbol_cache.lock().unwrap();
            cache.update(all_symbols.clone());
        }
        
        // Perform search on cached data
        let cache = self.symbol_cache.lock().unwrap();
        Ok(cache.search(query, limit))
    }
}