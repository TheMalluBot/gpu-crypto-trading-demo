# Trading API Documentation

**Version**: 1.0.0  
**Last Updated**: July 27, 2025  
**Security Level**: Paper Trading Only

## 🎯 Overview

The Trading API provides endpoints for managing trading operations in a **paper trading environment only**. All operations are simulated and no real money is involved.

## 🔐 Authentication

All trading API calls require authentication using API credentials stored securely in the application.

```rust
// Authentication is handled automatically by the secure storage system
// Credentials are encrypted using AES-256-GCM with PBKDF2 key derivation
```

## 📡 Base Endpoints

### Paper Trading Environment
```
Base URL: https://testnet.binance.vision/api/v3/
WebSocket: wss://testnet-stream.binance.vision:9443/ws/
```

⚠️ **IMPORTANT**: Live trading endpoints are blocked in this application for safety.

## 🔄 Trading Operations

### Place Order

Places a paper trading order in the testnet environment.

**Endpoint**: `POST /api/v3/order`

**Parameters**:
```typescript
interface OrderRequest {
  symbol: string;           // Trading pair (e.g., "BTCUSDT")
  side: "BUY" | "SELL";    // Order side
  type: "MARKET" | "LIMIT"; // Order type
  quantity: string;         // Order quantity
  price?: string;          // Price (required for LIMIT orders)
  timeInForce?: string;    // Time in force (GTC, IOC, FOK)
}
```

**Example Request**:
```rust
// Tauri command
#[tauri::command]
async fn place_paper_order(
    symbol: String,
    side: String,
    order_type: String,
    quantity: String,
    price: Option<String>
) -> Result<OrderResponse, String>
```

**Example Response**:
```json
{
  "symbol": "BTCUSDT",
  "orderId": 123456789,
  "orderListId": -1,
  "clientOrderId": "test_order_001",
  "transactTime": 1640995200000,
  "price": "50000.00",
  "origQty": "0.001",
  "executedQty": "0.001",
  "cummulativeQuoteQty": "50.00",
  "status": "FILLED",
  "timeInForce": "GTC",
  "type": "MARKET",
  "side": "BUY"
}
```

### Get Order Status

Retrieves the status of a specific order.

**Endpoint**: `GET /api/v3/order`

**Parameters**:
- `symbol` (string): Trading pair
- `orderId` (number): Order ID

**Example**:
```rust
#[tauri::command]
async fn get_order_status(
    symbol: String,
    order_id: u64
) -> Result<OrderStatus, String>
```

### Cancel Order

Cancels an open order.

**Endpoint**: `DELETE /api/v3/order`

**Parameters**:
- `symbol` (string): Trading pair
- `orderId` (number): Order ID

**Example**:
```rust
#[tauri::command]
async fn cancel_order(
    symbol: String,
    order_id: u64
) -> Result<CancelResponse, String>
```

## 📊 Market Data

### Get Current Price

Retrieves current market price for a symbol.

**Endpoint**: `GET /api/v3/ticker/price`

**Example**:
```rust
#[tauri::command]
async fn get_current_price(symbol: String) -> Result<PriceResponse, String>
```

**Response**:
```json
{
  "symbol": "BTCUSDT",
  "price": "50000.00"
}
```

### Get 24hr Ticker

Retrieves 24-hour ticker statistics.

**Endpoint**: `GET /api/v3/ticker/24hr`

**Example**:
```rust
#[tauri::command]
async fn get_24hr_ticker(symbol: String) -> Result<TickerResponse, String>
```

### Get Kline Data

Retrieves candlestick data for charting.

**Endpoint**: `GET /api/v3/klines`

**Parameters**:
- `symbol` (string): Trading pair
- `interval` (string): Time interval (1m, 5m, 1h, 1d, etc.)
- `limit` (number): Number of klines (max 1000)

**Example**:
```rust
#[tauri::command]
async fn get_klines(
    symbol: String,
    interval: String,
    limit: Option<u16>
) -> Result<Vec<KlineData>, String>
```

## 💰 Account Information

### Get Account Balance

Retrieves current account balance (paper trading).

**Endpoint**: `GET /api/v3/account`

**Example**:
```rust
#[tauri::command]
async fn get_account_balance() -> Result<AccountResponse, String>
```

**Response**:
```json
{
  "balances": [
    {
      "asset": "BTC",
      "free": "0.00100000",
      "locked": "0.00000000"
    },
    {
      "asset": "USDT", 
      "free": "1000.00000000",
      "locked": "0.00000000"
    }
  ]
}
```

