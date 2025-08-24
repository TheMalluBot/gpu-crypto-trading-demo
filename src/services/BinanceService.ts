import { WebSocketManager } from './WebSocketManager';
import { invoke } from '@tauri-apps/api/tauri';

export interface BinanceConfig {
  apiKey?: string;
  apiSecret?: string;
  testnet: boolean;
  baseUrl?: string;
  wsUrl?: string;
}

export interface MarketData {
  symbol: string;
  price: string;
  volume: string;
  change24h: string;
  high24h: string;
  low24h: string;
  timestamp: number;
}

export interface OrderBookData {
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
  lastUpdateId: number;
}

export interface TradeData {
  symbol: string;
  price: string;
  quantity: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

class BinanceService {
  private config: BinanceConfig;
  private wsManager: WebSocketManager | null = null;
  private subscriptions: Map<string, Set<string>> = new Map();
  private marketDataCache: Map<string, MarketData> = new Map();
  private orderBookCache: Map<string, OrderBookData> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.config = {
      testnet: true, // Always use testnet for safety
      baseUrl: 'https://testnet.binance.vision/api',
      wsUrl: 'wss://testnet.binance.vision/ws',
    };
  }

  // Configuration
  public async initialize(config?: Partial<BinanceConfig>): Promise<void> {
    // Merge config but force testnet
    this.config = {
      ...this.config,
      ...config,
      testnet: true, // Always force testnet
    };

    // Validate endpoints
    if (!this.config.testnet && this.config.baseUrl?.includes('api.binance.com')) {
      throw new Error('Live trading is disabled. Please use testnet endpoints.');
    }

    // Initialize WebSocket connection
    await this.initializeWebSocket();
  }

  private async initializeWebSocket(): Promise<void> {
    const wsUrl = this.config.wsUrl || 'wss://testnet.binance.vision/ws';
    
    this.wsManager = new WebSocketManager({
      url: wsUrl,
      reconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: this.maxReconnectAttempts,
      heartbeatInterval: 30000,
    });

    // Set up event handlers
    this.wsManager.on('connected', () => {
      console.log('WebSocket connected to Binance');
      this.resubscribeAll();
    });

    this.wsManager.on('disconnected', (data) => {
      console.warn('WebSocket disconnected:', data);
    });

    this.wsManager.on('message', (message) => {
      this.handleWebSocketMessage(message);
    });

    this.wsManager.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.wsManager.on('reconnecting', ({ attempt, maxAttempts }) => {
      console.log(`Reconnecting... Attempt ${attempt}/${maxAttempts}`);
    });

    this.wsManager.connect();
  }

  // Market Data Methods
  public async getMarketPrice(symbol: string): Promise<MarketData> {
    try {
      const response = await invoke<any>('get_market_data', { 
        symbol: symbol.toUpperCase() 
      });
      
      const marketData: MarketData = {
        symbol: response.symbol,
        price: response.price,
        volume: response.volume || '0',
        change24h: response.priceChangePercent || '0',
        high24h: response.highPrice || response.price,
        low24h: response.lowPrice || response.price,
        timestamp: Date.now(),
      };

      this.marketDataCache.set(symbol, marketData);
      return marketData;
    } catch (error) {
      console.error('Error fetching market price:', error);
      
      // Return cached data if available
      const cached = this.marketDataCache.get(symbol);
      if (cached) {
        return cached;
      }
      
      throw new Error(`Failed to fetch market data for ${symbol}`);
    }
  }

  public async getOrderBook(symbol: string, limit = 20): Promise<OrderBookData> {
    try {
      const response = await invoke<any>('get_order_book', { 
        symbol: symbol.toUpperCase(),
        limit 
      });
      
      const orderBook: OrderBookData = {
        bids: response.bids || [],
        asks: response.asks || [],
        lastUpdateId: response.lastUpdateId || Date.now(),
      };

      this.orderBookCache.set(symbol, orderBook);
      return orderBook;
    } catch (error) {
      console.error('Error fetching order book:', error);
      
      const cached = this.orderBookCache.get(symbol);
      if (cached) {
        return cached;
      }
      
      throw new Error(`Failed to fetch order book for ${symbol}`);
    }
  }

  public async getKlines(
    symbol: string, 
    interval: string = '1h', 
    limit = 100
  ): Promise<KlineData[]> {
    try {
      const response = await invoke<any[]>('get_klines', { 
        symbol: symbol.toUpperCase(),
        interval,
        limit 
      });
      
      return response.map(kline => ({
        openTime: kline[0],
        open: kline[1],
        high: kline[2],
        low: kline[3],
        close: kline[4],
        volume: kline[5],
        closeTime: kline[6],
      }));
    } catch (error) {
      console.error('Error fetching klines:', error);
      throw new Error(`Failed to fetch klines for ${symbol}`);
    }
  }

