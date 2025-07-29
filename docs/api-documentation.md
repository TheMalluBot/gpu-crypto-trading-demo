# Cryptocurrency Trading Application - Tauri Commands API Documentation

## Overview

This document provides comprehensive API documentation for all Tauri commands in the cryptocurrency trading application. The application implements a sophisticated trading system with support for paper trading, advanced order types, risk management, and real-time market analysis.

## Security Notice

⚠️ **CRITICAL SAFETY FEATURE**: Live trading is permanently disabled in this application. All trading operations are restricted to paper trading mode for safety.

## Table of Contents

1. [System Commands](#system-commands)
2. [Settings Commands](#settings-commands)
3. [Trading Commands](#trading-commands)
4. [Advanced Trading Commands](#advanced-trading-commands)
5. [Bot Commands](#bot-commands)
6. [Error Handling](#error-handling)
7. [Data Models](#data-models)
8. [Security Considerations](#security-considerations)

---

## System Commands

### `cpu_stats`

**Description**: Retrieves current CPU utilization statistics.

**Function Signature**:
```rust
pub async fn cpu_stats(state: State<'_, AppState>) -> Result<f32, String>
```

**Parameters**: None

**Returns**: 
- `Success`: CPU load as floating point percentage (0.0-1.0)
- `Error`: String error message

**Usage Example**:
```javascript
const cpuLoad = await invoke('cpu_stats');
console.log(`CPU Load: ${(cpuLoad * 100).toFixed(1)}%`);
```

**Rate Limiting**: None
**Security Considerations**: Read-only system information

---

### `gpu_stats`

**Description**: Retrieves GPU performance metrics including FPS and frame time.

**Function Signature**:
```rust
pub async fn gpu_stats(state: State<'_, AppState>) -> Result<(f32, f32), String>
```

**Parameters**: None

**Returns**: 
- `Success`: Tuple of (fps, gpu_frame_time)
- `Error`: String error message

**Usage Example**:
```javascript
const [fps, frameTime] = await invoke('gpu_stats');
console.log(`FPS: ${fps}, Frame Time: ${frameTime}ms`);
```

**Rate Limiting**: None
**Security Considerations**: Read-only system information

---

### `get_texture_data`

**Description**: Returns minimal texture data for GPU rendering operations.

**Function Signature**:
```rust
pub async fn get_texture_data() -> Result<Vec<u8>, String>
```

**Parameters**: None

**Returns**: 
- `Success`: Vector of texture bytes (512x512x4 black pixels)
- `Error`: String error message

**Usage Example**:
```javascript
const textureData = await invoke('get_texture_data');
console.log(`Texture size: ${textureData.length} bytes`);
```

**Rate Limiting**: None
**Security Considerations**: Returns static data only

---

## Settings Commands

### `save_settings`

**Description**: Persists application settings to local storage.

**Function Signature**:
```rust
pub async fn save_settings(settings: AppSettings) -> Result<(), String>
```

**Parameters**:
- `settings`: AppSettings object containing configuration

**Input Validation**:
- Settings object must be valid JSON
- All required fields must be present

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
const settings = {
    api_key: "your_api_key",
    api_secret: "your_api_secret",
    base_url: "https://api.binance.com",
    testnet: false,
    disable_animations: false
};
await invoke('save_settings', { settings });
```

**Rate Limiting**: None
**Security Considerations**: 
- Credentials are stored locally
- No transmission over network
- File system permissions required

---

### `load_settings`

**Description**: Retrieves saved application settings from local storage.

**Function Signature**:
```rust
pub async fn load_settings() -> Result<AppSettings, String>
```

**Parameters**: None

**Returns**: 
- `Success`: AppSettings object
- `Error`: String error message (returns default settings if file not found)

**Usage Example**:
```javascript
const settings = await invoke('load_settings');
console.log('API Key configured:', !!settings.api_key);
```

**Rate Limiting**: None
**Security Considerations**: 
- Credentials loaded from local storage
- Default settings returned if file missing

---

## Trading Commands

### `test_connection`

**Description**: Tests connectivity to the exchange API without requiring full authentication.

**Function Signature**:
```rust
pub async fn test_connection(settings: AppSettings) -> Result<bool, String>
```

**Parameters**:
- `settings`: AppSettings containing API configuration

**Input Validation**:
- API key required for live trading mode
- Testnet mode allows empty credentials

**Returns**: 
- `Success`: Boolean indicating connection success
- `Error`: String error message with specific failure reason

**Usage Example**:
```javascript
try {
    const isConnected = await invoke('test_connection', { settings });
    console.log('Connection status:', isConnected);
} catch (error) {
    console.error('Connection failed:', error);
}
```

**Rate Limiting**: Exchange-dependent
**Security Considerations**: 
- Minimal API exposure
- Credentials validated before transmission

---

### `get_account_info`

**Description**: Retrieves account information including balances and trading permissions.

**Function Signature**:
```rust
pub async fn get_account_info(settings: AppSettings) -> Result<AccountInfo, String>
```

**Parameters**:
- `settings`: AppSettings with valid API credentials

**Input Validation**:
- Both API key and secret are required
- Non-empty credential validation

**Returns**: 
- `Success`: AccountInfo object with balances and permissions
- `Error`: String error message

**Usage Example**:
```javascript
try {
    const accountInfo = await invoke('get_account_info', { settings });
    console.log('Can trade:', accountInfo.can_trade);
    console.log('Balances:', accountInfo.balances);
} catch (error) {
    console.error('Account info error:', error);
}
```

**Rate Limiting**: High - Exchange enforced
**Security Considerations**: 
- Requires full API permissions
- Sensitive account data exposure

---

### `get_klines`

**Description**: Retrieves candlestick/kline data for technical analysis.

**Function Signature**:
```rust
pub async fn get_klines(
    settings: AppSettings, 
    symbol: String, 
    interval: String, 
    limit: u32
) -> Result<Vec<KlineData>, String>
```

**Parameters**:
- `settings`: API configuration
- `symbol`: Trading pair symbol (e.g., "BTCUSDT")
- `interval`: Time interval (e.g., "1m", "5m", "1h", "1d")
- `limit`: Number of klines to retrieve (1-1000)

**Input Validation**:
- Symbol cannot be empty
- Limit must be between 1 and 1000
- Interval must be valid exchange format

**Returns**: 
- `Success`: Vector of KlineData objects
- `Error`: String error message

**Usage Example**:
```javascript
try {
    const klines = await invoke('get_klines', {
        settings,
        symbol: 'BTCUSDT',
        interval: '1h',
        limit: 100
    });
    console.log(`Retrieved ${klines.length} klines`);
} catch (error) {
    console.error('Klines error:', error);
}
```

**Rate Limiting**: Medium - Exchange dependent
**Security Considerations**: 
- Public market data
- Rate limiting to prevent abuse

---

### `place_order`

**Description**: Places a trading order (PAPER TRADING ONLY).

**Function Signature**:
```rust
pub async fn place_order(
    settings: AppSettings,
    order: OrderRequest,
    paper_trading: bool,
    trading_state: State<'_, TradingState>
) -> Result<Trade, String>
```

**Parameters**:
- `settings`: API configuration
- `order`: OrderRequest with trading parameters
- `paper_trading`: Must be true (live trading disabled)
- `trading_state`: Internal state management

**Input Validation**:
- Symbol cannot be empty
- Quantity must be greater than zero
- Paper trading must be enabled
- Order parameters validated against market rules

**Safety Features**:
- **CRITICAL**: Live trading permanently disabled
- All orders forced to paper trading mode
- Market price validation required

**Returns**: 
- `Success`: Trade object with execution details
- `Error`: String error message

**Usage Example**:
```javascript
try {
    const order = {
        symbol: 'BTCUSDT',
        side: 'Long',
        order_type: 'Market',
        quantity: 0.001,
        price: null,
        take_profit_percent: 2.0,
        stop_loss_percent: 1.0
    };
    
    const trade = await invoke('place_order', {
        settings,
        order,
        paper_trading: true
    });
    
    console.log('Order placed:', trade.id);
} catch (error) {
    console.error('Order error:', error);
}
```

**Rate Limiting**: High - Strict limits to prevent abuse
**Security Considerations**: 
- Live trading permanently disabled
- Paper trading simulation only
- Position size validation

---

### `get_paper_trades`

**Description**: Retrieves all paper trading history.

**Function Signature**:
```rust
pub async fn get_paper_trades(trading_state: State<'_, TradingState>) -> Result<Vec<Trade>, String>
```

**Parameters**:
- `trading_state`: Internal state containing trade history

**Returns**: 
- `Success`: Vector of Trade objects
- `Error`: String error message

**Usage Example**:
```javascript
const trades = await invoke('get_paper_trades');
console.log(`Total paper trades: ${trades.length}`);
```

**Rate Limiting**: None
**Security Considerations**: Local data only

---

### Market Data Commands

#### `get_all_symbols`

**Description**: Retrieves all available trading symbols from the exchange.

**Function Signature**:
```rust
pub async fn get_all_symbols(settings: AppSettings) -> Result<Vec<SymbolInfo>, String>
```

**Parameters**:
- `settings`: API configuration

**Returns**: 
- `Success`: Vector of SymbolInfo objects
- `Error`: String error message

**Usage Example**:
```javascript
const symbols = await invoke('get_all_symbols', { settings });
console.log(`Available symbols: ${symbols.length}`);
```

**Rate Limiting**: Low - Cached data
**Security Considerations**: Public market data

---

#### `search_symbols`

**Description**: Searches for trading symbols matching a query.

**Function Signature**:
```rust
pub async fn search_symbols(
    settings: AppSettings, 
    query: String, 
    limit: Option<usize>
) -> Result<Vec<SymbolInfo>, String>
```

**Parameters**:
- `settings`: API configuration
- `query`: Search term for symbol filtering
- `limit`: Maximum results (default: 50)

**Returns**: 
- `Success`: Vector of matching SymbolInfo objects
- `Error`: String error message

**Usage Example**:
```javascript
const results = await invoke('search_symbols', {
    settings,
    query: 'BTC',
    limit: 20
});
```

**Rate Limiting**: Low
**Security Considerations**: Query input validation

---

#### `get_market_stats`

**Description**: Retrieves 24-hour market statistics for a symbol.

**Function Signature**:
```rust
pub async fn get_market_stats(settings: AppSettings, symbol: String) -> Result<MarketStats, String>
```

**Parameters**:
- `settings`: API configuration
- `symbol`: Trading pair symbol

**Returns**: 
- `Success`: MarketStats object
- `Error`: String error message

**Usage Example**:
```javascript
const stats = await invoke('get_market_stats', {
    settings,
    symbol: 'BTCUSDT'
});
console.log(`24h change: ${stats.price_change_percent}%`);
```

**Rate Limiting**: Medium
**Security Considerations**: Public market data

---

#### `get_popular_symbols`

**Description**: Retrieves a curated list of popular trading symbols.

**Function Signature**:
```rust
pub async fn get_popular_symbols(settings: AppSettings) -> Result<Vec<SymbolInfo>, String>
```

**Parameters**:
- `settings`: API configuration

**Returns**: 
- `Success`: Vector of popular SymbolInfo objects (max 200)
- `Error`: String error message

**Filter Criteria**:
- Quote assets: USDT, BUSD, USDC, BTC, ETH, BNB
- Base assets: Major cryptocurrencies (BTC, ETH, BNB, etc.)

**Usage Example**:
```javascript
const popular = await invoke('get_popular_symbols', { settings });
console.log('Popular symbols loaded:', popular.length);
```

**Rate Limiting**: Low - Filtered from cached data
**Security Considerations**: Curated list only

---

### Order Book Commands

#### `get_order_book_depth`

**Description**: Retrieves order book depth data for market analysis.

**Function Signature**:
```rust
pub async fn get_order_book_depth(
    settings: AppSettings,
    symbol: String,
    limit: Option<u32>
) -> Result<OrderBookDepth, String>
```

**Parameters**:
- `settings`: API configuration
- `symbol`: Trading pair symbol
- `limit`: Depth limit (default: 100, max: 5000)

**Returns**: 
- `Success`: OrderBookDepth object with bids/asks
- `Error`: String error message

**Usage Example**:
```javascript
const orderBook = await invoke('get_order_book_depth', {
    settings,
    symbol: 'BTCUSDT',
    limit: 100
});
console.log(`Best bid: ${orderBook.bids[0].price}`);
console.log(`Best ask: ${orderBook.asks[0].price}`);
```

**Rate Limiting**: High - Real-time data
**Security Considerations**: Public market data

---

## Advanced Trading Commands

### `initialize_advanced_trading`

**Description**: Initializes the advanced trading engine with professional features.

**Function Signature**:
```rust
pub async fn initialize_advanced_trading(
    trading_state: State<'_, TradingState>
) -> Result<(), String>
```

**Parameters**:
- `trading_state`: Trading state management

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
try {
    await invoke('initialize_advanced_trading');
    console.log('Advanced trading engine initialized');
} catch (error) {
    console.error('Initialization failed:', error);
}
```

**Rate Limiting**: None - One-time initialization
**Security Considerations**: 
- Engine initialization required for advanced features
- Memory allocation for trading algorithms

---

### `place_advanced_order`

**Description**: Places an advanced order with professional trading features.

**Function Signature**:
```rust
pub async fn place_advanced_order(
    order_request: AdvancedOrderRequestDto,
    trading_state: State<'_, TradingState>
) -> Result<String, String>
```

**Parameters**:
- `order_request`: Advanced order configuration

**Advanced Order Types**:
- Market
- Limit
- Stop Loss (with optional limit price)
- Take Profit
- Trailing Stop
- OCO (One-Cancels-Other)
- Bracket Orders

**Input Validation**:
- Order side validation (Buy/Sell/Long/Short)
- Quantity and price validation
- Risk limits validation
- Order type specific parameters

**Returns**: 
- `Success`: Order ID string
- `Error`: String error message

**Usage Example**:
```javascript
const advancedOrder = {
    symbol: 'BTCUSDT',
    side: 'Long',
    order_type: {
        type: 'Bracket',
        take_profit: 45000,
        stop_loss: 40000
    },
    quantity: 0.001,
    price: 42000,
    risk_limits: {
        max_position_size: 1000,
        max_loss_percent: 2.0,
        stop_loss_required: true
    }
};

try {
    const orderId = await invoke('place_advanced_order', {
        order_request: advancedOrder
    });
    console.log('Advanced order placed:', orderId);
} catch (error) {
    console.error('Advanced order error:', error);
}
```

**Rate Limiting**: Strict - Complex order validation
**Security Considerations**: 
- Advanced risk management
- Position size limits
- Stop loss enforcement

---

### `cancel_advanced_order`

**Description**: Cancels a specific advanced order.

**Function Signature**:
```rust
pub async fn cancel_advanced_order(
    order_id: String,
    trading_state: State<'_, TradingState>
) -> Result<(), String>
```

**Parameters**:
- `order_id`: Unique order identifier

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
try {
    await invoke('cancel_advanced_order', { order_id: 'order-123' });
    console.log('Order cancelled successfully');
} catch (error) {
    console.error('Cancellation failed:', error);
}
```

**Rate Limiting**: Medium
**Security Considerations**: Order ownership validation

---

### `get_active_orders`

**Description**: Retrieves all active advanced orders.

**Function Signature**:
```rust
pub async fn get_active_orders(
    trading_state: State<'_, TradingState>
) -> Result<Vec<ActiveOrderDto>, String>
```

**Parameters**:
- `trading_state`: Trading state management

**Returns**: 
- `Success`: Vector of ActiveOrderDto objects
- `Error`: String error message

**Usage Example**:
```javascript
const activeOrders = await invoke('get_active_orders');
console.log(`Active orders: ${activeOrders.length}`);
activeOrders.forEach(order => {
    console.log(`${order.symbol}: ${order.side} ${order.quantity}`);
});
```

**Rate Limiting**: Low
**Security Considerations**: User-specific order data

---

### `get_order_history`

**Description**: Retrieves historical completed orders.

**Function Signature**:
```rust
pub async fn get_order_history(
    limit: Option<usize>,
    trading_state: State<'_, TradingState>
) -> Result<Vec<CompletedOrderDto>, String>
```

**Parameters**:
- `limit`: Maximum number of orders to retrieve (optional)

**Returns**: 
- `Success`: Vector of CompletedOrderDto objects
- `Error`: String error message

**Usage Example**:
```javascript
const orderHistory = await invoke('get_order_history', { limit: 50 });
console.log('Order history loaded:', orderHistory.length);
```

**Rate Limiting**: Low
**Security Considerations**: Historical data access

---

### Portfolio Analytics Commands

#### `get_portfolio_metrics`

**Description**: Retrieves comprehensive portfolio performance metrics.

**Function Signature**:
```rust
pub async fn get_portfolio_metrics(
    trading_state: State<'_, TradingState>
) -> Result<PortfolioMetricsDto, String>
```

**Returns**: 
- `Success`: PortfolioMetricsDto with comprehensive metrics
- `Error`: String error message

**Metrics Included**:
- Total portfolio value
- Realized/unrealized PnL
- Sharpe ratio, Sortino ratio
- Maximum drawdown
- Value at Risk (VaR)
- Win rate and profit factor

**Usage Example**:
```javascript
const metrics = await invoke('get_portfolio_metrics');
console.log(`Total Value: $${metrics.total_value}`);
console.log(`Sharpe Ratio: ${metrics.sharpe_ratio}`);
console.log(`Max Drawdown: ${metrics.max_drawdown}%`);
```

**Rate Limiting**: Low - Calculated metrics
**Security Considerations**: Sensitive portfolio data

---

#### `assess_portfolio_risk`

**Description**: Performs comprehensive portfolio risk assessment.

**Function Signature**:
```rust
pub async fn assess_portfolio_risk(
    trading_state: State<'_, TradingState>
) -> Result<RiskAssessmentDto, String>
```

**Returns**: 
- `Success`: RiskAssessmentDto with risk analysis
- `Error`: String error message

**Risk Metrics**:
- Position risk, portfolio risk
- Correlation risk, liquidity risk
- Concentration risk, market risk
- VaR calculations (1-day, 1-week)
- Stress test scenarios
- Risk warnings and recommendations

**Usage Example**:
```javascript
const riskAssessment = await invoke('assess_portfolio_risk');
console.log(`Portfolio Risk Score: ${riskAssessment.portfolio_risk}`);
riskAssessment.risk_warnings.forEach(warning => {
    console.warn(`${warning.severity}: ${warning.message}`);
});
```

**Rate Limiting**: Medium - Complex calculations
**Security Considerations**: Risk calculation accuracy

---

### Technical Analysis Commands

#### `get_technical_analysis`

**Description**: Performs technical analysis on a specific symbol and timeframe.

**Function Signature**:
```rust
pub async fn get_technical_analysis(
    symbol: String,
    timeframe: String,
    trading_state: State<'_, TradingState>
) -> Result<TechnicalAnalysisDto, String>
```

**Parameters**:
- `symbol`: Trading pair symbol
- `timeframe`: Analysis timeframe (1m, 5m, 1h, 4h, 1d)

**Returns**: 
- `Success`: TechnicalAnalysisDto with analysis results
- `Error`: String error message

**Analysis Includes**:
- Trend direction and strength
- RSI, MACD signals
- Bollinger Bands position
- Support/resistance levels
- Trading signals with confidence scores

**Usage Example**:
```javascript
const analysis = await invoke('get_technical_analysis', {
    symbol: 'BTCUSDT',
    timeframe: '1h'
});

console.log(`Trend: ${analysis.trend_direction}`);
console.log(`RSI: ${analysis.rsi}`);
console.log(`Signals: ${analysis.signals.length}`);
```

**Rate Limiting**: Medium - Computational analysis
**Security Considerations**: Market data based analysis

---

#### `multi_timeframe_analysis`

**Description**: Performs technical analysis across multiple timeframes.

**Function Signature**:
```rust
pub async fn multi_timeframe_analysis(
    symbol: String,
    trading_state: State<'_, TradingState>
) -> Result<HashMap<String, TechnicalAnalysisDto>, String>
```

**Parameters**:
- `symbol`: Trading pair symbol

**Returns**: 
- `Success`: HashMap mapping timeframes to analysis results
- `Error`: String error message

**Timeframes Analyzed**:
- 5m, 15m, 1h, 4h, 1d (configurable)

**Usage Example**:
```javascript
const multiAnalysis = await invoke('multi_timeframe_analysis', {
    symbol: 'BTCUSDT'
});

Object.entries(multiAnalysis).forEach(([timeframe, analysis]) => {
    console.log(`${timeframe}: ${analysis.overall_sentiment}`);
});
```

**Rate Limiting**: High - Multiple analyses
**Security Considerations**: Intensive computation

---

### `get_performance_report`

**Description**: Generates comprehensive performance report for a specified period.

**Function Signature**:
```rust
pub async fn get_performance_report(
    period_days: u32,
    trading_state: State<'_, TradingState>
) -> Result<PerformanceReportDto, String>
```

**Parameters**:
- `period_days`: Analysis period in days

**Returns**: 
- `Success`: PerformanceReportDto with detailed metrics
- `Error`: String error message

**Report Includes**:
- Total and annualized returns
- Volatility and Sharpe ratio
- Win rate and trade statistics
- Maximum drawdown
- Value at Risk (95% confidence)

**Usage Example**:
```javascript
const report = await invoke('get_performance_report', {
    period_days: 30
});

console.log(`30-day Return: ${report.total_return}%`);
console.log(`Win Rate: ${report.win_rate}%`);
console.log(`Sharpe Ratio: ${report.sharpe_ratio}`);
```

**Rate Limiting**: Low - Historical analysis
**Security Considerations**: Performance data confidentiality

---

### `emergency_stop_advanced_trading`

**Description**: Immediately stops all advanced trading activities.

**Function Signature**:
```rust
pub async fn emergency_stop_advanced_trading(
    trading_state: State<'_, TradingState>
) -> Result<(), String>
```

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Emergency Actions**:
- Cancel all active orders
- Stop all automated strategies
- Prevent new order placement
- Log emergency stop event

**Usage Example**:
```javascript
// Emergency stop - typically triggered by risk management
try {
    await invoke('emergency_stop_advanced_trading');
    console.log('Emergency stop activated');
    // Notify user interface
} catch (error) {
    console.error('Emergency stop failed:', error);
}
```

**Rate Limiting**: None - Emergency function
**Security Considerations**: 
- Immediate execution priority
- Audit trail requirement

---

## Bot Commands

### `start_swing_bot`

**Description**: Starts the swing trading bot with safety checks and concurrency protection.

**Function Signature**:
```rust
pub async fn start_swing_bot(trading_state: State<'_, TradingState>) -> Result<(), String>
```

**Safety Features**:
- Operation lock prevents concurrent modifications
- Signal processing state verification
- Safety validation before startup

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
try {
    await invoke('start_swing_bot');
    console.log('Swing bot started successfully');
} catch (error) {
    console.error('Bot start failed:', error);
}
```

**Rate Limiting**: None
**Security Considerations**: 
- Concurrent operation prevention
- Safety validation required

---

### `stop_swing_bot`

**Description**: Stops the swing trading bot with proper cleanup.

**Function Signature**:
```rust
pub async fn stop_swing_bot(trading_state: State<'_, TradingState>) -> Result<(), String>
```

**Cleanup Actions**:
- Signal processing termination
- State synchronization
- Resource cleanup

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
await invoke('stop_swing_bot');
console.log('Swing bot stopped');
```

**Rate Limiting**: None
**Security Considerations**: Proper cleanup verification

---

### `pause_swing_bot`

**Description**: Pauses the swing trading bot temporarily.

**Function Signature**:
```rust
pub async fn pause_swing_bot(
    reason: Option<String>, 
    trading_state: State<'_, TradingState>
) -> Result<(), String>
```

**Parameters**:
- `reason`: Optional pause reason for logging

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
await invoke('pause_swing_bot', { 
    reason: 'Market volatility too high' 
});
```

**Rate Limiting**: None
**Security Considerations**: Pause reason logging

---

### `resume_swing_bot`

**Description**: Resumes a paused swing trading bot.

**Function Signature**:
```rust
pub async fn resume_swing_bot(trading_state: State<'_, TradingState>) -> Result<(), String>
```

**Validation**:
- Safety checks before resumption
- State verification
- Configuration validation

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
try {
    await invoke('resume_swing_bot');
    console.log('Bot resumed');
} catch (error) {
    console.error('Resume failed:', error);
}
```

**Rate Limiting**: None
**Security Considerations**: Resume condition validation

---

### `update_bot_config`

**Description**: Updates bot configuration with comprehensive validation.

**Function Signature**:
```rust
pub async fn update_bot_config(
    mut config: LROConfig,
    trading_state: State<'_, TradingState>
) -> Result<(), String>
```

**Parameters**:
- `config`: LROConfig object with trading parameters

**Validation Rules**:
- Paper trading forced to enabled
- Stop loss: 0.1% - 20%
- Take profit: 0.1% - 50%
- Position size must be positive
- Virtual balance must be positive

**Safety Overrides**:
- Paper trading automatically enabled
- Configuration bounds enforcement

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
const config = {
    paper_trading_enabled: true,
    stop_loss_percent: 2.0,
    take_profit_percent: 5.0,
    max_position_size: 1000,
    virtual_balance: 10000
};

try {
    await invoke('update_bot_config', { config });
    console.log('Bot configuration updated');
} catch (error) {
    console.error('Config update failed:', error);
}
```

**Rate Limiting**: Low
**Security Considerations**: 
- Safety parameter enforcement
- Configuration bounds validation

---

### `get_bot_status`

**Description**: Retrieves comprehensive bot status and performance metrics.

**Function Signature**:
```rust
pub async fn get_bot_status(trading_state: State<'_, TradingState>) -> Result<BotStatus, String>
```

**Returns**: 
- `Success`: BotStatus object with comprehensive information
- `Error`: String error message

**Status Information**:
- Bot state (Running, Paused, Stopped)
- Current position details
- Latest trading signals
- Performance metrics
- Safety status indicators
- Circuit breaker information

**Usage Example**:
```javascript
const status = await invoke('get_bot_status');
console.log(`Bot State: ${status.state}`);
console.log(`Current Position: ${status.current_position?.symbol || 'None'}`);
console.log(`Performance: ${status.performance.total_pnl}`);
console.log(`Emergency Stop: ${status.emergency_stop_triggered}`);
```

**Rate Limiting**: None
**Security Considerations**: Status information only

---

### `get_lro_signals`

**Description**: Retrieves recent LRO (Long Range Oscillator) trading signals.

**Function Signature**:
```rust
pub async fn get_lro_signals(
    limit: Option<usize>,
    trading_state: State<'_, TradingState>
) -> Result<Vec<LROSignal>, String>
```

**Parameters**:
- `limit`: Maximum signals to retrieve (default: 50)

**Returns**: 
- `Success`: Vector of LROSignal objects (newest first)
- `Error`: String error message

**Usage Example**:
```javascript
const signals = await invoke('get_lro_signals', { limit: 20 });
signals.forEach(signal => {
    console.log(`${signal.timestamp}: ${signal.signal_type} - ${signal.confidence}`);
});
```

**Rate Limiting**: None
**Security Considerations**: Historical signal data

---

### Safety Commands

#### `trigger_emergency_stop`

**Description**: Triggers emergency stop with specified reason.

**Function Signature**:
```rust
pub async fn trigger_emergency_stop(
    reason: String,
    trading_state: State<'_, TradingState>
) -> Result<(), String>
```

**Parameters**:
- `reason`: Emergency stop reason for audit trail

**Actions**:
- Immediate bot termination
- Position closure (paper trading)
- Activity logging
- State synchronization

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
await invoke('trigger_emergency_stop', {
    reason: 'Unusual market conditions detected'
});
```

**Rate Limiting**: None - Emergency function
**Security Considerations**: 
- Immediate execution
- Comprehensive logging

---

#### `reset_emergency_stop`

**Description**: Resets emergency stop state after manual verification.

**Function Signature**:
```rust
pub async fn reset_emergency_stop(trading_state: State<'_, TradingState>) -> Result<(), String>
```

**Validation**:
- Safety condition verification
- State consistency checks
- Authorization validation

**Returns**: 
- `Success`: Unit type (void)
- `Error`: String error message

**Usage Example**:
```javascript
try {
    await invoke('reset_emergency_stop');
    console.log('Emergency stop reset');
} catch (error) {
    console.error('Reset failed:', error);
}
```

**Rate Limiting**: Manual operation
**Security Considerations**: Reset authorization required

---

### Analytics Commands

#### `get_bot_performance_history`

**Description**: Retrieves historical performance data for analysis.

**Function Signature**:
```rust
pub async fn get_bot_performance_history(
    days: Option<u32>,
) -> Result<Vec<PerformanceDataPoint>, String>
```

**Parameters**:
- `days`: Historical period in days (default: 30)

**Returns**: 
- `Success`: Vector of PerformanceDataPoint objects
- `Error`: String error message

**Data Points**:
- Daily P&L progression
- Cumulative returns
- Drawdown analysis
- Win rate evolution

**Usage Example**:
```javascript
const history = await invoke('get_bot_performance_history', { days: 30 });
history.forEach(point => {
    console.log(`${point.time}: PnL ${point.total_pnl}`);
});
```

**Rate Limiting**: Low
**Security Considerations**: Historical data access

---

#### `analyze_market_conditions`

**Description**: Analyzes current market conditions based on price data.

**Function Signature**:
```rust
pub async fn analyze_market_conditions(
    trading_state: State<'_, TradingState>
) -> Result<MarketConditions, String>
```

**Analysis Metrics**:
- Volatility calculation (standard deviation of returns)
- Trend strength (price momentum analysis)
- Volume profile assessment
- Market regime classification

**Returns**: 
- `Success`: MarketConditions object with analysis
- `Error`: String error message

**Usage Example**:
```javascript
const conditions = await invoke('analyze_market_conditions');
console.log(`Market Regime: ${conditions.market_regime}`);
console.log(`Volatility: ${(conditions.volatility * 100).toFixed(2)}%`);
console.log(`Trend Strength: ${conditions.trend_strength}`);
```

**Rate Limiting**: Medium - Real-time analysis
**Security Considerations**: Market data based calculations

---

## Error Handling

### Error Types

The application implements comprehensive error handling through the `TradingError` enum:

#### API Errors
- **Code**: Exchange-specific error codes
- **Message**: Human-readable error description
- **Endpoint**: Failed API endpoint
- **Retry After**: Optional retry delay

#### Network Errors
- **Timeout**: Request timeout exceeded
- **Connection Failed**: Network connectivity issues
- **DNS Resolution**: Domain name resolution failure
- **SSL Error**: Certificate or encryption issues
- **Rate Limited**: Exchange rate limits exceeded

#### Authentication Errors
- **Invalid API Key**: Malformed or invalid API key
- **Invalid Signature**: Request signature verification failed
- **Timestamp Out of Sync**: Server time synchronization issue
- **Insufficient Permissions**: API key lacks required permissions
- **Credentials Not Found**: Missing API credentials

#### Trading Logic Errors
- **Insufficient Balance**: Account balance too low
- **Invalid Order Size**: Order size outside allowed range
- **Market Closed**: Trading session closed
- **Symbol Not Found**: Invalid trading pair
- **Price Out of Range**: Price outside valid bounds
- **Risk Limit Exceeded**: Risk management threshold breached
- **Emergency Stop Active**: Trading halted by emergency stop

#### Validation Errors
- **Field**: Parameter name that failed validation
- **Message**: Validation failure description
- **Value**: Invalid value provided

### Error Response Format

All errors are returned as strings with detailed information:

```javascript
// Example error handling
try {
    const result = await invoke('place_order', orderParams);
} catch (error) {
    console.error('Order failed:', error);
    
    // Parse error for specific handling
    if (error.includes('Risk Limit Exceeded')) {
        // Handle risk management error
        showRiskAlert(error);
    } else if (error.includes('Rate Limited')) {
        // Handle rate limiting
        setTimeout(() => retryOrder(), 60000);
    }
}
```

---

## Data Models

### Core Trading Models

#### AppSettings
```typescript
interface AppSettings {
    api_key: string;
    api_secret: string;
    base_url: string;
    testnet: boolean;
    disable_animations: boolean;
}
```

#### OrderRequest
```typescript
interface OrderRequest {
    symbol: string;
    side: 'Long' | 'Short';
    order_type: 'Market' | 'Limit';
    quantity: number; // Decimal
    price?: number; // Decimal, optional
    take_profit_percent?: number; // Decimal, optional
    stop_loss_percent?: number; // Decimal, optional
}
```

#### Trade
```typescript
interface Trade {
    id: string; // UUID
    symbol: string;
    side: 'Long' | 'Short';
    order_type: 'Market' | 'Limit';
    quantity: number; // Decimal
    entry_price: number; // Decimal
    exit_price?: number; // Decimal, optional
    take_profit?: number; // Decimal, optional
    stop_loss?: number; // Decimal, optional
    status: 'Open' | 'Closed' | 'Cancelled';
    created_at: string; // ISO 8601
    closed_at?: string; // ISO 8601, optional
    pnl?: number; // Decimal, optional
}
```

### Advanced Trading Models

#### AdvancedOrderRequestDto
```typescript
interface AdvancedOrderRequestDto {
    symbol: string;
    side: 'Buy' | 'Sell' | 'Long' | 'Short';
    order_type: AdvancedOrderTypeDto;
    quantity: number;
    price?: number;
    reduce_only?: boolean;
    post_only?: boolean;
    client_order_id?: string;
    risk_limits?: RiskLimitsDto;
}
```

#### AdvancedOrderTypeDto
```typescript
type AdvancedOrderTypeDto = 
    | { type: 'Market' }
    | { type: 'Limit' }
    | { type: 'StopLoss'; stop_price: number; limit_price?: number }
    | { type: 'TakeProfit'; take_profit_price: number }
    | { type: 'TrailingStop'; trail_amount: number; trail_percent?: number }
    | { type: 'OCO'; stop_price: number; limit_price: number }
    | { type: 'Bracket'; take_profit: number; stop_loss: number };
```

#### PortfolioMetricsDto
```typescript
interface PortfolioMetricsDto {
    total_value: number;
    unrealized_pnl: number;
    realized_pnl: number;
    daily_pnl: number;
    total_return: number;
    sharpe_ratio?: number;
    sortino_ratio?: number;
    max_drawdown: number;
    calmar_ratio?: number;
    value_at_risk: number;
    beta?: number;
    alpha?: number;
    win_rate: number;
    profit_factor: number;
    positions_count: number;
    risk_exposure: number;
}
```

### Market Data Models

#### KlineData
```typescript
interface KlineData {
    open_time: string; // ISO 8601
    close_time: string; // ISO 8601
    open: number; // Decimal
    high: number; // Decimal
    low: number; // Decimal
    close: number; // Decimal
    volume: number; // Decimal
}
```

#### OrderBookDepth
```typescript
interface OrderBookDepth {
    symbol: string;
    last_update_id: number;
    timestamp: string; // ISO 8601
    bids: OrderBookLevel[]; // Highest price first
    asks: OrderBookLevel[]; // Lowest price first
}

interface OrderBookLevel {
    price: number; // Decimal
    quantity: number; // Decimal
}
```

---

## Security Considerations

### 1. Live Trading Protection

**CRITICAL SAFETY MEASURE**: Live trading is permanently disabled at the application level:

- All order placement commands enforce paper trading mode
- Live trading attempts are logged and rejected
- Multiple safety checks prevent accidental live trading
- Configuration overrides ensure paper trading remains enabled

### 2. API Security

**Credential Management**:
- API keys stored locally only
- No credential transmission in logs
- Secure credential validation before API calls
- Testnet mode for development and testing

**Request Security**:
- Request signing for authenticated endpoints
- Timestamp validation to prevent replay attacks
- Rate limiting to prevent API abuse
- Input validation on all parameters

### 3. Risk Management

**Position Limits**:
- Maximum position size enforcement
- Stop loss requirement validation
- Daily loss limits with circuit breakers
- Portfolio exposure monitoring

**Emergency Controls**:
- Emergency stop functionality
- Circuit breaker activation on losses
- Automatic position closure on risk threshold breach
- Manual override capabilities

### 4. Input Validation

**Parameter Validation**:
- Symbol format validation
- Numeric range validation (prices, quantities, percentages)
- Required field verification
- Data type enforcement

**Injection Prevention**:
- SQL injection prevention (N/A - no direct SQL)
- Command injection prevention
- XSS prevention in error messages
- Path traversal prevention in file operations

### 5. Concurrency Control

**Race Condition Prevention**:
- Atomic operations for critical functions
- Mutex locks for bot operations
- Signal processing state management
- Thread-safe data structures

### 6. Audit Trail

**Logging Requirements**:
- All trading decisions logged
- Emergency stop events recorded
- Configuration changes tracked
- Error conditions documented
- Performance metrics archived

### 7. Data Privacy

**Sensitive Data Handling**:
- API credentials encrypted at rest
- Portfolio data access controls
- Trading history confidentiality
- Performance metrics privacy

---

## Rate Limiting

### Exchange Rate Limits

Different endpoints have varying rate limits imposed by the exchange:

- **Public Data** (market data, symbols): 1200 requests/minute
- **Account Information**: 100 requests/minute
- **Order Placement**: 50 requests/minute
- **Order Management**: 100 requests/minute

### Application-Level Limits

Additional rate limiting implemented for safety:

- **Order Placement**: Maximum 10 orders/minute in paper trading
- **Configuration Changes**: 1 change/minute
- **Emergency Operations**: No limits (safety priority)
- **Analytics Requests**: 60 requests/minute

### Rate Limit Handling

```javascript
// Example rate limit handling
try {
    const result = await invoke('place_order', orderParams);
} catch (error) {
    if (error.includes('Rate Limited')) {
        // Wait for suggested delay
        const delay = extractRetryDelay(error) || 60000;
        await new Promise(resolve => setTimeout(resolve, delay));
        // Retry operation
        return invoke('place_order', orderParams);
    }
    throw error;
}
```

---

## Integration Guidelines

### Frontend Integration

1. **Error Handling**: Implement comprehensive error catching for all command invocations
2. **Loading States**: Show loading indicators for long-running operations
3. **Rate Limiting**: Implement client-side rate limiting to prevent abuse
4. **Validation**: Validate inputs on the frontend before sending to backend
5. **Security**: Never expose API credentials in frontend code

### Development Workflow

1. **Testing**: Use testnet mode for all development and testing
2. **Paper Trading**: Verify all trading logic in paper trading mode first
3. **Risk Testing**: Test emergency stop and risk management features
4. **Performance**: Monitor command execution times and optimize as needed
5. **Security**: Regular security audits of command parameters and responses

### Production Deployment

1. **Configuration**: Ensure proper API credentials configuration
2. **Monitoring**: Implement monitoring for command failures and performance
3. **Logging**: Configure appropriate log levels for production
4. **Backup**: Regular backup of trading history and configuration
5. **Updates**: Safe deployment procedures for command updates

---

## Conclusion

This API documentation provides comprehensive coverage of all Tauri commands in the cryptocurrency trading application. The system implements multiple layers of security, robust error handling, and extensive risk management features to ensure safe trading operations.

**Key Security Reminders**:
- Live trading is permanently disabled
- All operations use paper trading simulation
- Multiple safety checks prevent accidental live trading
- Comprehensive audit trail for all operations

For additional support or clarification on any commands, refer to the source code in the respective command modules or contact the development team.

---

*Documentation generated on: 2025-07-28*  
*Application Version: Latest*  
*Security Level: Maximum (Live Trading Disabled)*