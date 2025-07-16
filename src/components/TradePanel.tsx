import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { TrendingUp, TrendingDown, DollarSign, Target, Shield } from 'lucide-react';
import { SymbolSelector } from './common/SymbolSelector';

interface OrderRequest {
  symbol: string;
  side: 'Long' | 'Short';
  order_type: 'Market' | 'Limit';
  quantity: number;
  price?: number;
  take_profit_percent?: number;
  stop_loss_percent?: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'Long' | 'Short';
  order_type: 'Market' | 'Limit';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  take_profit?: number;
  stop_loss?: number;
  status: 'Open' | 'Closed' | 'Cancelled';
  created_at: string;
  closed_at?: string;
  pnl?: number;
}

interface TickerData {
  symbol: string;
  price: number;
  price_change: number;
  price_change_percent: number;
  volume: number;
  timestamp: string;
}

const TradePanel: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedSide, setSelectedSide] = useState<'Long' | 'Short'>('Long');
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');
  const [quantity, setQuantity] = useState<number>(100);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [takeProfitPercent, setTakeProfitPercent] = useState<number>(2);
  const [stopLossPercent, setStopLossPercent] = useState<number>(1);
  const [paperTrading, setPaperTrading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);

  // Symbols are now loaded dynamically through SymbolSelector

  useEffect(() => {
    // Listen for ticker updates
    const unlisten = listen('ticker-update', (event) => {
      const ticker = event.payload as TickerData;
      if (ticker.symbol === selectedSymbol) {
        setCurrentPrice(ticker.price);
        setPriceChange(ticker.price_change_percent);
      }
    });

    // Load paper trades
    loadPaperTrades();

    return () => {
      unlisten.then(fn => fn());
    };
  }, [selectedSymbol]);

  const loadPaperTrades = async () => {
    try {
      const paperTrades = await invoke<Trade[]>('get_paper_trades');
      setTrades(paperTrades);
    } catch (error) {
      console.error('Failed to load paper trades:', error);
    }
  };

  const placeOrder = async () => {
    try {
      setLoading(true);
      
      const settings = await invoke('load_settings');
      
      const order: OrderRequest = {
        symbol: selectedSymbol,
        side: selectedSide,
        order_type: orderType,
        quantity,
        price: orderType === 'Limit' ? entryPrice : undefined,
        take_profit_percent: takeProfitPercent > 0 ? takeProfitPercent : undefined,
        stop_loss_percent: stopLossPercent > 0 ? stopLossPercent : undefined,
      };

      await invoke('place_order', {
        settings,
        order,
        paperTrading,
      });

      // Reload trades after placing order
      loadPaperTrades();
      setLoading(false);
    } catch (error) {
      console.error('Failed to place order:', error);
      setLoading(false);
    }
  };

  const calculatePnL = (trade: Trade) => {
    if (!currentPrice || trade.status === 'Closed') return trade.pnl || 0;
    
    const priceDiff = trade.side === 'Long' 
      ? currentPrice - trade.entry_price
      : trade.entry_price - currentPrice;
    
    return (priceDiff / trade.entry_price) * trade.quantity;
  };

  const openTrades = trades.filter(trade => trade.status === 'Open');
  const totalPnL = openTrades.reduce((sum, trade) => sum + calculatePnL(trade), 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Real-time Price Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SymbolSelector
              selectedSymbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
              className="min-w-[200px]"
              placeholder="Search trading pairs..."
              showFavorites={true}
            />
            <div className="text-2xl font-bold text-white">
              ${currentPrice.toFixed(2)}
            </div>
            <div className={`flex items-center space-x-1 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{priceChange.toFixed(2)}%</span>
            </div>
          </div>
          
          {/* Paper Trading Toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-white/80">Paper Trading</span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPaperTrading(!paperTrading)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                paperTrading ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <motion.div
                className="w-4 h-4 bg-white rounded-full"
                animate={{ x: paperTrading ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Place Order</h3>
          
          <div className="space-y-4">
            {/* Side Selection */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Side</label>
              <div className="flex space-x-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSide('Long')}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                    selectedSide === 'Long' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white/5 text-white/80 border border-white/20'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Long
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSide('Short')}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                    selectedSide === 'Short' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/5 text-white/80 border border-white/20'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Short
                </motion.button>
              </div>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as 'Market' | 'Limit')}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Market" className="bg-slate-800">Market</option>
                <option value="Limit" className="bg-slate-800">Limit</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Quantity (USDT)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            {/* Entry Price (for Limit orders) */}
            {orderType === 'Limit' && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Entry Price</label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
            )}

            {/* Take Profit */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                Take Profit (%)
              </label>
              <input
                type="number"
                value={takeProfitPercent}
                onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.1"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <Shield className="w-4 h-4 inline mr-1" />
                Stop Loss (%)
              </label>
              <input
                type="number"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.1"
              />
            </div>

            {/* Place Order Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={placeOrder}
              disabled={loading || (!paperTrading && quantity <= 0)}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedSide === 'Long'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              } text-white disabled:opacity-50`}
            >
              {loading ? 'Placing Order...' : `Place ${selectedSide} Order`}
            </motion.button>
          </div>
        </motion.div>

        {/* P/L Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Portfolio</h3>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80">Total P/L</span>
                <span className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${totalPnL.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-white/60">
                {openTrades.length} open position{openTrades.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {openTrades.map((trade) => (
                <div key={trade.id} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{trade.symbol}</span>
                    <span className={`text-sm ${trade.side === 'Long' ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.side}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>Entry: ${trade.entry_price.toFixed(2)}</span>
                    <span>Qty: {trade.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">P/L:</span>
                    <span className={`font-medium ${calculatePnL(trade) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${calculatePnL(trade).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TradePanel;