  // WebSocket Subscriptions
  public subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): () => void {
    const streamName = `${symbol.toLowerCase()}@ticker`;
    
    if (!this.subscriptions.has(streamName)) {
      this.subscriptions.set(streamName, new Set());
      this.subscribeToBinanceStream(streamName);
    }
    
    const listeners = this.subscriptions.get(streamName)!;
    const wrappedCallback = (data: any) => {
      const marketData: MarketData = {
        symbol: data.s,
        price: data.c,
        volume: data.v,
        change24h: data.P,
        high24h: data.h,
        low24h: data.l,
        timestamp: data.E,
      };
      callback(marketData);
    };
    
    listeners.add(wrappedCallback as any);
    
    // Return unsubscribe function
    return () => {
      listeners.delete(wrappedCallback as any);
      if (listeners.size === 0) {
        this.unsubscribeFromBinanceStream(streamName);
        this.subscriptions.delete(streamName);
      }
    };
  }

  public subscribeToOrderBook(
    symbol: string, 
    callback: (data: OrderBookData) => void
  ): () => void {
    const streamName = `${symbol.toLowerCase()}@depth20@100ms`;
    
    if (!this.subscriptions.has(streamName)) {
      this.subscriptions.set(streamName, new Set());
      this.subscribeToBinanceStream(streamName);
    }
    
    const listeners = this.subscriptions.get(streamName)!;
    const wrappedCallback = (data: any) => {
      const orderBook: OrderBookData = {
        bids: data.bids,
        asks: data.asks,
        lastUpdateId: data.lastUpdateId,
      };
      callback(orderBook);
    };
    
    listeners.add(wrappedCallback as any);
    
    return () => {
      listeners.delete(wrappedCallback as any);
      if (listeners.size === 0) {
        this.unsubscribeFromBinanceStream(streamName);
        this.subscriptions.delete(streamName);
      }
    };
  }

  public subscribeToTrades(symbol: string, callback: (data: TradeData) => void): () => void {
    const streamName = `${symbol.toLowerCase()}@trade`;
    
    if (!this.subscriptions.has(streamName)) {
      this.subscriptions.set(streamName, new Set());
      this.subscribeToBinanceStream(streamName);
    }
    
    const listeners = this.subscriptions.get(streamName)!;
    const wrappedCallback = (data: any) => {
      const trade: TradeData = {
        symbol: data.s,
        price: data.p,
        quantity: data.q,
        time: data.T,
        isBuyerMaker: data.m,
      };
      callback(trade);
    };
    
    listeners.add(wrappedCallback as any);
    
    return () => {
      listeners.delete(wrappedCallback as any);
      if (listeners.size === 0) {
        this.unsubscribeFromBinanceStream(streamName);
        this.subscriptions.delete(streamName);
      }
    };
  }

  // WebSocket Management
  private subscribeToBinanceStream(stream: string): void {
    if (!this.wsManager?.isConnected()) {
      console.warn('WebSocket not connected, queuing subscription:', stream);
      return;
    }

    this.wsManager.send({
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now(),
    });
  }

  private unsubscribeFromBinanceStream(stream: string): void {
    if (!this.wsManager?.isConnected()) {
      return;
    }

    this.wsManager.send({
      method: 'UNSUBSCRIBE',
      params: [stream],
      id: Date.now(),
    });
  }

  private resubscribeAll(): void {
    for (const stream of this.subscriptions.keys()) {
      this.subscribeToBinanceStream(stream);
    }
  }

  private handleWebSocketMessage(message: any): void {
    const { data } = message;
    
    if (!data || !data.stream) {
      return;
    }

    const listeners = this.subscriptions.get(data.stream);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(data.data);
        } catch (error) {
          console.error('Error in subscription callback:', error);
        }
      }
    }
  }

  // Trading Methods (Paper Trading Only)
  public async placePaperOrder(order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
  }): Promise<any> {
    // Always ensure we're in testnet mode
    if (!this.config.testnet) {
      throw new Error('Live trading is disabled. Only paper trading is allowed.');
    }

    try {
      return await invoke('place_paper_order', {
        symbol: order.symbol,
        side: order.side,
        orderType: order.type,
        quantity: order.quantity,
        price: order.price,
      });
    } catch (error) {
      console.error('Error placing paper order:', error);
      throw error;
    }
  }

  public async getPaperBalance(): Promise<any> {
    try {
      return await invoke('get_paper_balance');
    } catch (error) {
      console.error('Error fetching paper balance:', error);
      throw error;
    }
  }

  public async getPaperOrderHistory(): Promise<any[]> {
    try {
      return await invoke('get_paper_order_history');
    } catch (error) {
      console.error('Error fetching paper order history:', error);
      throw error;
    }
  }

  // Cleanup
  public disconnect(): void {
    if (this.wsManager) {
      this.wsManager.disconnect();
      this.wsManager = null;
    }
    
    this.subscriptions.clear();
    this.marketDataCache.clear();
    this.orderBookCache.clear();
  }

  public isConnected(): boolean {
    return this.wsManager?.isConnected() || false;
  }

  public getConnectionStatus() {
    return {
      connected: this.isConnected(),
      testnet: this.config.testnet,
      baseUrl: this.config.baseUrl,
      wsUrl: this.config.wsUrl,
      subscriptions: Array.from(this.subscriptions.keys()),
      cacheSize: {
        marketData: this.marketDataCache.size,
        orderBook: this.orderBookCache.size,
      },
    };
  }
}

// Export singleton instance
export const binanceService = new BinanceService();
export default binanceService;