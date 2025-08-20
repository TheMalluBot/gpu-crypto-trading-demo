import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Shield, AlertTriangle, 
  CheckCircle2, Info, Settings, RefreshCw, Calculator, IndianRupee,
  Percent, Activity, PieChart, BarChart3, Wallet, ArrowUpRight,
  ArrowDownRight, Clock, Zap, Target, Award, Filter
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, 
         Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
         RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

// Types and Interfaces
interface CryptoToken {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  selected: boolean;
  allocation: number; // Percentage of portfolio
  profitability: number; // AI-calculated profitability score
  risk: number; // Risk score 0-100
  momentum: number; // Momentum indicator
  volatility: number;
  correlation: number; // Correlation with portfolio
  technicalScore: number; // Technical analysis score
  fundamentalScore: number; // Fundamental analysis score
  sentimentScore: number; // Market sentiment score
}

interface PortfolioConfig {
  // Investment Settings
  totalInvestment: number;
  currency: 'INR' | 'USD' | 'USDT';
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'auto';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  
  // Profit Maintenance
  targetProfit: number; // Target profit percentage
  stopLoss: number; // Stop loss percentage
  trailingStop: boolean;
  trailingStopPercent: number;
  profitLockThreshold: number; // Lock profits after this %
  
  // Tax Configuration (Indian)
  enableTDS: boolean;
  tdsRate: number; // Default 1% for crypto in India
  considerSTCG: boolean; // Short Term Capital Gains
  stcgRate: number; // 30% for crypto in India
  considerLTCG: boolean; // Long Term Capital Gains
  ltcgRate: number; // 30% for crypto (no LTCG benefit for crypto in India)
  
  // Binance Fee Structure
  tradingFeeRate: number; // Default 0.1%
  useBNBDiscount: boolean; // 25% discount if using BNB
  vipLevel: number; // VIP level 0-9
  makerFee: number;
  takerFee: number;
  
  // Auto-Trading Settings
  autoRebalance: boolean;
  autoCompound: boolean;
  maxPositions: number;
  minPositionSize: number;
  maxPositionSize: number;
  
  // Risk Management
  maxDrawdown: number;
  dailyLossLimit: number;
  correlationLimit: number;
  diversificationRatio: number;
}

interface PortfolioStats {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalFees: number;
  totalTax: number;
  netProfit: number;
  sharpeRatio: number;
  sortino: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  bestPerformer: string;
  worstPerformer: string;
  portfolioHealth: number; // 0-100 score
}

interface TaxCalculation {
  grossProfit: number;
  tdsAmount: number;
  stcgAmount: number;
  ltcgAmount: number;
  totalTax: number;
  netProfit: number;
  effectiveTaxRate: number;
}

