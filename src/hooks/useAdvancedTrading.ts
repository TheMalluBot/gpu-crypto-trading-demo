// Advanced Trading Hook - Professional Trading Features
// Phase 3 Week 7 - Advanced Trading Agent Implementation

import { useState, useCallback, useEffect } from 'react';
import { safeInvoke } from '../utils/tauri';

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
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientOrderId?: string;
  riskLimits?: {
    maxPositionSize?: number;
    maxLossPercent?: number;
    maxDrawdown?: number;
    stopLossRequired?: boolean;
  };
}

interface ActiveOrder {
  id: string;
  symbol: string;
  side: string;
  orderType: string;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  price?: number;
  averageFillPrice?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CompletedOrder {
  order: ActiveOrder;
  completionReason: string;
  finalStatus: string;
  completedAt: string;
  totalFee: number;
  netPnl?: number;
}

export const useAdvancedTrading = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<CompletedOrder[]>([]);

  // Initialize the advanced trading engine
  const initializeEngine = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await safeInvoke('initialize_advanced_trading');
      setIsInitialized(true);
      
      // Load initial data
      await Promise.all([
        loadActiveOrders(),
        loadOrderHistory(),
      ]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize advanced trading engine';
      setError(errorMessage);
      console.error('Advanced trading initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load active orders
  const loadActiveOrders = useCallback(async () => {
    try {
      const orders = await safeInvoke<ActiveOrder[]>('get_active_orders');
      if (orders) {
        setActiveOrders(orders);
      }
    } catch (err) {
      console.error('Failed to load active orders:', err);
    }
  }, []);

  // Load order history
  const loadOrderHistory = useCallback(async (limit?: number) => {
    try {
      const orders = await safeInvoke<CompletedOrder[]>('get_order_history', { limit });
      if (orders) {
        setOrderHistory(orders);
      }
    } catch (err) {
      console.error('Failed to load order history:', err);
    }
  }, []);

  // Place an advanced order
  const placeOrder = useCallback(async (orderRequest: AdvancedOrderRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      // Convert order type to the expected format
      const formattedOrderType = (() => {
        switch (orderRequest.orderType.type) {
          case 'Market':
            return { type: 'Market' };
          case 'Limit':
            return { type: 'Limit' };
          case 'StopLoss':
            return {
              type: 'StopLoss',
              stopPrice: orderRequest.orderType.stopPrice,
              limitPrice: orderRequest.orderType.limitPrice,
            };
          case 'TakeProfit':
            return {
              type: 'TakeProfit',
              takeProfitPrice: orderRequest.orderType.takeProfitPrice,
            };
          case 'TrailingStop':
            return {
              type: 'TrailingStop',
              trailAmount: orderRequest.orderType.trailAmount,
              trailPercent: orderRequest.orderType.trailPercent,
            };
          case 'OCO':
            return {
              type: 'OCO',
              stopPrice: orderRequest.orderType.stopPrice,
              limitPrice: orderRequest.orderType.limitPrice,
            };
          case 'Bracket':
            return {
              type: 'Bracket',
              takeProfit: orderRequest.orderType.takeProfit,
              stopLoss: orderRequest.orderType.stopLoss,
            };
          default:
            return { type: 'Market' };
        }
      })();

      const orderDto = {
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        orderType: formattedOrderType,
        quantity: orderRequest.quantity,
        price: orderRequest.price,
        reduceOnly: orderRequest.reduceOnly,
        postOnly: orderRequest.postOnly,
        clientOrderId: orderRequest.clientOrderId,
        riskLimits: orderRequest.riskLimits,
      };

      const orderId = await safeInvoke<string>('place_advanced_order', { orderRequest: orderDto });
      
      if (orderId) {
        // Refresh active orders after successful placement
        await loadActiveOrders();
        return orderId;
      } else {
        throw new Error('Failed to place order - no order ID returned');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place advanced order';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadActiveOrders]);

  // Cancel an order
  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await safeInvoke('cancel_advanced_order', { orderId });
      
      // Refresh orders after cancellation
      await Promise.all([
        loadActiveOrders(),
        loadOrderHistory(),
      ]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadActiveOrders, loadOrderHistory]);

  // Emergency stop all trading
  const emergencyStop = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await safeInvoke('emergency_stop_advanced_trading');
      
      // Refresh data after emergency stop
      await Promise.all([
        loadActiveOrders(),
        loadOrderHistory(),
      ]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute emergency stop';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadActiveOrders, loadOrderHistory]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      await Promise.all([
        loadActiveOrders(),
        loadOrderHistory(),
      ]);
    } catch (err) {
      console.error('Failed to refresh advanced trading data:', err);
    }
  }, [isInitialized, loadActiveOrders, loadOrderHistory]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [isInitialized, refreshData]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    activeOrders,
    orderHistory,

    // Actions
    initializeEngine,
    placeOrder,
    cancelOrder,
    emergencyStop,
    refreshData,
    loadActiveOrders,
    loadOrderHistory,
  };
};