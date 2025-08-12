import { useState, useEffect, useMemo } from 'react';
import { safeInvoke } from '../utils/tauri';
import { PaperTrade } from '../types/bot';

export interface TradeRecord {
  id: string;
  timestamp: string;
  symbol: string;
  side: 'Long' | 'Short';
  type: 'Market' | 'Limit' | 'Bot';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  pnl?: number;
  pnl_percentage?: number;
  status: 'Open' | 'Closed' | 'Cancelled';
  strategy?: string;
  notes?: string;
  duration?: string;
  fees: number;
}

export interface TradeFilters {
  symbol: string;
  side: string;
  status: string;
  strategy: string;
  date_from: string;
  date_to: string;
  min_pnl: string;
  max_pnl: string;
}

export const useTrades = () => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrades = async () => {
    setLoading(true);
    setError(null);

    // Load paper trades from the trading system
    const paperTrades = await safeInvoke<any[]>('get_paper_trades');

    // Load bot trades if available
    await safeInvoke<{ is_running: boolean }>('get_bot_status');

    // Combine and format trades
    const formattedTrades: TradeRecord[] = [
      ...(paperTrades ? paperTrades.map(formatPaperTrade) : []),
      ...generateMockTrades(), // Generate some mock historical data for demo
    ];

    setTrades(formattedTrades);
    setLoading(false);
  };

  const formatPaperTrade = (trade: PaperTrade): TradeRecord => {
    const closeTime =
      trade.status === 'Closed' && trade.exit_price
        ? trade.timestamp // Using timestamp as approximate close time for closed trades
        : new Date().toISOString();
    const duration =
      trade.status === 'Closed'
        ? calculateDuration(trade.timestamp, closeTime)
        : calculateDuration(trade.timestamp, new Date().toISOString());

    return {
      id: trade.id || 'unknown',
      timestamp: trade.timestamp || new Date().toISOString(),
      symbol: trade.symbol || 'UNKNOWN',
      side: trade.side || 'Long',
      type: 'Market',
      entry_price: trade.entry_price || 0,
      exit_price: trade.exit_price,
      quantity: trade.quantity || 0,
      pnl: trade.pnl,
      pnl_percentage:
        trade.pnl && trade.entry_price && trade.quantity
          ? (trade.pnl / (trade.entry_price * trade.quantity)) * 100
          : undefined,
      status: trade.status || 'Open',
      strategy: 'Manual',
      duration,
      fees: (trade.quantity || 0) * 0.001, // 0.1% fee estimate
    };
  };

  const generateMockTrades = (): TradeRecord[] => {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT'];
    const strategies = ['Manual', 'LRO Bot', 'Scalping', 'Swing Trading'];
    const mockTrades: TradeRecord[] = [];

    for (let i = 0; i < 50; i++) {
      const isWinning = Math.random() > 0.4; // 60% win rate
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const side = Math.random() > 0.5 ? 'Long' : 'Short';
      const entryPrice = 50000 + Math.random() * 20000;
      const priceChange = isWinning
        ? (side === 'Long' ? 1 : -1) * (0.01 + Math.random() * 0.05)
        : (side === 'Long' ? -1 : 1) * (0.01 + Math.random() * 0.03);

      const exitPrice = entryPrice * (1 + priceChange);
      const quantity = 50 + Math.random() * 200;
      const pnl = (exitPrice - entryPrice) * quantity * (side === 'Long' ? 1 : -1);

      const daysAgo = Math.floor(Math.random() * 90);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);

      mockTrades.push({
        id: `mock_${i}`,
        timestamp: timestamp.toISOString(),
        symbol,
        side,
        type: Math.random() > 0.7 ? 'Bot' : 'Market',
        entry_price: entryPrice,
        exit_price: exitPrice,
        quantity,
        pnl,
        pnl_percentage: (pnl / (entryPrice * quantity)) * 100,
        status: 'Closed',
        strategy: strategies[Math.floor(Math.random() * strategies.length)],
        duration: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
        fees: quantity * 0.001,
        notes: isWinning ? 'Good entry timing' : 'Stop loss hit',
      });
    }

    return mockTrades.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const calculateDuration = (start: string, end: string): string => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const filterTrades = (filters: TradeFilters, searchTerm: string, timeframe: string) => {
    let filtered = trades;

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(
        trade =>
          trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trade.strategy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trade.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.symbol) {
      filtered = filtered.filter(trade => trade.symbol === filters.symbol);
    }
    if (filters.side) {
      filtered = filtered.filter(trade => trade.side === filters.side);
    }
    if (filters.status) {
      filtered = filtered.filter(trade => trade.status === filters.status);
    }
    if (filters.strategy) {
      filtered = filtered.filter(trade => trade.strategy === filters.strategy);
    }
    if (filters.date_from) {
      filtered = filtered.filter(trade => new Date(trade.timestamp) >= new Date(filters.date_from));
    }
    if (filters.date_to) {
      filtered = filtered.filter(trade => new Date(trade.timestamp) <= new Date(filters.date_to));
    }
    if (filters.min_pnl) {
      filtered = filtered.filter(trade => (trade.pnl || 0) >= parseFloat(filters.min_pnl));
    }
    if (filters.max_pnl) {
      filtered = filtered.filter(trade => (trade.pnl || 0) <= parseFloat(filters.max_pnl));
    }

    // Apply timeframe filter
    if (timeframe !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (timeframe) {
        case '1d':
          filterDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          filterDate.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(trade => new Date(trade.timestamp) >= filterDate);
    }

    return filtered;
  };

  const tradeStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'Closed');
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const totalVolume = closedTrades.reduce((sum, t) => sum + t.entry_price * t.quantity, 0);
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalFees = closedTrades.reduce((sum, t) => sum + t.fees, 0);

    return {
      totalTrades: closedTrades.length,
      totalVolume,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      totalPnL,
      totalFees,
      avgPnL: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0,
      winningTrades: winningTrades.length,
    };
  }, [trades]);

  useEffect(() => {
    loadTrades();
  }, []);

  return {
    trades,
    loading,
    error,
    tradeStats,
    loadTrades,
    filterTrades,
  };
};
