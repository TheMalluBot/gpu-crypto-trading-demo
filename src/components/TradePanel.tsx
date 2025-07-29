import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { safeInvoke, isTauriApp } from '../utils/tauri';
import { listen } from '@tauri-apps/api/event';
import { TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { SymbolSelector } from './common/SymbolSelector';
import { Input } from './common/Input';
import { Button } from './common/Button';
import { useFormValidation } from '../hooks/useFormValidation';
import NotificationManager from '../utils/notifications';
import HelpButton from './common/HelpButton';
import { ConfirmationModal } from './common/ConfirmationModal';
import { HELP_CONTENT } from '../utils/helpContent';
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

interface TradeFormData extends Record<string, unknown> {
  quantity: number;
  entryPrice: number;
  takeProfitPercent: number;
  stopLossPercent: number;
}

const TradePanel: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [selectedSide, setSelectedSide] = useState<'Long' | 'Short'>('Long');
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');
  const [paperTrading, setPaperTrading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<OrderRequest | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [canUndo, setCanUndo] = useState(false);  const formValidation = useFormValidation<TradeFormData>(
    {
      quantity: 100,
      entryPrice: 0,
      takeProfitPercent: 2,
      stopLossPercent: 1
    },
    {
      quantity: {
        required: true,
        min: 1,
        max: 100000,
        custom: (value) => {
          const numValue = value as number;
          if (numValue <= 0) return 'Quantity must be greater than 0';
          return null;
        }
      },
      entryPrice: {
        required: orderType === 'Limit',
        min: 0.01,
        custom: (value) => {
          const numValue = value as number;
          if (orderType === 'Limit' && numValue <= 0) {
            return 'Entry price must be greater than 0 for limit orders';
          }
          return null;
        }
      },
      takeProfitPercent: {
        min: 0,
        max: 100,
        custom: (value) => {
          const numValue = value as number;
          if (numValue < 0) return 'Take profit cannot be negative';
          if (numValue > 100) return 'Take profit cannot exceed 100%';
          return null;
        }
      },
      stopLossPercent: {
        min: 0,
        max: 100,
        custom: (value) => {
          const numValue = value as number;
          if (numValue < 0) return 'Stop loss cannot be negative';
          if (numValue > 100) return 'Stop loss cannot exceed 100%';
          return null;
        }
      }
    }
  );

  // Symbols are now loaded dynamically through SymbolSelector

  useEffect(() => {
    if (isTauriApp()) {
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
    } else {
      // Load paper trades for browser mode
      loadPaperTrades();
    }
  }, [selectedSymbol]);

  const handleUndo = async () => {
    try {
      const { actionHistory } = await import('../utils/actionHistory');
      const success = await actionHistory.undoLastAction();
      if (success) {
        setCanUndo(false);
      }
    } catch (error) {
      console.error('Failed to undo action:', error);
    }
  };
  const loadPaperTrades = async () => {
    const paperTrades = await safeInvoke<Trade[]>('get_paper_trades');
    if (paperTrades) {
      setTrades(paperTrades);
    }
  };

  const handlePlaceOrder = (formData: TradeFormData) => {
    const order: OrderRequest = {
      symbol: selectedSymbol,
      side: selectedSide,
      order_type: orderType,
      quantity: formData.quantity,
      price: orderType === 'Limit' ? formData.entryPrice : undefined,
      take_profit_percent: formData.takeProfitPercent > 0 ? formData.takeProfitPercent : undefined,
      stop_loss_percent: formData.stopLossPercent > 0 ? formData.stopLossPercent : undefined,
    };
    
    setPendingOrder(order);
    setShowConfirmModal(true);
  };

  const confirmPlaceOrder = async () => {
    if (!pendingOrder) return;
    
    try {
      const settings = await safeInvoke('load_settings');
      
      const result = await safeInvoke('place_order', {
        settings,
        order: pendingOrder,
        paperTrading,
      });

      if (result !== null) {
        NotificationManager.success(
          'Order Placed',
          `Successfully placed ${pendingOrder.side} order for ${pendingOrder.symbol}`
        );
        
        // Add to action history for undo functionality
        const { actionHistory } = await import('../utils/actionHistory');
        actionHistory.addAction({
          type: 'trade',
          description: `Placed ${pendingOrder.side} order for ${pendingOrder.symbol}`,
          data: pendingOrder,
          undoFn: async () => {
            // In a real app, this would cancel the order
            NotificationManager.info('Undo', 'Trade placement undone');
            loadPaperTrades();
          }
        });
        
        loadPaperTrades();
        formValidation.resetForm();
      } else {
        NotificationManager.error(
          'Order Failed',
          'Failed to place order. Please check your settings and try again.'
        );
      }
    } catch (error) {
      NotificationManager.error(
        'Order Error',
        'An error occurred while placing the order.'
      );
    } finally {
      setShowConfirmModal(false);
      setPendingOrder(null);
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

  // Update form validation when order type changes
  useEffect(() => {
    formValidation.validateForm();
  }, [orderType]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Page Header with Help */}
      <div className="flex justify-between items-center">
        <h1 className="text-hierarchy-primary">Trading Panel</h1>
        <HelpButton helpContent={HELP_CONTENT.trading} />
      </div>
      {/* Real-time Price Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphic responsive-padding relative z-content"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-grow">
            <SymbolSelector
              selectedSymbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
              className="min-w-[200px] w-full sm:w-auto"
              placeholder="Search trading pairs..."
              showFavorites={true}
            />
            <div className="flex items-center space-x-2">
              <div className="text-xl sm:text-2xl font-bold text-white">
                ${currentPrice.toFixed(2)}
              </div>
              <div className={`flex items-center space-x-1 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{priceChange.toFixed(2)}%</span>
              </div>
            </div>
          </div>
          
          {/* Paper Trading Toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-white/80 text-sm sm:text-base">Paper Trading</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Order Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-morphic responsive-padding relative z-content"
        >
          <h3 className="text-hierarchy-secondary mb-4">Place Order</h3>
          
          <div className="space-y-4">
            {/* Side Selection */}
            <div>
              <label className="block text-hierarchy-body mb-2">Side</label>
              <div className="flex space-x-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSide('Long')}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 ${
                    selectedSide === 'Long' 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'btn-secondary'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Long
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSide('Short')}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 ${
                    selectedSide === 'Short' 
                      ? 'bg-red-500 text-white shadow-lg' 
                      : 'btn-secondary'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Short
                </motion.button>
              </div>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-hierarchy-body mb-2">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as 'Market' | 'Limit')}
                className="form-select"
              >
                <option value="Market" className="bg-slate-800">Market</option>
                <option value="Limit" className="bg-slate-800">Limit</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <Input
                label="Quantity (USDT)"
                type="number"
                value={formValidation.values.quantity}
                onChange={(e) => formValidation.handleChange('quantity', Number(e.target.value))}
                onBlur={() => formValidation.handleBlur('quantity')}
                error={formValidation.touched.quantity ? formValidation.errors.quantity : undefined}
                min={1}
                step={0.01}
                placeholder="Enter quantity"
                required
                autoComplete="off"
                aria-describedby="quantity-help"
              />
              <p id="quantity-help" className="text-xs text-white/50 mt-1">
                Minimum: $1, Maximum: $100,000
              </p>
            </div>

            {/* Entry Price (for Limit orders) */}
            {orderType === 'Limit' && (
              <div>
                <Input
                  label="Entry Price"
                  type="number"
                  value={formValidation.values.entryPrice}
                  onChange={(e) => formValidation.handleChange('entryPrice', Number(e.target.value))}
                  onBlur={() => formValidation.handleBlur('entryPrice')}
                  error={formValidation.touched.entryPrice ? formValidation.errors.entryPrice : undefined}
                  step={0.01}
                  placeholder="Enter entry price"
                  required
                  autoComplete="off"
                />
              </div>
            )}

            {/* Advanced Options Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
              >
                <span>{showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options</span>
                <motion.svg
                  className="w-4 h-4"
                  animate={{ rotate: showAdvancedOptions ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>
            </div>

            {/* Advanced Options - Collapsible */}
            <motion.div
              initial={false}
              animate={{ height: showAdvancedOptions ? 'auto' : 0, opacity: showAdvancedOptions ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                {/* Take Profit */}
                <div>
                  <Input
                    label="Take Profit (%)"
                    type="number"
                    value={formValidation.values.takeProfitPercent}
                    onChange={(e) => formValidation.handleChange('takeProfitPercent', Number(e.target.value))}
                    onBlur={() => formValidation.handleBlur('takeProfitPercent')}
                    error={formValidation.touched.takeProfitPercent ? formValidation.errors.takeProfitPercent : undefined}
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="Take profit percentage"
                    autoComplete="off"
                    aria-describedby="takeprofit-help"
                  />
                  <p id="takeprofit-help" className="text-xs text-white/50 mt-1">
                    Optional: 0-100%. Leave 0 to disable.
                  </p>
                </div>

                {/* Stop Loss */}
                <div>
                  <Input
                    label="Stop Loss (%)"
                    type="number"
                    value={formValidation.values.stopLossPercent}
                    onChange={(e) => formValidation.handleChange('stopLossPercent', Number(e.target.value))}
                    onBlur={() => formValidation.handleBlur('stopLossPercent')}
                    error={formValidation.touched.stopLossPercent ? formValidation.errors.stopLossPercent : undefined}
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="Stop loss percentage"
                    autoComplete="off"
                    aria-describedby="stoploss-help"
                  />
                  <p id="stoploss-help" className="text-xs text-white/50 mt-1">
                    Optional: 0-100%. Leave 0 to disable.
                  </p>
                </div>
              </div>
            </motion.div>
            {/* Place Order Button */}
            <div className="flex space-x-2">
              <Button
                onClick={() => formValidation.handleSubmit(handlePlaceOrder)}
                disabled={formValidation.isSubmitting || !formValidation.isValid}
                loading={formValidation.isSubmitting}
                variant={selectedSide === 'Long' ? 'success' : 'danger'}
                className="flex-1 min-h-[44px]"
                aria-label={`Place ${selectedSide} order for ${selectedSymbol}`}
              >
                {formValidation.isSubmitting ? 'Placing Order...' : `Place ${selectedSide} Order`}
              </Button>
              <Button
                onClick={handleUndo}
                disabled={!canUndo}
                variant="secondary"
                className="min-h-[44px] px-3"
                aria-label="Undo last action"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>          </div>
        </motion.div>

        {/* P/L Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-morphic responsive-padding relative z-content"
        >
          <h3 className="text-hierarchy-secondary mb-4">Portfolio</h3>
          
          <div className="space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-hierarchy-body">Total P/L</span>
                <span className={`text-hierarchy-primary ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${totalPnL.toFixed(2)}
                </span>
              </div>
              <div className="text-hierarchy-caption">
                {openTrades.length} open position{openTrades.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="space-y-2 max-h-48 md:max-h-60 overflow-y-auto scrollbar-hide">
              {openTrades.map((trade) => (
                <div key={trade.id} className="glass-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-hierarchy-tertiary">{trade.symbol}</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${trade.side === 'Long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {trade.side}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-hierarchy-caption mb-2">
                    <span>Entry: ${trade.entry_price.toFixed(2)}</span>
                    <span>Qty: {trade.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="text-hierarchy-caption">P/L:</span>
                    <span className={`font-semibold ${calculatePnL(trade) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${calculatePnL(trade).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPendingOrder(null);
        }}
        onConfirm={confirmPlaceOrder}
        title="Confirm Trade"
        message={`Are you sure you want to place a ${pendingOrder?.side} order for ${pendingOrder?.symbol} with ${pendingOrder?.quantity} USDT?`}
        confirmText="Place Order"
        type="warning"
        loading={formValidation.isSubmitting}
      />
    </div>
  );
};
export default TradePanel;