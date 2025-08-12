use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use std::time::{Duration, Instant};

use crate::models::{TickerData, Trade};
use rust_decimal::Decimal;
use chrono::Utc;

#[derive(Debug, Clone)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Failed,
}

#[derive(Debug, Clone, Copy)]
pub struct ConnectionConfig {
    pub ping_interval: Duration,
    pub pong_timeout: Duration,
    pub reconnect_interval: Duration,
    pub max_reconnect_attempts: u32,
    pub initial_backoff: Duration,
    pub max_backoff: Duration,
}

impl Default for ConnectionConfig {
    fn default() -> Self {
        Self {
            ping_interval: Duration::from_secs(20),     // Send ping every 20 seconds
            pong_timeout: Duration::from_secs(10),      // Wait max 10 seconds for pong
            reconnect_interval: Duration::from_secs(5), // Initial reconnect delay
            max_reconnect_attempts: 10,                 // Max reconnection attempts
            initial_backoff: Duration::from_secs(1),    // Start backoff at 1 second
            max_backoff: Duration::from_secs(300),      // Max backoff of 5 minutes
        }
    }
}

pub struct ImprovedBinanceWebSocket {
    pub current_symbol: Arc<RwLock<String>>,
    pub connection_state: Arc<RwLock<ConnectionState>>,
    pub config: ConnectionConfig,
    pub reconnect_attempts: Arc<RwLock<u32>>,
    pub last_pong: Arc<RwLock<Option<Instant>>>,
    pub shutdown_tx: Arc<RwLock<Option<mpsc::Sender<()>>>>,
}

impl ImprovedBinanceWebSocket {
    pub fn new() -> Self {
        Self::with_config(ConnectionConfig::default())
    }

    pub fn with_config(config: ConnectionConfig) -> Self {
        Self {
            current_symbol: Arc::new(RwLock::new("BTCUSDT".to_string())),
            connection_state: Arc::new(RwLock::new(ConnectionState::Disconnected)),
            config,
            reconnect_attempts: Arc::new(RwLock::new(0)),
            last_pong: Arc::new(RwLock::new(None)),
            shutdown_tx: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn connect(&self, app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.connect_with_retry(app_handle, true).await
    }

    async fn connect_with_retry(&self, app_handle: tauri::AppHandle, reset_attempts: bool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        if reset_attempts {
            *self.reconnect_attempts.write().await = 0;
        }

        *self.connection_state.write().await = ConnectionState::Connecting;

        let symbol = self.current_symbol.read().await.clone();
        let stream_url = self.get_websocket_url(&symbol);
        
        match self.establish_connection(&stream_url, app_handle.clone()).await {
            Ok(()) => {
                *self.connection_state.write().await = ConnectionState::Connected;
                *self.reconnect_attempts.write().await = 0;
                Ok(())
            }
            Err(e) => {
                *self.connection_state.write().await = ConnectionState::Failed;
                eprintln!("WebSocket connection failed: {}", e);
                
                // Start reconnection process
                self.start_reconnection(app_handle).await;
                Err(e)
            }
        }
    }

    async fn establish_connection(&self, url: &str, app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        eprintln!("Connecting to WebSocket: {}", url);
        
        let (ws_stream, _) = connect_async(url).await?;
        let (mut write, mut read) = ws_stream.split();
        
        // Create shutdown channel
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);
        *self.shutdown_tx.write().await = Some(shutdown_tx);

        // Reset pong tracking
        *self.last_pong.write().await = Some(Instant::now());

        // Spawn ping/pong handler
        let ping_handle = self.spawn_ping_handler(write, app_handle.clone()).await;

        // Spawn message handler
        let state = self.connection_state.clone();
        let last_pong = self.last_pong.clone();
        let config = self.config.clone();
        
        let message_handle = app_handle.clone();
        let message_task = tokio::spawn(async move {
            while let Some(msg_result) = read.next().await {
                match msg_result {
                    Ok(Message::Text(text)) => {
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            if let Some(trade) = Self::parse_trade_data(&data) {
                                if let Err(e) = message_handle.emit("trade-update", &trade) {
                                    eprintln!("Failed to emit trade-update event: {}", e);
                                }
                            }
                        }
                    }
                    Ok(Message::Pong(_)) => {
                        *last_pong.write().await = Some(Instant::now());
                    }
                    Ok(Message::Ping(data)) => {
                        // Server sent ping, we should respond with pong
                        // This is handled automatically by tungstenite
                        eprintln!("Received ping from server");
                    }
                    Ok(Message::Close(_)) => {
                        eprintln!("WebSocket connection closed by server");
                        *state.write().await = ConnectionState::Disconnected;
                        break;
                    }
                    Err(e) => {
                        eprintln!("WebSocket error: {}", e);
                        *state.write().await = ConnectionState::Failed;
                        break;
                    }
                    _ => {}
                }
            }
        });

        // Wait for shutdown signal or connection failure
        tokio::select! {
            _ = shutdown_rx.recv() => {
                eprintln!("WebSocket shutdown requested");
            }
            _ = message_task => {
                eprintln!("Message handler ended");
            }
        }
        
        // Clean up tasks
        ping_handle.abort();

        Ok(())
    }

