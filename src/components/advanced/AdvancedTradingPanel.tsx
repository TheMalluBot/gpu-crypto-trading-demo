// Advanced Trading Panel - Professional Trading Interface
// Phase 3 Week 7 - Advanced Trading Agent Implementation

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  BarChart3,
  Target,
  AlertTriangle,
  Settings,
  PieChart,
  LineChart,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { useAdvancedTrading } from '../../hooks/useAdvancedTrading';
import { useTechnicalAnalysis } from '../../hooks/useTechnicalAnalysis';
import { usePortfolioMetrics } from '../../hooks/usePortfolioMetrics';
import { useRiskAssessment } from '../../hooks/useRiskAssessment';

interface AdvancedTradingPanelProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

interface AdvancedOrderRequest {
  symbol: string;
  side: 'Buy' | 'Sell' | 'Long' | 'Short';
  orderType: {
    type: 'Market' | 'Limit' | 'StopLoss' | 'TakeProfit' | 'TrailingStop' | 'OCO' | 'Bracket';
    stopPrice?: number;
    limitPrice?: number;
    takeProfitPrice?: number;
    trailAmount?: number;
    trailPercent?: number;
    takeProfit?: number;
    stopLoss?: number;
  };
  quantity: number;
  price?: number;
  riskLimits?: {
    maxPositionSize?: number;
    maxLossPercent?: number;
    maxDrawdown?: number;
    stopLossRequired?: boolean;
  };
}

