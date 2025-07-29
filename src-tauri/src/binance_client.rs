use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use std::str::FromStr;
use chrono::{DateTime, Utc};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio;

use crate::models::{AppSettings, AccountInfo, Balance, KlineData, OrderRequest, Trade, TradeSide, OrderType, TradeStatus, OrderBookDepth, OrderBookLevel, MarketDepthAnalysis, LiquidityLevel, LiquidityType, SymbolInfo, SymbolFilter, MarketStats, TickerData};
use crate::rate_limiter::{RateLimiter, RateLimit, BinanceEndpoints};
use crate::secure_storage::{ApiCredentialManager, SecureApiCredentials};

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
            last_updated: Instant::now() - Duration::from_secs(3600),
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

pub struct ImprovedBinanceClient {
    client: Client,
    base_url: String,
    credentials: Option<SecureApiCredentials>,
    symbol_cache: Arc<Mutex<SymbolCache>>,
    rate_limiter: RateLimiter,
    credential_manager: ApiCredentialManager,
    server_time_offset: Arc<Mutex<Option<i64>>>, // Milliseconds offset from server time
}

impl ImprovedBinanceClient {
    pub fn new(settings: &AppSettings) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let credential_manager = ApiCredentialManager::new()?;
        
        // Load credentials from secure storage if available
        let credentials = if !settings.api_key.is_empty() && !settings.api_secret.is_empty() {
            let creds = SecureApiCredentials::new(
                settings.api_key.clone(),
                settings.api_secret.clone(),
                settings.testnet,
                settings.base_url.clone(),
            );
            
            // Store in secure storage for future use
            if let Err(e) = credential_manager.store_credentials(&creds) {
                eprintln!("Warning: Could not store credentials securely: {}", e);
            }
            
            Some(creds)
        } else {
            // Try to load from secure storage
            credential_manager.load_credentials().unwrap_or(None)
        };

        // Determine base URL
        let base_url = if settings.testnet {
            "https://testnet.binance.vision".to_string()
        } else {
            settings.base_url.clone()
        };

        // Validate base URL format
        Self::validate_base_url(&base_url)?;