export const MultiTokenPortfolioManager: React.FC = () => {
  // State Management
  const [tokens, setTokens] = useState<CryptoToken[]>([]);
  const [portfolioConfig, setPortfolioConfig] = useState<PortfolioConfig>({
    totalInvestment: 100000, // ₹1 Lakh default
    currency: 'INR',
    rebalanceFrequency: 'weekly',
    riskTolerance: 'moderate',
    targetProfit: 20,
    stopLoss: 10,
    trailingStop: true,
    trailingStopPercent: 5,
    profitLockThreshold: 15,
    enableTDS: true,
    tdsRate: 1,
    considerSTCG: true,
    stcgRate: 30,
    considerLTCG: false,
    ltcgRate: 30,
    tradingFeeRate: 0.1,
    useBNBDiscount: true,
    vipLevel: 0,
    makerFee: 0.1,
    takerFee: 0.1,
    autoRebalance: true,
    autoCompound: true,
    maxPositions: 10,
    minPositionSize: 5,
    maxPositionSize: 25,
    maxDrawdown: 15,
    dailyLossLimit: 5,
    correlationLimit: 0.7,
    diversificationRatio: 0.3
  });

  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTradingActive, setIsTradingActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M');
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);

  // Popular crypto tokens list
  const availableTokens: Partial<CryptoToken>[] = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'Binance Coin' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'XRP', name: 'Ripple' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'FTM', name: 'Fantom' },
    { symbol: 'NEAR', name: 'NEAR Protocol' },
    { symbol: 'ALGO', name: 'Algorand' },
    { symbol: 'VET', name: 'VeChain' },
    { symbol: 'ICP', name: 'Internet Computer' },
    { symbol: 'FIL', name: 'Filecoin' },
    { symbol: 'SAND', name: 'The Sandbox' },
    { symbol: 'MANA', name: 'Decentraland' }
  ];

  // Initialize tokens with mock data
  useEffect(() => {
    const initTokens = availableTokens.map(token => ({
      ...token,
      price: Math.random() * 1000,
      change24h: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 1000000000,
      marketCap: Math.random() * 100000000000,
      selected: false,
      allocation: 0,
      profitability: Math.random() * 100,
      risk: Math.random() * 100,
      momentum: Math.random() * 100,
      volatility: Math.random() * 50,
      correlation: Math.random(),
      technicalScore: Math.random() * 100,
      fundamentalScore: Math.random() * 100,
      sentimentScore: Math.random() * 100
    } as CryptoToken));
    setTokens(initTokens);
  }, []);

  // Analyze tokens for profitability
  const analyzeTokenProfitability = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // Call Rust backend for AI analysis
      const analysis = await invoke('analyze_token_profitability', {
        tokens: tokens.filter(t => t.selected),
        config: portfolioConfig
      });
      
      // Update tokens with AI recommendations
      // This would come from the backend
      setAiRecommendations([
        "BTC shows strong momentum with 78% profitability score",
        "ETH has low correlation with portfolio, good for diversification",
        "Consider reducing SOL allocation due to high volatility",
        "MATIC shows bullish technical indicators",
        "Current portfolio is over-exposed to DeFi tokens"
      ]);
    } catch (error) {
      console.error('Error analyzing tokens:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [tokens, portfolioConfig]);

  // Calculate tax based on Indian regulations
  const calculateTax = useCallback((profit: number): TaxCalculation => {
    let tdsAmount = 0;
    let stcgAmount = 0;
    let ltcgAmount = 0;
    
    if (portfolioConfig.enableTDS) {
      tdsAmount = profit * (portfolioConfig.tdsRate / 100);
    }
    
    if (portfolioConfig.considerSTCG && profit > 0) {
      stcgAmount = profit * (portfolioConfig.stcgRate / 100);
    }
    
    const totalTax = tdsAmount + stcgAmount + ltcgAmount;
    const netProfit = profit - totalTax;
    const effectiveTaxRate = profit > 0 ? (totalTax / profit) * 100 : 0;
    
    return {
      grossProfit: profit,
      tdsAmount,
      stcgAmount,
      ltcgAmount,
      totalTax,
      netProfit,
      effectiveTaxRate
    };
  }, [portfolioConfig]);

  // Calculate Binance fees
  const calculateBinanceFees = useCallback((tradeAmount: number, isMaker: boolean): number => {
    let feeRate = isMaker ? portfolioConfig.makerFee : portfolioConfig.takerFee;
    
    // Apply BNB discount if enabled
    if (portfolioConfig.useBNBDiscount) {
      feeRate = feeRate * 0.75; // 25% discount
    }
    
    // Apply VIP level discounts
    const vipDiscounts = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45];
    if (portfolioConfig.vipLevel > 0 && portfolioConfig.vipLevel <= 9) {
      feeRate = feeRate * (1 - vipDiscounts[portfolioConfig.vipLevel]);
    }
    
    return (tradeAmount * feeRate) / 100;
  }, [portfolioConfig]);

  // Toggle token selection
  const toggleTokenSelection = (symbol: string) => {
    setTokens(prev => prev.map(token => 
      token.symbol === symbol 
        ? { ...token, selected: !token.selected }
        : token
    ));
  };

  // Update token allocation
  const updateTokenAllocation = (symbol: string, allocation: number) => {
    setTokens(prev => prev.map(token => 
      token.symbol === symbol 
        ? { ...token, allocation: Math.min(100, Math.max(0, allocation)) }
        : token
    ));
  };

  // Auto-allocate based on AI recommendations
  const autoAllocate = useCallback(() => {
    const selectedTokens = tokens.filter(t => t.selected);
    if (selectedTokens.length === 0) return;
    
    // Calculate allocation based on profitability and risk
    const totalScore = selectedTokens.reduce((sum, token) => 
      sum + (token.profitability * (1 - token.risk / 100)), 0
    );
    
    setTokens(prev => prev.map(token => {
      if (!token.selected) return { ...token, allocation: 0 };
      
      const score = token.profitability * (1 - token.risk / 100);
      const allocation = (score / totalScore) * 100;
      
      // Apply min/max position size constraints
      const constrainedAllocation = Math.min(
        portfolioConfig.maxPositionSize,
        Math.max(portfolioConfig.minPositionSize, allocation)
      );
      
      return { ...token, allocation: constrainedAllocation };
    }));
  }, [tokens, portfolioConfig]);

  // Start/Stop Trading Bot
  const toggleTrading = async () => {
    if (isTradingActive) {
      await invoke('stop_portfolio_trading');
      setIsTradingActive(false);
    } else {
      const selectedTokens = tokens.filter(t => t.selected);
      if (selectedTokens.length === 0) {
        alert('Please select at least one token to trade');
        return;
      }
      
      await invoke('start_portfolio_trading', {
        tokens: selectedTokens,
        config: portfolioConfig
      });
      setIsTradingActive(true);
    }
  };

  // Calculate portfolio health score
  const portfolioHealthScore = useMemo(() => {
    const selectedTokens = tokens.filter(t => t.selected);
    if (selectedTokens.length === 0) return 0;
    
    // Factors for health score
    const diversification = Math.min(selectedTokens.length / 5, 1) * 30;
    const avgProfitability = selectedTokens.reduce((sum, t) => sum + t.profitability, 0) / selectedTokens.length * 0.3;
    const avgRisk = (100 - selectedTokens.reduce((sum, t) => sum + t.risk, 0) / selectedTokens.length) * 0.2;
    const correlation = (1 - Math.max(...selectedTokens.map(t => t.correlation))) * 20;
    
    return Math.round(diversification + avgProfitability + avgRisk + correlation);
  }, [tokens]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <PieChart className="w-8 h-8 text-blue-400" />
              Multi-Token Portfolio Manager
              <Badge variant="info">Pro</Badge>
            </h2>
            <p className="text-gray-400 mt-1">
              Intelligent portfolio management with Indian tax compliance & Binance fee optimization
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="sm"
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
            <Button
              onClick={analyzeTokenProfitability}
              variant="secondary"
              size="sm"
              disabled={isAnalyzing}
            >
              <Activity className="w-4 h-4 mr-1" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
            <Button
              onClick={toggleTrading}
              variant={isTradingActive ? 'danger' : 'success'}
              size="sm"
            >
              {isTradingActive ? (
                <>
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Stop Trading
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Start Trading
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Portfolio Health Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Portfolio Health</span>
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <div className="mt-2">
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">{portfolioHealthScore}%</span>
                <Badge variant={portfolioHealthScore > 70 ? 'success' : portfolioHealthScore > 40 ? 'warning' : 'danger'}>
                  {portfolioHealthScore > 70 ? 'Healthy' : portfolioHealthScore > 40 ? 'Fair' : 'Poor'}
                </Badge>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    portfolioHealthScore > 70 ? 'bg-green-500' :
                    portfolioHealthScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${portfolioHealthScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total Investment</span>
              <Wallet className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {portfolioConfig.currency === 'INR' ? '₹' : '$'}
                {portfolioConfig.totalInvestment.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Expected Tax</span>
              <Calculator className="w-4 h-4 text-orange-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {portfolioConfig.stcgRate}%
              </span>
              <span className="text-xs text-gray-500 ml-1">
                + {portfolioConfig.tdsRate}% TDS
              </span>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Trading Fees</span>
              <Percent className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">
                {portfolioConfig.useBNBDiscount ? 
                  (portfolioConfig.tradingFeeRate * 0.75).toFixed(3) : 
                  portfolioConfig.tradingFeeRate}%
              </span>
              {portfolioConfig.useBNBDiscount && (
                <Badge variant="success" size="sm" className="ml-1">
                  BNB Discount
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Portfolio Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Investment Settings */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-300">Investment Settings</h4>
                  
                  <div>
                    <label className="text-sm text-gray-400">Total Investment</label>
                    <input
                      type="number"
                      value={portfolioConfig.totalInvestment}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        totalInvestment: parseFloat(e.target.value) || 0
                      })}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Currency</label>
                    <Select
                      value={portfolioConfig.currency}
                      onChange={(value) => setPortfolioConfig({
                        ...portfolioConfig,
                        currency: value as 'INR' | 'USD' | 'USDT'
                      })}
                      options={[
                        { value: 'INR', label: 'INR (₹)' },
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'USDT', label: 'USDT' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Risk Tolerance</label>
                    <Select
                      value={portfolioConfig.riskTolerance}
                      onChange={(value) => setPortfolioConfig({
                        ...portfolioConfig,
                        riskTolerance: value as any
                      })}
                      options={[
                        { value: 'conservative', label: 'Conservative' },
                        { value: 'moderate', label: 'Moderate' },
                        { value: 'aggressive', label: 'Aggressive' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Target Profit (%)</label>
                    <input
                      type="number"
                      value={portfolioConfig.targetProfit}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        targetProfit: parseFloat(e.target.value) || 0
                      })}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Stop Loss (%)</label>
                    <input
                      type="number"
                      value={portfolioConfig.stopLoss}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        stopLoss: parseFloat(e.target.value) || 0
                      })}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                    />
                  </div>
                </div>

                {/* Tax Configuration */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-300">Indian Tax Configuration</h4>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={portfolioConfig.enableTDS}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        enableTDS: e.target.checked
                      })}
                      className="rounded"
                    />
                    <label className="text-sm text-gray-400">Enable TDS Calculation</label>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">TDS Rate (%)</label>
                    <input
                      type="number"
                      value={portfolioConfig.tdsRate}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        tdsRate: parseFloat(e.target.value) || 0
                      })}
                      disabled={!portfolioConfig.enableTDS}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={portfolioConfig.considerSTCG}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        considerSTCG: e.target.checked
                      })}
                      className="rounded"
                    />
                    <label className="text-sm text-gray-400">Consider STCG</label>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">STCG Rate (%)</label>
                    <input
                      type="number"
                      value={portfolioConfig.stcgRate}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        stcgRate: parseFloat(e.target.value) || 0
                      })}
                      disabled={!portfolioConfig.considerSTCG}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                    />
                  </div>

                  <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
                    <p className="text-xs text-yellow-400">
                      <Info className="w-3 h-3 inline mr-1" />
                      As per Indian tax laws, crypto gains are taxed at 30% + 4% cess.
                      1% TDS is deducted at source for transactions above ₹10,000.
                    </p>
                  </div>
                </div>

                {/* Binance Fee Configuration */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-300">Binance Fee Settings</h4>
                  
                  <div>
                    <label className="text-sm text-gray-400">Base Trading Fee (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={portfolioConfig.tradingFeeRate}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        tradingFeeRate: parseFloat(e.target.value) || 0
                      })}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={portfolioConfig.useBNBDiscount}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        useBNBDiscount: e.target.checked
                      })}
                      className="rounded"
                    />
                    <label className="text-sm text-gray-400">Use BNB for 25% fee discount</label>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">VIP Level (0-9)</label>
                    <input
                      type="number"
                      min="0"
                      max="9"
                      value={portfolioConfig.vipLevel}
                      onChange={(e) => setPortfolioConfig({
                        ...portfolioConfig,
                        vipLevel: parseInt(e.target.value) || 0
                      })}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm text-gray-400">Maker Fee (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={portfolioConfig.makerFee}
                        onChange={(e) => setPortfolioConfig({
                          ...portfolioConfig,
                          makerFee: parseFloat(e.target.value) || 0
                        })}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Taker Fee (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={portfolioConfig.takerFee}
                        onChange={(e) => setPortfolioConfig({
                          ...portfolioConfig,
                          takerFee: parseFloat(e.target.value) || 0
                        })}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token Selection Grid */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Select Tokens for Portfolio
          </h3>
          <Button onClick={autoAllocate} variant="secondary" size="sm">
            <Zap className="w-4 h-4 mr-1" />
            Auto-Allocate
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {tokens.map((token) => (
            <motion.div
              key={token.symbol}
              whileHover={{ scale: 1.02 }}
              className={`
                relative p-3 rounded-lg border-2 cursor-pointer transition-all
                ${token.selected 
                  ? 'bg-blue-900/20 border-blue-500' 
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }
              `}
              onClick={() => toggleTokenSelection(token.symbol)}
            >
              {/* Selection Indicator */}
              <div className="absolute top-2 right-2">
                {token.selected ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />
                )}
              </div>

              {/* Token Info */}
              <div className="pr-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{token.symbol}</span>
                  <Badge 
                    variant={token.change24h > 0 ? 'success' : 'danger'} 
                    size="sm"
                  >
                    {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">{token.name}</div>
                <div className="text-sm mt-1">${token.price.toFixed(2)}</div>
              </div>

              {/* Metrics */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Profitability</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="h-1.5 bg-green-500 rounded-full"
                        style={{ width: `${token.profitability}%` }}
                      />
                    </div>
                    <span className="text-gray-400">{token.profitability.toFixed(0)}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Risk</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 bg-gray-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          token.risk > 70 ? 'bg-red-500' :
                          token.risk > 40 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${token.risk}%` }}
                      />
                    </div>
                    <span className="text-gray-400">{token.risk.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Momentum</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="h-1.5 bg-blue-500 rounded-full"
                        style={{ width: `${token.momentum}%` }}
                      />
                    </div>
                    <span className="text-gray-400">{token.momentum.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Allocation Input */}
              {token.selected && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <label className="text-xs text-gray-500">Allocation %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={token.allocation}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateTokenAllocation(token.symbol, parseFloat(e.target.value) || 0);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full mt-1 px-2 py-1 bg-gray-900 rounded text-sm border border-gray-700"
                    placeholder="0"
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Allocation Summary */}
        {tokens.some(t => t.selected) && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Total Allocation: {tokens.reduce((sum, t) => sum + (t.selected ? t.allocation : 0), 0).toFixed(2)}%
              </span>
              {Math.abs(tokens.reduce((sum, t) => sum + (t.selected ? t.allocation : 0), 0) - 100) > 0.01 && (
                <Badge variant="warning">
                  Allocation should equal 100%
                </Badge>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            AI Recommendations
          </h3>
          <div className="space-y-2">
            {aiRecommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 p-3 bg-blue-900/20 rounded-lg border border-blue-800/50"
              >
                <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                <span className="text-sm text-gray-300">{rec}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Distribution */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Portfolio Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={tokens.filter(t => t.selected && t.allocation > 0).map(t => ({
                  name: t.symbol,
                  value: t.allocation
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {tokens.filter(t => t.selected).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </Card>

        {/* Risk vs Profitability */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Risk vs Profitability Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={tokens.filter(t => t.selected).map(t => ({
              token: t.symbol,
              profitability: t.profitability,
              risk: 100 - t.risk,
              momentum: t.momentum,
              technical: t.technicalScore,
              fundamental: t.fundamentalScore
            }))}>
              <PolarGrid />
              <PolarAngleAxis dataKey="token" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Profitability" dataKey="profitability" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Radar name="Safety" dataKey="risk" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Radar name="Momentum" dataKey="momentum" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Status Bar */}
      {isTradingActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-green-900/90 backdrop-blur-sm rounded-lg p-4 border border-green-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="font-medium">Trading Active</span>
            <Badge variant="success">
              {tokens.filter(t => t.selected).length} Tokens
            </Badge>
          </div>
        </motion.div>
      )}
    </div>
  );
};