export const AdvancedTradingPanel: React.FC<AdvancedTradingPanelProps> = ({
  selectedSymbol,
  onSymbolChange,
}) => {
  const [activeTab, setActiveTab] = useState('trading');
  const [orderForm, setOrderForm] = useState<AdvancedOrderRequest>({
    symbol: selectedSymbol,
    side: 'Buy',
    orderType: { type: 'Market' },
    quantity: 100,
  });

  const {
    initializeEngine,
    placeOrder,
    cancelOrder,
    activeOrders,
    orderHistory,
    isInitialized,
    isLoading,
    error,
  } = useAdvancedTrading();

  const { technicalAnalysis, multiTimeframeAnalysis, refreshAnalysis } =
    useTechnicalAnalysis(selectedSymbol);

  const { portfolioMetrics, performanceReport, refreshMetrics } = usePortfolioMetrics();

  const { riskAssessment, assessRisk, riskAlerts } = useRiskAssessment();

  // Initialize advanced trading engine on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeEngine();
    }
  }, [isInitialized, initializeEngine]);

  // Update symbol in order form when selected symbol changes
  useEffect(() => {
    setOrderForm(prev => ({ ...prev, symbol: selectedSymbol }));
  }, [selectedSymbol]);

  const handlePlaceOrder = useCallback(async () => {
    try {
      await placeOrder({
        ...orderForm,
        orderType: orderForm.orderType,
      });
      // Reset form after successful order
      setOrderForm(prev => ({
        ...prev,
        quantity: 100,
        price: undefined,
      }));
    } catch (err) {
      console.error('Failed to place order:', err);
    }
  }, [orderForm, placeOrder]);

  const riskLevel = useMemo(() => {
    if (!riskAssessment) return 'low';
    const totalRisk = riskAssessment.portfolioRisk + riskAssessment.positionRisk;
    if (totalRisk > 15) return 'high';
    if (totalRisk > 8) return 'medium';
    return 'low';
  }, [riskAssessment]);

  const sentimentColor = useMemo(() => {
    if (!technicalAnalysis) return 'text-neutral-400';
    const sentiment = technicalAnalysis.overallSentiment.toLowerCase();
    if (sentiment.includes('bullish')) return 'text-green-400';
    if (sentiment.includes('bearish')) return 'text-red-400';
    return 'text-neutral-400';
  }, [technicalAnalysis]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-neutral-400">Initializing Advanced Trading Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Real-time Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphic p-6"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Advanced Trading</h1>
            </div>
            <Badge
              variant={
                riskLevel === 'high'
                  ? 'destructive'
                  : riskLevel === 'medium'
                    ? 'warning'
                    : 'success'
              }
            >
              Risk: {riskLevel.toUpperCase()}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            {portfolioMetrics && (
              <>
                <div className="text-center">
                  <div className="text-neutral-400">Portfolio Value</div>
                  <div className="font-bold text-white">
                    ${portfolioMetrics.totalValue.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-neutral-400">P&L</div>
                  <div
                    className={`font-bold ${portfolioMetrics.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    ${portfolioMetrics.unrealizedPnl.toFixed(2)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-neutral-400">Sharpe Ratio</div>
                  <div className="font-bold text-white">
                    {portfolioMetrics.sharpeRatio?.toFixed(2) || 'N/A'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Risk Alerts */}
        {riskAlerts && riskAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-medium">Risk Alerts</span>
            </div>
            <div className="space-y-1">
              {riskAlerts.map((alert, index) => (
                <div key={index} className="text-sm text-red-300">
                  {alert.message}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Main Trading Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trading">Order Entry</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="analysis">Technical Analysis</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Order Entry Tab */}
        <TabsContent value="trading" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Form */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Advanced Order Entry</h3>

              <div className="space-y-4">
                {/* Symbol and Side */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Symbol"
                    value={orderForm.symbol}
                    onChange={e => setOrderForm(prev => ({ ...prev, symbol: e.target.value }))}
                    placeholder="BTCUSDT"
                  />
                  <Select
                    label="Side"
                    value={orderForm.side}
                    onValueChange={value => setOrderForm(prev => ({ ...prev, side: value as any }))}
                    options={[
                      { value: 'Buy', label: 'Buy' },
                      { value: 'Sell', label: 'Sell' },
                      { value: 'Long', label: 'Long' },
                      { value: 'Short', label: 'Short' },
                    ]}
                  />
                </div>

                {/* Order Type */}
                <Select
                  label="Order Type"
                  value={orderForm.orderType.type}
                  onValueChange={value =>
                    setOrderForm(prev => ({
                      ...prev,
                      orderType: { ...prev.orderType, type: value as any },
                    }))
                  }
                  options={[
                    { value: 'Market', label: 'Market' },
                    { value: 'Limit', label: 'Limit' },
                    { value: 'StopLoss', label: 'Stop Loss' },
                    { value: 'TakeProfit', label: 'Take Profit' },
                    { value: 'TrailingStop', label: 'Trailing Stop' },
                    { value: 'OCO', label: 'OCO (One-Cancels-Other)' },
                    { value: 'Bracket', label: 'Bracket Order' },
                  ]}
                />

                {/* Quantity and Price */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Quantity (USDT)"
                    type="number"
                    value={orderForm.quantity}
                    onChange={e =>
                      setOrderForm(prev => ({ ...prev, quantity: Number(e.target.value) }))
                    }
                    min={1}
                  />
                  {orderForm.orderType.type === 'Limit' && (
                    <Input
                      label="Price"
                      type="number"
                      value={orderForm.price || ''}
                      onChange={e =>
                        setOrderForm(prev => ({
                          ...prev,
                          price: Number(e.target.value) || undefined,
                        }))
                      }
                      step={0.01}
                    />
                  )}
                </div>

                {/* Advanced Order Parameters */}
                {orderForm.orderType.type === 'StopLoss' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Stop Price"
                      type="number"
                      value={orderForm.orderType.stopPrice || ''}
                      onChange={e =>
                        setOrderForm(prev => ({
                          ...prev,
                          orderType: {
                            ...prev.orderType,
                            stopPrice: Number(e.target.value) || undefined,
                          },
                        }))
                      }
                      step={0.01}
                    />
                    <Input
                      label="Limit Price (Optional)"
                      type="number"
                      value={orderForm.orderType.limitPrice || ''}
                      onChange={e =>
                        setOrderForm(prev => ({
                          ...prev,
                          orderType: {
                            ...prev.orderType,
                            limitPrice: Number(e.target.value) || undefined,
                          },
                        }))
                      }
                      step={0.01}
                    />
                  </div>
                )}

                {orderForm.orderType.type === 'TrailingStop' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Trail Amount"
                      type="number"
                      value={orderForm.orderType.trailAmount || ''}
                      onChange={e =>
                        setOrderForm(prev => ({
                          ...prev,
                          orderType: {
                            ...prev.orderType,
                            trailAmount: Number(e.target.value) || undefined,
                          },
                        }))
                      }
                      step={0.01}
                    />
                    <Input
                      label="Trail Percent (%)"
                      type="number"
                      value={orderForm.orderType.trailPercent || ''}
                      onChange={e =>
                        setOrderForm(prev => ({
                          ...prev,
                          orderType: {
                            ...prev.orderType,
                            trailPercent: Number(e.target.value) || undefined,
                          },
                        }))
                      }
                      step={0.1}
                    />
                  </div>
                )}

                {orderForm.orderType.type === 'Bracket' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Take Profit"
                      type="number"
                      value={orderForm.orderType.takeProfit || ''}
                      onChange={e =>
                        setOrderForm(prev => ({
                          ...prev,
                          orderType: {
                            ...prev.orderType,
                            takeProfit: Number(e.target.value) || undefined,
                          },
                        }))
                      }
                      step={0.01}
                    />
                    <Input
                      label="Stop Loss"
                      type="number"
                      value={orderForm.orderType.stopLoss || ''}
                      onChange={e =>
                        setOrderForm(prev => ({
                          ...prev,
                          orderType: {
                            ...prev.orderType,
                            stopLoss: Number(e.target.value) || undefined,
                          },
                        }))
                      }
                      step={0.01}
                    />
                  </div>
                )}

                {/* Place Order Button */}
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isLoading}
                  className="w-full"
                  variant={
                    orderForm.side === 'Buy' || orderForm.side === 'Long'
                      ? 'success'
                      : 'destructive'
                  }
                >
                  {isLoading ? 'Placing Order...' : `Place ${orderForm.side} Order`}
                </Button>
              </div>
            </Card>

            {/* Market Data and Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Market Overview</h3>

              {technicalAnalysis && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Current Price</span>
                    <span className="font-bold text-white">
                      ${technicalAnalysis.currentPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Trend</span>
                    <div className="flex items-center space-x-2">
                      {technicalAnalysis.trendDirection.includes('Bullish') ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={sentimentColor}>{technicalAnalysis.trendDirection}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">RSI</span>
                    <span
                      className={`font-bold ${
                        technicalAnalysis.rsi > 70
                          ? 'text-red-400'
                          : technicalAnalysis.rsi < 30
                            ? 'text-green-400'
                            : 'text-neutral-400'
                      }`}
                    >
                      {technicalAnalysis.rsi.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Confidence</span>
                    <span className="font-bold text-white">
                      {technicalAnalysis.confidenceScore.toFixed(1)}%
                    </span>
                  </div>

                  {/* Support/Resistance Levels */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-neutral-300">Key Levels</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-red-400 mb-1">Resistance</div>
                        {technicalAnalysis.resistanceLevels.map((level, index) => (
                          <div key={index} className="text-neutral-400">
                            ${level.toFixed(2)}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-green-400 mb-1">Support</div>
                        {technicalAnalysis.supportLevels.map((level, index) => (
                          <div key={index} className="text-neutral-400">
                            ${level.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Active Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Orders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Active Orders</h3>

              <div className="space-y-3">
                {activeOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge
                          variant={
                            order.side === 'Buy' || order.side === 'Long'
                              ? 'success'
                              : 'destructive'
                          }
                        >
                          {order.side}
                        </Badge>
                        <span className="font-medium text-white">{order.symbol}</span>
                      </div>
                      <div className="text-sm text-neutral-400">
                        {order.orderType} • {order.quantity} @{' '}
                        {order.price ? `$${order.price}` : 'Market'}
                      </div>
                    </div>

                    <Button size="sm" variant="outline" onClick={() => cancelOrder(order.id)}>
                      Cancel
                    </Button>
                  </motion.div>
                ))}

                {activeOrders.length === 0 && (
                  <div className="text-center text-neutral-400 py-8">No active orders</div>
                )}
              </div>
            </Card>

            {/* Portfolio Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Portfolio Summary</h3>

              {portfolioMetrics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {portfolioMetrics.positionsCount}
                      </div>
                      <div className="text-sm text-neutral-400">Positions</div>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {portfolioMetrics.winRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-neutral-400">Win Rate</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Total Return</span>
                      <span
                        className={`font-bold ${portfolioMetrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {portfolioMetrics.totalReturn.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Max Drawdown</span>
                      <span className="text-red-400">
                        {portfolioMetrics.maxDrawdown.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Risk Exposure</span>
                      <span className="text-white">
                        {portfolioMetrics.riskExposure.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Other tabs would be implemented similarly... */}
        <TabsContent value="analysis">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Technical Analysis</h3>
            <div className="text-neutral-400">Technical analysis implementation...</div>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Risk Management</h3>
            <div className="text-neutral-400">Risk management implementation...</div>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Analytics</h3>
            <div className="text-neutral-400">Performance analytics implementation...</div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