        Ok(Self {
            client: Client::builder()
                .timeout(Duration::from_secs(10)) // Increased timeout for better reliability
                .user_agent("CryptoTrader/1.0") // Proper user agent
                .build()
                .unwrap_or_default(),
            base_url,
            credentials,
            symbol_cache: Arc::new(Mutex::new(SymbolCache::new())),
            rate_limiter: RateLimiter::new(RateLimit::default()),
            credential_manager,
            server_time_offset: Arc::new(Mutex::new(None)),
        })
    }

    fn validate_base_url(url: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if !url.starts_with("https://") {
            return Err("Base URL must use HTTPS".into());
        }
        
        // Check for known Binance domains
        let valid_domains = [
            "api.binance.com",
            "api.binance.us", 
            "testnet.binance.vision",
            "api1.binance.com",
            "api2.binance.com",
            "api3.binance.com",
        ];
        
        let is_valid = valid_domains.iter().any(|domain| url.contains(domain));
        if !is_valid {
            eprintln!("Warning: Using non-standard Binance API URL: {}", url);
        }
        
        Ok(())
    }

    pub async fn sync_server_time(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/v3/time", self.base_url);
        let endpoint = BinanceEndpoints::get_endpoint_from_url(&url);
        let weight = BinanceEndpoints::get_weight(endpoint);
        
        // Respect rate limits
        self.rate_limiter.wait_for_rate_limit(weight).await?;
        
        let start_time = Utc::now().timestamp_millis();
        let response = self.client.get(&url).send().await?;
        let end_time = Utc::now().timestamp_millis();
        let round_trip_time = end_time - start_time;
        
        if !response.status().is_success() {
            return Err(format!("Failed to sync server time: {}", response.status()).into());
        }
        
        let data: Value = response.json().await?;
        let server_time = data["serverTime"].as_i64()
            .ok_or("Invalid server time response")?;
        
        // Calculate offset accounting for network latency
        let adjusted_server_time = server_time + (round_trip_time / 2);
        let client_time = Utc::now().timestamp_millis();
        let offset = adjusted_server_time - client_time;
        
        match self.server_time_offset.lock() {
            Ok(mut offset_guard) => *offset_guard = Some(offset),
            Err(_) => {
                eprintln!("Warning: Failed to acquire server time offset lock");
                return Err("Mutex lock failed for server time offset".into());
            }
        }
        
        eprintln!("Server time synchronized. Offset: {}ms", offset);
        Ok(())
    }

    fn get_server_time(&self) -> i64 {
        let offset = match self.server_time_offset.lock() {
            Ok(guard) => *guard,
            Err(_) => {
                eprintln!("Warning: Failed to acquire server time offset lock, using client time");
                None
            }
        };
        let client_time = Utc::now().timestamp_millis();
        
        if let Some(offset_value) = offset {
            client_time + offset_value
        } else {
            // If we haven't synced, use client time but log warning
            eprintln!("Warning: Using client time without server sync");
            client_time
        }
    }

    pub async fn test_connection(&self) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        // First sync server time
        self.sync_server_time().await?;
        
        // Test basic connectivity
        let url = format!("{}/api/v3/ping", self.base_url);
        let endpoint = BinanceEndpoints::get_endpoint_from_url(&url);
        let weight = BinanceEndpoints::get_weight(endpoint);
        
        self.rate_limiter.wait_for_rate_limit(weight).await?;
        
        match self.client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    // Test authenticated endpoint if credentials are available
                    if self.credentials.is_some() {
                        self.test_authenticated_connection().await
                    } else {
                        Ok(true)
                    }
                } else {
                    self.handle_api_error_response(response).await
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

    async fn test_authenticated_connection(&self) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        // Test with a lightweight authenticated endpoint
        match self.get_account_info().await {
            Ok(_) => Ok(true),
            Err(e) => {
                let error_msg = e.to_string();
                if error_msg.contains("Invalid API key") || error_msg.contains("signature") {
                    Err("API credentials are invalid. Please check your API key and secret.".into())
                } else if error_msg.contains("IP") {
                    Err("IP address not allowed. Please add your IP to the API whitelist.".into())
                } else {
                    Err(e)
                }
            }
        }
    }

    async fn handle_api_error_response(&self, response: reqwest::Response) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let status = response.status();
        
        // Handle rate limiting
        if status == 429 {
            if let Some(retry_after) = response.headers().get("retry-after") {
                if let Ok(retry_seconds) = retry_after.to_str()?.parse::<u64>() {
                    self.rate_limiter.handle_rate_limit_error(Some(Duration::from_secs(retry_seconds))).await;
                }
            } else {
                self.rate_limiter.handle_rate_limit_error(None).await;
            }
            return Err("Rate limit exceeded. Please try again later.".into());
        }
        
        // Try to get error details from response body
        match response.json::<Value>().await {
            Ok(error_data) => {
                let code = error_data.get("code").and_then(|c| c.as_i64()).unwrap_or(-1);
                let msg = error_data.get("msg").and_then(|m| m.as_str()).unwrap_or("Unknown error");
                
                match code {
                    -1021 => Err("Timestamp out of sync. Please check your system time.".into()),
                    -1022 => Err("Invalid signature. Please check your API secret.".into()),
                    -2014 => Err("API key format invalid.".into()),
                    -2015 => Err("Invalid API key or insufficient permissions.".into()),
                    _ => Err(format!("API Error {}: {}", code, msg).into()),
                }
            }
            Err(_) => Err(format!("API request failed with status: {}", status).into()),
        }
    }

    pub async fn get_account_info(&self) -> Result<AccountInfo, Box<dyn std::error::Error + Send + Sync>> {
        let credentials = self.credentials.as_ref()
            .ok_or("API credentials not configured")?;
        
        let url = format!("{}/api/v3/account", self.base_url);
        let endpoint = BinanceEndpoints::get_endpoint_from_url(&url);
        let weight = BinanceEndpoints::get_weight(endpoint);
        
        self.rate_limiter.wait_for_rate_limit(weight).await?;
        
        let timestamp = self.get_server_time();
        let recv_window = 5000; // 5 seconds
        
        let mut params = HashMap::new();
        params.insert("timestamp", timestamp.to_string());
        params.insert("recvWindow", recv_window.to_string());
        
        let query_string = self.build_query_string(&params);
        let signature = self.sign_request(&query_string, &credentials.api_secret)?;
        
        let response = self.client
            .get(&url)
            .header("X-MBX-APIKEY", &credentials.api_key)
            .query(&[("timestamp", timestamp.to_string())])
            .query(&[("recvWindow", recv_window.to_string())])
            .query(&[("signature", signature)])
            .send()
            .await;

        let response = match response {
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

        if !response.status().is_success() {
            return self.handle_api_error_response(response).await.map(|_| unreachable!());
        }

        let data: Value = response.json().await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        // Mark credentials as used
        self.credential_manager.update_last_used().ok();

        let empty_balances = vec![];
        let balances: Vec<Balance> = data["balances"]
            .as_array()
            .unwrap_or(&empty_balances)
            .iter()
            .filter_map(|b| {
                let asset = b["asset"].as_str()?.to_string();
                let free = b["free"].as_str()?.parse::<Decimal>().ok()?;
                let locked = b["locked"].as_str()?.parse::<Decimal>().ok()?;
                
                // Only include non-zero balances
                if free > Decimal::ZERO || locked > Decimal::ZERO {
                    Some(Balance { asset, free, locked })
                } else {
                    None
                }
            })
            .collect();

        Ok(AccountInfo {
            balances,
            can_trade: data["canTrade"].as_bool().unwrap_or(false),
            total_wallet_balance: data["totalWalletBalance"]
                .as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or(Decimal::ZERO),
        })
    }

    pub async fn get_klines(&self, symbol: &str, interval: &str, limit: u32) -> Result<Vec<KlineData>, Box<dyn std::error::Error + Send + Sync>> {
        // Validate parameters
        if symbol.is_empty() {
            return Err("Symbol cannot be empty".into());
        }
        
        let valid_intervals = ["1s", "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"];
        if !valid_intervals.contains(&interval) {
            return Err(format!("Invalid interval: {}. Valid intervals: {:?}", interval, valid_intervals).into());
        }
        
        let limit = std::cmp::min(limit, 1000); // Max 1000 as per API docs
        
        let url = format!("{}/api/v3/klines", self.base_url);
        let endpoint = BinanceEndpoints::get_endpoint_from_url(&url);
        let weight = BinanceEndpoints::get_weight(endpoint);
        
        self.rate_limiter.wait_for_rate_limit(weight).await?;
        
        let response = self.client
            .get(&url)
            .query(&[("symbol", symbol.to_uppercase())])
            .query(&[("interval", interval)])
            .query(&[("limit", limit.to_string())])
            .send()
            .await?;

        if !response.status().is_success() {
            return self.handle_api_error_response(response).await.map(|_| unreachable!());
        }

        let data: Value = response.json().await?;
        
        let empty_klines = vec![];
        let klines: Vec<KlineData> = data.as_array()
            .unwrap_or(&empty_klines)
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

    pub async fn simulate_order(&self, order: &OrderRequest, current_market_price: Option<Decimal>) -> Result<Trade, Box<dyn std::error::Error + Send + Sync>> {
        // Enhanced simulation with more realistic market conditions
        let market_price = if let Some(price) = current_market_price {
            price
        } else {
            // Try to get current market price
            match self.get_klines(&order.symbol, "1m", 1).await {
                Ok(klines) if !klines.is_empty() => klines[0].close,
                _ => Decimal::from(67000), // Fallback price
            }
        };
        
        // Simulate slippage for market orders
        let execution_price = match order.order_type {
            OrderType::Market => {
                let slippage_bps = match order.side {
                    TradeSide::Long | TradeSide::Buy => 5, // 0.05% slippage for buy orders
                    TradeSide::Short | TradeSide::Sell => -5, // -0.05% slippage for sell orders
                };
                market_price * (Decimal::from(10000 + slippage_bps) / Decimal::from(10000))
            }
            OrderType::Limit => order.price.unwrap_or(market_price),
        };
        
        let trade = Trade {
            id: uuid::Uuid::new_v4(),
            symbol: order.symbol.clone(),
            side: order.side.clone(),
            order_type: order.order_type.clone(),
            quantity: order.quantity,
            entry_price: execution_price,
            exit_price: None,
            take_profit: order.take_profit_percent.map(|tp| {
                match order.side {
                    TradeSide::Long | TradeSide::Buy => execution_price * (Decimal::from(100) + tp) / Decimal::from(100),
                    TradeSide::Short | TradeSide::Sell => execution_price * (Decimal::from(100) - tp) / Decimal::from(100),
                }
            }),
            stop_loss: order.stop_loss_percent.map(|sl| {
                match order.side {
                    TradeSide::Long | TradeSide::Buy => execution_price * (Decimal::from(100) - sl) / Decimal::from(100),
                    TradeSide::Short | TradeSide::Sell => execution_price * (Decimal::from(100) + sl) / Decimal::from(100),
                }
            }),
            status: TradeStatus::Open,
            created_at: Utc::now(),
            closed_at: None,
            pnl: None,
        };

        Ok(trade)
    }

    fn build_query_string(&self, params: &HashMap<&str, String>) -> String {
        let mut query_parts: Vec<String> = Vec::new();
        let mut sorted_params: Vec<_> = params.iter().collect();
        sorted_params.sort_by_key(|&(k, _)| k);
        
        for (key, value) in sorted_params {
            query_parts.push(format!("{}={}", key, urlencoding::encode(value)));
        }
        query_parts.join("&")
    }

    fn sign_request(&self, query_string: &str, api_secret: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        
        type HmacSha256 = Hmac<Sha256>;
        
        if api_secret.is_empty() {
            return Err("API secret is empty".into());
        }
        
        let mut mac = HmacSha256::new_from_slice(api_secret.as_bytes())
            .map_err(|e| format!("Failed to create HMAC: {}", e))?;
        
        mac.update(query_string.as_bytes());
        Ok(hex::encode(mac.finalize().into_bytes()))
    }

    // Additional helper methods for secure credential management
    pub fn has_valid_credentials(&self) -> bool {
        self.credentials.is_some()
    }

    pub fn get_redacted_credentials(&self) -> Option<SecureApiCredentials> {
        self.credentials.as_ref().map(|c| c.redacted())
    }

    pub async fn update_credentials(&mut self, api_key: String, api_secret: String, testnet: bool, base_url: String) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let credentials = SecureApiCredentials::new(api_key, api_secret, testnet, base_url.clone());
        
        // Store securely
        self.credential_manager.store_credentials(&credentials)?;
        
        // Update instance
        self.credentials = Some(credentials);
        self.base_url = base_url;
        
        // Re-validate base URL
        Self::validate_base_url(&self.base_url)?;
        
        // Sync server time with new endpoint
        self.sync_server_time().await?;
        
        Ok(())
    }

    pub async fn get_all_symbols(&self) -> Result<Vec<SymbolInfo>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/v3/exchangeInfo", self.base_url);
        let endpoint = BinanceEndpoints::get_endpoint_from_url(&url);
        let weight = BinanceEndpoints::get_weight(endpoint);
        
        self.rate_limiter.wait_for_rate_limit(weight).await?;
        
        let response = self.client.get(&url).send().await?;
        
        if !response.status().is_success() {
            return self.handle_api_error_response(response).await.map(|_| unreachable!());
        }
        
        let data: Value = response.json().await?;
        let empty_vec = vec![];
        let symbols = data["symbols"].as_array().unwrap_or(&empty_vec);
        
        let mut result = Vec::new();
        for symbol in symbols {
            if let Some(symbol_info) = self.parse_symbol_info(symbol) {
                result.push(symbol_info);
            }
        }
        
        Ok(result)
    }

    pub async fn search_symbols(&self, query: &str, limit: u32) -> Result<Vec<SymbolInfo>, Box<dyn std::error::Error + Send + Sync>> {
        let all_symbols = self.get_all_symbols().await?;
        let query = query.to_uppercase();
        
        let filtered: Vec<SymbolInfo> = all_symbols
            .into_iter()
            .filter(|s| s.symbol.contains(&query) || s.base_asset.contains(&query) || s.quote_asset.contains(&query))
            .take(limit as usize)
            .collect();
            
        Ok(filtered)
    }

    pub async fn get_24hr_ticker(&self, symbol: &str) -> Result<TickerData, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/v3/ticker/24hr", self.base_url);
        let endpoint = BinanceEndpoints::get_endpoint_from_url(&url);
        let weight = BinanceEndpoints::get_weight(endpoint);
        
        self.rate_limiter.wait_for_rate_limit(weight).await?;
        
        let response = self.client
            .get(&url)
            .query(&[("symbol", symbol.to_uppercase())])
            .send()
            .await?;
            
        if !response.status().is_success() {
            return self.handle_api_error_response(response).await.map(|_| unreachable!());
        }
        
        let data: Value = response.json().await?;
        self.parse_ticker_data(&data).ok_or_else(|| "Failed to parse ticker data".into())
    }

    pub async fn get_order_book(&self, symbol: &str, limit: u32) -> Result<OrderBookDepth, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/v3/depth", self.base_url);
        let endpoint = BinanceEndpoints::get_endpoint_from_url(&url);
        let weight = BinanceEndpoints::get_weight(endpoint);
        
        self.rate_limiter.wait_for_rate_limit(weight).await?;
        
        let response = self.client
            .get(&url)
            .query(&[("symbol", symbol.to_uppercase())])
            .query(&[("limit", limit.to_string())])
            .send()
            .await?;
            
        if !response.status().is_success() {
            return self.handle_api_error_response(response).await.map(|_| unreachable!());
        }
        
        let data: Value = response.json().await?;
        self.parse_order_book(&data, symbol).ok_or_else(|| "Failed to parse order book data".into())
    }


    fn parse_symbol_info(&self, data: &Value) -> Option<SymbolInfo> {
        Some(SymbolInfo {
            symbol: data["symbol"].as_str()?.to_string(),
            base_asset: data["baseAsset"].as_str()?.to_string(),
            quote_asset: data["quoteAsset"].as_str()?.to_string(),
            status: data["status"].as_str()?.to_string(),
            price: None,
            price_change_percent: None,
            volume: None,
            high: None,
            low: None,
            is_spot_trading_allowed: data["isSpotTradingAllowed"].as_bool().unwrap_or(false),
            is_margin_trading_allowed: data["isMarginTradingAllowed"].as_bool().unwrap_or(false),
            filters: Vec::new(), // Simplified for now
        })
    }

    fn parse_ticker_data(&self, data: &Value) -> Option<TickerData> {
        Some(TickerData {
            symbol: data["symbol"].as_str()?.to_string(),
            price: data["lastPrice"].as_str()?.parse().ok()?,
            price_change: data["priceChange"].as_str()?.parse().ok()?,
            price_change_percent: data["priceChangePercent"].as_str()?.parse().ok()?,
            volume: data["volume"].as_str()?.parse().ok()?,
            timestamp: chrono::Utc::now(),
        })
    }

    fn parse_order_book(&self, data: &Value, symbol: &str) -> Option<OrderBookDepth> {
        let bids: Vec<OrderBookLevel> = data["bids"].as_array()?
            .iter()
            .filter_map(|bid| {
                let array = bid.as_array()?;
                Some(OrderBookLevel {
                    price: array[0].as_str()?.parse().ok()?,
                    quantity: array[1].as_str()?.parse().ok()?,
                })
            })
            .collect();

        let asks: Vec<OrderBookLevel> = data["asks"].as_array()?
            .iter()
            .filter_map(|ask| {
                let array = ask.as_array()?;
                Some(OrderBookLevel {
                    price: array[0].as_str()?.parse().ok()?,
                    quantity: array[1].as_str()?.parse().ok()?,
                })
            })
            .collect();

        Some(OrderBookDepth {
            symbol: symbol.to_string(),
            bids,
            asks,
            last_update_id: data["lastUpdateId"].as_u64().unwrap_or(0),
            timestamp: chrono::Utc::now(),
        })
    }

    pub async fn get_market_stats(&self, symbol: &str) -> Result<MarketStats, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/v3/ticker/24hr?symbol={}", self.base_url, symbol);
        
        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch market stats: {}", e))?;
            
        let data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse market stats response: {}", e))?;
            
        Ok(MarketStats {
            symbol: data["symbol"].as_str().unwrap_or(symbol).to_string(),
            price_change: data["priceChange"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            price_change_percent: data["priceChangePercent"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            weighted_avg_price: data["weightedAvgPrice"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            prev_close_price: data["prevClosePrice"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            last_price: data["lastPrice"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            last_qty: data["lastQty"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            bid_price: data["bidPrice"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            ask_price: data["askPrice"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            high: data["highPrice"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            low: data["lowPrice"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            volume: data["volume"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            quote_volume: data["quoteVolume"].as_str()
                .and_then(|s| Decimal::from_str(s).ok())
                .unwrap_or_default(),
            count: data["count"].as_u64().unwrap_or(0),
            open_time: Utc::now(), // TODO: Parse actual timestamp
            close_time: Utc::now(), // TODO: Parse actual timestamp
            price: data["lastPrice"].as_str()
                .and_then(|s| Decimal::from_str(s).ok()) 
                .unwrap_or_default(),
        })
    }

    pub async fn get_order_book_depth(&self, symbol: &str, limit: u32) -> Result<OrderBookDepth, Box<dyn std::error::Error + Send + Sync>> {
        // Delegate to existing method
        self.get_order_book(symbol, limit).await
    }

    pub fn analyze_market_depth(&self, order_book: &OrderBookDepth) -> Result<MarketDepthAnalysis, Box<dyn std::error::Error + Send + Sync>> {
        if order_book.bids.is_empty() || order_book.asks.is_empty() {
            return Err("Order book has no bids or asks".into());
        }
        
        let best_bid = order_book.bids.first().map(|b| b.price).unwrap_or(Decimal::ZERO);
        let best_ask = order_book.asks.first().map(|a| a.price).unwrap_or(Decimal::ZERO);
        
        let spread = if best_ask > Decimal::ZERO && best_bid > Decimal::ZERO {
            best_ask - best_bid
        } else {
            Decimal::ZERO
        };
        
        let spread_percentage = if best_bid > Decimal::ZERO {
            (spread / best_bid * Decimal::from(100)).to_f64().unwrap_or(0.0)
        } else {
            0.0
        };
        
        let total_bid_volume: f64 = order_book.bids.iter().map(|b| b.quantity).sum();
        let total_ask_volume: f64 = order_book.asks.iter().map(|a| a.quantity).sum();
        
        let imbalance_ratio = if total_ask_volume > 0.0 {
            total_bid_volume / total_ask_volume
        } else {
            0.0
        };
        
        let market_pressure = if imbalance_ratio > 1.2 {
            "Bullish".to_string()
        } else if imbalance_ratio < 0.8 {
            "Bearish".to_string()
        } else {
            "Neutral".to_string()
        };
        
        Ok(MarketDepthAnalysis {
            spread,
            spread_percentage,
            total_bid_volume,
            total_ask_volume,
            imbalance_ratio,
            market_pressure,
            depth_analysis: format!("Spread: {:.4}, Imbalance: {:.2}, Pressure: {}", spread, imbalance_ratio, market_pressure),
        })
    }

    pub fn detect_liquidity_levels(&self, _order_book: &OrderBookDepth) -> Result<Vec<LiquidityLevel>, Box<dyn std::error::Error + Send + Sync>> {
        // Stub implementation
        Ok(Vec::new())
    }
}

// Add URL encoding dependency
mod urlencoding {
    pub fn encode(input: &str) -> String {
        url::form_urlencoded::byte_serialize(input.as_bytes()).collect()
    }
}