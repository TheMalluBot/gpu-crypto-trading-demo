use crate::{TradingState};
use crate::models::{AppSettings, OrderRequest, Trade, AccountInfo, KlineData, SymbolInfo, MarketStats, OrderBookDepth, MarketDepthAnalysis, LiquidityLevel};
use crate::binance_client::ImprovedBinanceClient;
use tauri::State;

#[tauri::command]
pub async fn test_connection(settings: AppSettings) -> Result<bool, String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    client.test_connection().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_account_info(settings: AppSettings) -> Result<AccountInfo, String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    client.get_account_info().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_klines(settings: AppSettings, symbol: String, interval: String, limit: u32) -> Result<Vec<KlineData>, String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    client.get_klines(&symbol, &interval, limit).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn place_order(
    settings: AppSettings,
    order: OrderRequest,
    paper_trading: bool,
    trading_state: State<'_, TradingState>
) -> Result<Trade, String> {
    if paper_trading {
        let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
        
        let current_market_price = match client.get_klines(&order.symbol, "1m", 1).await {
            Ok(klines) if !klines.is_empty() => Some(klines[0].close),
            _ => None,
        };
        
        let trade = client.simulate_order(&order, current_market_price).await.map_err(|e| e.to_string())?;
        trading_state.paper_trades.write().await.push(trade.clone());
        Ok(trade)
    } else {
        eprintln!("CRITICAL SAFETY: Live trading attempted but is PERMANENTLY DISABLED");
        return Err("Live trading is permanently disabled for safety. All orders must use paper trading mode.".to_string());
    }
}

#[tauri::command]
pub async fn get_paper_trades(trading_state: State<'_, TradingState>) -> Result<Vec<Trade>, String> {
    let trades = trading_state.paper_trades.read().await;
    Ok(trades.clone())
}

#[tauri::command]
pub async fn change_symbol(symbol: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn get_all_symbols(settings: AppSettings) -> Result<Vec<SymbolInfo>, String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    client.get_all_symbols().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_symbols(settings: AppSettings, query: String, limit: Option<usize>) -> Result<Vec<SymbolInfo>, String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    client.search_symbols(&query, limit.unwrap_or(50) as u32).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_market_stats(settings: AppSettings, symbol: String) -> Result<MarketStats, String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    client.get_market_stats(&symbol).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_popular_symbols(settings: AppSettings) -> Result<Vec<SymbolInfo>, String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    let all_symbols = client.get_all_symbols().await.map_err(|e| e.to_string())?;
    
    let popular_symbols: Vec<SymbolInfo> = all_symbols
        .into_iter()
        .filter(|symbol| {
            ["USDT", "BUSD", "USDC", "BTC", "ETH", "BNB"].contains(&symbol.quote_asset.as_str()) &&
            ["BTC", "ETH", "BNB", "ADA", "DOT", "LINK", "SOL", "MATIC", "AVAX", "ATOM", "NEAR", "FTM", "ALGO", "XRP", "DOGE", "SHIB", "UNI", "AAVE", "SUSHI", "CAKE"].contains(&symbol.base_asset.as_str())
        })
        .take(200)
        .collect();
    
    Ok(popular_symbols)
}

#[tauri::command]
pub async fn get_order_book_depth(
    settings: AppSettings,
    symbol: String,
    limit: Option<u32>
) -> Result<OrderBookDepth, String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    client.get_order_book_depth(&symbol, limit.unwrap_or(100)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn feed_order_book_data(
    order_book: OrderBookDepth,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let settings = AppSettings::default();
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    
    let mut bot = trading_state.swing_bot.write().await;
    bot.add_order_book_data(order_book, &client);
    Ok(())
}

#[tauri::command]
pub async fn start_order_book_feed(
    settings: AppSettings,
    symbol: String,
    trading_state: State<'_, TradingState>
) -> Result<(), String> {
    let client = ImprovedBinanceClient::new(&settings).map_err(|e| e.to_string())?;
    let order_book = client.get_order_book_depth(&symbol, 100).await.map_err(|e| e.to_string())?;
    
    let mut bot = trading_state.swing_bot.write().await;
    bot.add_order_book_data(order_book, &client);
    
    Ok(())
}