    async fn spawn_ping_handler(&self, mut write: futures_util::stream::SplitSink<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>, Message>, app_handle: tauri::AppHandle) -> tokio::task::JoinHandle<()> {
        let ping_interval = self.config.ping_interval;
        let pong_timeout = self.config.pong_timeout;
        let last_pong = self.last_pong.clone();
        let state = self.connection_state.clone();
        
        tokio::spawn(async move {
            let mut ping_timer = tokio::time::interval(ping_interval);
            let mut ping_counter = 0u64;
            
            loop {
                ping_timer.tick().await;
                
                // Check if we received a pong recently
                if let Some(last_pong_time) = *last_pong.read().await {
                    if Instant::now().duration_since(last_pong_time) > pong_timeout + ping_interval {
                        eprintln!("No pong received within timeout, connection may be dead");
                        *state.write().await = ConnectionState::Failed;
                        break;
                    }
                }
                
                // Send ping
                ping_counter += 1;
                let ping_data = format!("ping_{}", ping_counter).into_bytes();
                
                if let Err(e) = write.send(Message::Ping(ping_data)).await {
                    eprintln!("Failed to send ping: {}", e);
                    *state.write().await = ConnectionState::Failed;
                    break;
                }
            }
        })
    }

    async fn start_reconnection(&self, app_handle: tauri::AppHandle) {
        let attempts = self.reconnect_attempts.clone();
        let state = self.connection_state.clone();
        let config = self.config;
        let symbol = self.current_symbol.clone();
        
        tokio::spawn(async move {
            loop {
                let current_attempts = *attempts.read().await;
                
                if current_attempts >= config.max_reconnect_attempts {
                    eprintln!("Max reconnection attempts reached, giving up");
                    *state.write().await = ConnectionState::Failed;
                    break;
                }

                *attempts.write().await = current_attempts + 1;
                *state.write().await = ConnectionState::Reconnecting;

                // Calculate exponential backoff
                let backoff_duration = std::cmp::min(
                    config.initial_backoff * 2_u32.pow(current_attempts),
                    config.max_backoff,
                );

                eprintln!("Reconnecting in {:?} (attempt {}/{})", 
                         backoff_duration, current_attempts + 1, config.max_reconnect_attempts);

                tokio::time::sleep(backoff_duration).await;

                // Attempt reconnection
                let ws = ImprovedBinanceWebSocket::with_config(config);
                *ws.current_symbol.write().await = symbol.read().await.clone();
                *ws.reconnect_attempts.write().await = current_attempts + 1;

                let current_symbol = ws.current_symbol.read().await.clone();
                match ws.establish_connection(&ws.get_websocket_url(&current_symbol), app_handle.clone()).await {
                    Ok(()) => {
                        eprintln!("Reconnection successful");
                        *state.write().await = ConnectionState::Connected;
                        *attempts.write().await = 0;
                        break;
                    }
                    Err(e) => {
                        eprintln!("Reconnection failed: {}", e);
                        continue;
                    }
                }
            }
        });
    }

    pub async fn change_symbol(&self, symbol: String, app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Shutdown current connection
        self.shutdown().await;
        
        // Update symbol
        *self.current_symbol.write().await = symbol;
        
        // Wait a moment for clean shutdown
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        // Reconnect with new symbol
        self.connect(app_handle).await
    }