### Get Trade History

Retrieves historical trades for the account.

**Endpoint**: `GET /api/v3/myTrades`

**Example**:
```rust
#[tauri::command]
async fn get_trade_history(
    symbol: String,
    limit: Option<u16>
) -> Result<Vec<TradeHistory>, String>
```

## 🔒 Security Features

### Input Validation

All trading inputs are validated before processing:

```rust
// Example validation
pub fn validate_order(order: &OrderRequest) -> Result<(), ValidationError> {
    // Symbol validation
    if order.symbol.is_empty() {
        return Err(ValidationError::new("symbol", "Symbol cannot be empty"));
    }
    
    // Quantity validation
    if order.quantity <= Decimal::ZERO {
        return Err(ValidationError::new("quantity", "Quantity must be greater than zero"));
    }
    
    // Price validation for limit orders
    if order.order_type == OrderType::Limit && order.price.is_none() {
        return Err(ValidationError::new("price", "Price required for limit orders"));
    }
    
    Ok(())
}
```

### Rate Limiting

API calls are rate-limited to prevent abuse:

- **Order endpoints**: 10 requests per second
- **Market data**: 1200 requests per minute
- **Account data**: 180 requests per minute

### Paper Trading Safety

Multiple layers ensure no live trading:

1. **URL Validation**: Only testnet URLs allowed
2. **API Key Validation**: Testnet keys only
3. **Order Validation**: Paper trading mode enforced
4. **UI Indicators**: Clear paper trading indicators

## ❌ Error Handling

### Common Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 1001 | INVALID_SYMBOL | Symbol not found or invalid |
| 1002 | INVALID_QUANTITY | Quantity below minimum or invalid |
| 1003 | INVALID_PRICE | Price below minimum or invalid |
| 1100 | INSUFFICIENT_BALANCE | Not enough balance for order |
| 2010 | NEW_ORDER_REJECTED | Order rejected by exchange |

### Error Response Format

```json
{
  "code": 1001,
  "msg": "Invalid symbol",
  "details": "Symbol 'INVALID' is not supported"
}
```

### Error Handling Example

```rust
match place_paper_order(order).await {
    Ok(response) => println!("Order placed: {:?}", response),
    Err(error) => {
        match error.code {
            1100 => show_insufficient_balance_message(),
            2010 => show_order_rejected_message(&error.msg),
            _ => show_generic_error_message(&error.msg)
        }
    }
}
```

## 🧪 Testing

### Test Orders

Use these test values for paper trading:

```rust
// Test order examples
let test_buy_order = OrderRequest {
    symbol: "BTCUSDT".to_string(),
    side: TradeSide::Buy,
    order_type: OrderType::Market,
    quantity: Decimal::new(1, 3), // 0.001 BTC
    price: None,
    time_in_force: None,
};

let test_limit_order = OrderRequest {
    symbol: "ETHUSDT".to_string(),
    side: TradeSide::Sell,
    order_type: OrderType::Limit,
    quantity: Decimal::new(1, 1), // 0.1 ETH
    price: Some(Decimal::new(2000, 0)), // $2000
    time_in_force: Some("GTC".to_string()),
};
```

## 📚 Code Examples

### Complete Order Flow

```rust
use crypto_trader::trading::{TradingClient, OrderRequest, TradeSide, OrderType};
use rust_decimal::Decimal;

async fn example_trading_flow() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize trading client (paper trading mode)
    let client = TradingClient::new_paper_trading().await?;
    
    // Get current price
    let price = client.get_current_price("BTCUSDT").await?;
    println!("Current BTC price: ${}", price.price);
    
    // Place market buy order
    let order = OrderRequest {
        symbol: "BTCUSDT".to_string(),
        side: TradeSide::Buy,
        order_type: OrderType::Market,
        quantity: Decimal::new(1, 3), // 0.001 BTC
        price: None,
        time_in_force: None,
    };
    
    let response = client.place_order(order).await?;
    println!("Order placed: ID {}", response.order_id);
    
    // Check order status
    let status = client.get_order_status("BTCUSDT", response.order_id).await?;
    println!("Order status: {:?}", status.status);
    
    Ok(())
}
```

---

## 🚨 Important Safety Notes

1. **Paper Trading Only**: This API only supports paper trading with fake money
2. **Testnet Environment**: All operations use Binance testnet
3. **No Live Trading**: Live trading capabilities are disabled for safety
4. **Educational Purpose**: Use for learning and testing only

**Always verify you're in paper trading mode before placing orders!**