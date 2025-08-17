import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { HelpTooltip, TradingTermTooltip } from './HelpTooltip';
import { TrendingUp, TrendingDown, AlertCircle, Shield, Zap, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface TradeFormData {
  side: 'buy' | 'sell';
  amount: string;
  useStopLoss: boolean;
  stopLossPercent: string;
  useTakeProfit: boolean;
  takeProfitPercent: string;
}

export const SimpleTradeForm: React.FC = () => {
  const [formData, setFormData] = useState<TradeFormData>({
    side: 'buy',
    amount: '100',
    useStopLoss: true,
    stopLossPercent: '2',
    useTakeProfit: true,
    takeProfitPercent: '3'
  });

  const [marketData, setMarketData] = useState<MarketData>({
    symbol: 'BTC/USDT',
    price: 45000,
    change24h: 2.5,
    volume24h: 1234567890
  });

  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastTrade, setLastTrade] = useState<any>(null);
  const [balance] = useState(10000); // Paper trading balance

  const quickAmounts = [50, 100, 250, 500, 1000];
  const percentOfBalance = [10, 25, 50, 75, 100];

  useEffect(() => {
    // Fetch real market data
    const fetchMarketData = async () => {
      try {
        const data = await invoke<MarketData>('get_market_data', { symbol: 'BTCUSDT' });
        setMarketData(data);
      } catch (error) {
        // Use mock data if fetch fails
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    setShowConfirmation(true);
  };

  const confirmTrade = async () => {
    setLoading(true);
    setShowConfirmation(false);

    try {
      // Simulate trade execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const trade = {
        side: formData.side,
        amount: parseFloat(formData.amount),
        price: marketData.price,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      };
      
      setLastTrade(trade);
      
      // Reset form
      setFormData(prev => ({ ...prev, amount: '100' }));
      
      // Show success notification
      console.log('Trade executed:', trade);
    } catch (error) {
      console.error('Trade failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePositionSize = () => {
    const amount = parseFloat(formData.amount) || 0;
    return (amount / marketData.price).toFixed(8);
  };

  const calculateRiskReward = () => {
    const amount = parseFloat(formData.amount) || 0;
    const stopLoss = formData.useStopLoss ? (amount * parseFloat(formData.stopLossPercent)) / 100 : 0;
    const takeProfit = formData.useTakeProfit ? (amount * parseFloat(formData.takeProfitPercent)) / 100 : 0;
    
    return {
      risk: stopLoss.toFixed(2),
      reward: takeProfit.toFixed(2),
      ratio: stopLoss > 0 ? (takeProfit / stopLoss).toFixed(2) : '∞'
    };
  };

  const riskReward = calculateRiskReward();

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Market Info Card */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">{marketData.symbol}</h3>
            <p className="text-2xl font-bold">${marketData.price.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${marketData.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {marketData.change24h >= 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500">24h change</p>
          </div>
        </div>
      </Card>

      {/* Main Trade Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Quick Trade
          <TradingTermTooltip term="paper-trading" />
        </h3>
        
        {/* Buy/Sell Toggle */}
        <div className="flex mb-6 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setFormData(prev => ({ ...prev, side: 'buy' }))}
            className={`flex-1 py-3 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              formData.side === 'buy' 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Buy
          </button>
          <button
            onClick={() => setFormData(prev => ({ ...prev, side: 'sell' }))}
            className={`flex-1 py-3 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              formData.side === 'sell' 
                ? 'bg-red-500 text-white shadow-lg' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            Amount (USDT)
            <HelpTooltip content="This is virtual money for practice. Your paper trading balance is $10,000." />
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ≈ {calculatePositionSize()} BTC
          </p>
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {quickAmounts.map(amount => (
            <button
              key={amount}
              onClick={() => setFormData(prev => ({ ...prev, amount: amount.toString() }))}
              className="py-2 px-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            >
              ${amount}
            </button>
          ))}
        </div>

        {/* Percent of Balance Buttons */}
        <div className="flex gap-1 mb-6">
          <span className="text-xs text-gray-500 mr-2">% of balance:</span>
          {percentOfBalance.map(percent => (
            <button
              key={percent}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                amount: ((balance * percent) / 100).toString() 
              }))}
              className="px-3 py-1 text-xs border rounded hover:bg-gray-50 transition-colors"
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Risk Management */}
        <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Risk Management
          </h4>
          
          {/* Stop Loss */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.useStopLoss}
                onChange={(e) => setFormData(prev => ({ ...prev, useStopLoss: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Stop Loss</span>
              <TradingTermTooltip term="stop-loss" />
            </label>
            {formData.useStopLoss && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={formData.stopLossPercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, stopLossPercent: e.target.value }))}
                  className="w-16 px-2 py-1 text-sm border rounded"
                />
                <span className="text-sm">%</span>
              </div>
            )}
          </div>

          {/* Take Profit */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.useTakeProfit}
                onChange={(e) => setFormData(prev => ({ ...prev, useTakeProfit: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Take Profit</span>
              <TradingTermTooltip term="take-profit" />
            </label>
            {formData.useTakeProfit && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={formData.takeProfitPercent}
                  onChange={(e) => setFormData(prev => ({ ...prev, takeProfitPercent: e.target.value }))}
                  className="w-16 px-2 py-1 text-sm border rounded"
                />
                <span className="text-sm">%</span>
              </div>
            )}
          </div>

          {/* Risk/Reward Display */}
          <div className="pt-2 border-t">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Max Risk:</span>
              <span className="text-red-600 font-semibold">-${riskReward.risk}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-600">Potential Reward:</span>
              <span className="text-green-600 font-semibold">+${riskReward.reward}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-600">Risk/Reward Ratio:</span>
              <span className="font-semibold">1:{riskReward.ratio}</span>
            </div>
          </div>
        </div>

        {/* Trade Button */}
        <Button
          onClick={handleSubmit}
          variant={formData.side === 'buy' ? 'primary' : 'danger'}
          className="w-full py-4 text-lg font-semibold"
          disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              {formData.side === 'buy' ? 'Buy' : 'Sell'} BTC
            </>
          )}
        </Button>

        {/* Safety Notice */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-green-800">Paper Trading Mode</p>
              <p className="text-xs text-green-700">
                You're using virtual money. No real funds at risk!
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <TradeConfirmationModal
            formData={formData}
            marketData={marketData}
            onConfirm={confirmTrade}
            onCancel={() => setShowConfirmation(false)}
          />
        )}
      </AnimatePresence>

      {/* Last Trade Info */}
      {lastTrade && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800">Trade Executed!</p>
                <p className="text-xs text-green-700">
                  {lastTrade.side === 'buy' ? 'Bought' : 'Sold'} ${lastTrade.amount} at ${lastTrade.price}
                </p>
              </div>
              <Check className="w-5 h-5 text-green-600" />
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

// Trade Confirmation Modal Component
const TradeConfirmationModal: React.FC<{
  formData: TradeFormData;
  marketData: MarketData;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ formData, marketData, onConfirm, onCancel }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-xl p-6 max-w-md w-full"
      >
        <h3 className="text-lg font-semibold mb-4">Confirm Trade</h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className={`font-semibold ${formData.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
              Market {formData.side === 'buy' ? 'Buy' : 'Sell'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold">${formData.amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price:</span>
            <span className="font-semibold">${marketData.price.toLocaleString()}</span>
          </div>
          {formData.useStopLoss && (
            <div className="flex justify-between">
              <span className="text-gray-600">Stop Loss:</span>
              <span className="text-red-600">{formData.stopLossPercent}%</span>
            </div>
          )}
          {formData.useTakeProfit && (
            <div className="flex justify-between">
              <span className="text-gray-600">Take Profit:</span>
              <span className="text-green-600">{formData.takeProfitPercent}%</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary" className="flex-1">
            Confirm Trade
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Import Loader2 and Check
import { Loader2, Check } from 'lucide-react';