    pub async fn shutdown(&self) {
        eprintln!("Shutting down WebSocket connection");
        
        *self.connection_state.write().await = ConnectionState::Disconnected;
        
        if let Some(sender) = self.shutdown_tx.write().await.take() {
            let _ = sender.send(()).await;
        }
    }

    pub async fn get_connection_state(&self) -> ConnectionState {
        self.connection_state.read().await.clone()
    }

    pub async fn is_connected(&self) -> bool {
        matches!(*self.connection_state.read().await, ConnectionState::Connected)
    }

    fn get_websocket_url(&self, symbol: &str) -> String {
        // Use the official Binance WebSocket endpoint for trade stream
        format!("wss://stream.binance.com:9443/ws/{}@trade", symbol.to_lowercase())
    }

    fn parse_ticker_data(data: &Value) -> Option<TickerData> {
        // Handle both ticker stream format and potential error responses
        if let Some(error_code) = data.get("code") {
            eprintln!("WebSocket error: {} - {}", 
                     error_code, 
                     data.get("msg").and_then(|m| m.as_str()).unwrap_or("Unknown error"));
            return None;
        }

        let symbol = data.get("s")?.as_str()?.to_string();
        let price = data.get("c")?.as_str()?.parse::<Decimal>().ok()?;
        let price_change = data.get("p")?.as_str()?.parse::<Decimal>().ok()?;
        let price_change_percent = data.get("P")?.as_str()?.parse::<Decimal>().ok()?;
        let volume = data.get("v")?.as_str()?.parse::<Decimal>().ok()?;

        Some(TickerData {
            symbol,
            price,
            price_change,
            price_change_percent,
            volume,
            timestamp: Utc::now(),
        })
    }

    fn parse_trade_data(data: &Value) -> Option<Trade> {
        // Handle trade stream format and potential error responses
        if let Some(error_code) = data.get("code") {
            eprintln!("WebSocket error: {} - {}", 
                     error_code, 
                     data.get("msg").and_then(|m| m.as_str()).unwrap_or("Unknown error"));
            return None;
        }

        let symbol = data.get("s")?.as_str()?.to_string();
        let price = data.get("p")?.as_str()?.parse::<Decimal>().ok()?;
        let quantity = data.get("q")?.as_str()?.parse::<Decimal>().ok()?;
        let trade_time = data.get("T")?.as_u64()?;
        let is_buyer_maker = data.get("m")?.as_bool().unwrap_or(false);

        Some(Trade {
            symbol,
            price,
            quantity,
            timestamp: chrono::DateTime::from_timestamp_millis(trade_time as i64)
                .unwrap_or_else(|| Utc::now()),
            side: if is_buyer_maker { 
                crate::models::TradeSide::Sell 
            } else { 
                crate::models::TradeSide::Buy 
            },
        })
    }

    // Health check method for monitoring
    pub async fn health_check(&self) -> bool {
        let state = self.connection_state.read().await;
        let last_pong = self.last_pong.read().await;
        
        match &*state {
            ConnectionState::Connected => {
                // Check if we've received a pong recently
                if let Some(last_pong_time) = *last_pong {
                    Instant::now().duration_since(last_pong_time) < self.config.pong_timeout * 2
                } else {
                    false
                }
            }
            _ => false,
        }
    }
}

// Connection statistics for monitoring
#[derive(Debug, Clone)]
pub struct ConnectionStats {
    pub state: ConnectionState,
    pub reconnect_attempts: u32,
    pub last_pong: Option<Duration>, // Time since last pong
    pub uptime: Duration,
}

impl ImprovedBinanceWebSocket {
    pub async fn get_stats(&self) -> ConnectionStats {
        let last_pong_duration = if let Some(last_pong_time) = *self.last_pong.read().await {
            Some(Instant::now().duration_since(last_pong_time))
        } else {
            None
        };

        ConnectionStats {
            state: self.connection_state.read().await.clone(),
            reconnect_attempts: *self.reconnect_attempts.read().await,
            last_pong: last_pong_duration,
            uptime: Duration::from_secs(0), // Would need start time tracking
        }
    }
}
