use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::Manager;

use crate::models::TickerData;
use rust_decimal::Decimal;
use chrono::Utc;

pub struct BinanceWebSocket {
    pub current_symbol: Arc<RwLock<String>>,
    pub is_connected: Arc<RwLock<bool>>,
}

impl BinanceWebSocket {
    pub fn new() -> Self {
        Self {
            current_symbol: Arc::new(RwLock::new("BTCUSDT".to_string())),
            is_connected: Arc::new(RwLock::new(false)),
        }
    }

    pub async fn connect(&self, app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let symbol = self.current_symbol.read().await.clone();
        let stream_url = format!("wss://stream.binance.com:9443/ws/{}@ticker", symbol.to_lowercase());
        
        let (ws_stream, _) = connect_async(&stream_url).await?;
        *self.is_connected.write().await = true;
        
        let (mut write, mut read) = ws_stream.split();
        
        // Send ping to keep connection alive
        let ping_handle = app_handle.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                if let Err(_) = write.send(Message::Ping(vec![])).await {
                    break;
                }
            }
        });

        // Handle incoming messages
        let message_handle = app_handle.clone();
        tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(data) = serde_json::from_str::<Value>(&text) {
                            if let Some(ticker) = Self::parse_ticker_data(&data) {
                                let _ = message_handle.emit_all("ticker-update", &ticker);
                            }
                        }
                    }
                    Ok(Message::Pong(_)) => {
                        // Keep connection alive
                    }
                    Err(_) => {
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    pub async fn change_symbol(&self, symbol: String, app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        *self.current_symbol.write().await = symbol;
        *self.is_connected.write().await = false;
        
        // Reconnect with new symbol
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        self.connect(app_handle).await
    }

    fn parse_ticker_data(data: &Value) -> Option<TickerData> {
        let symbol = data.get("s")?.as_str()?.to_string();
        let price = data.get("c")?.as_str()?.parse::<Decimal>().ok()?;
        let price_change = data.get("P")?.as_str()?.parse::<Decimal>().ok()?;
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
    
    pub async fn shutdown(&self) {
        let manager = self.connection_manager.lock().await;
        if let Some(sender) = &manager.message_sender {
            let _ = sender.send(WebSocketCommand::Shutdown);
        }
        *self.is_connected.write().await = false;
    }
}