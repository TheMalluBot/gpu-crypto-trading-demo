import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Star, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { SymbolInfo } from '../../types/bot';

interface MarketOverviewProps {
  onSymbolSelect?: (symbol: string) => void;
  className?: string;
  limit?: number;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  onSymbolSelect,
  className = '',
  limit = 20
}) => {
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'volume' | 'price_change' | 'price'>('volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadMarketData();
    loadFavorites();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadMarketData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadFavorites = () => {
    const saved = localStorage.getItem('symbol-favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
  };

  const loadMarketData = async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');
      const popularSymbols = await invoke<SymbolInfo[]>('get_popular_symbols', { settings });
      setSymbols(popularSymbols.slice(0, limit));
    } catch (err) {
      console.error('Error loading market data:', err);
      setError('Failed to load market data');
      
      // Fallback to mock data
      setSymbols([
        { symbol: 'BTCUSDT', base_asset: 'BTC', quote_asset: 'USDT', status: 'TRADING', price: 43250.00, price_change_percent: 2.45, volume: 1200000000, high: 44000, low: 42000, is_spot_trading_allowed: true, is_margin_trading_allowed: true, filters: [] },
        { symbol: 'ETHUSDT', base_asset: 'ETH', quote_asset: 'USDT', status: 'TRADING', price: 2645.30, price_change_percent: 3.21, volume: 850000000, high: 2700, low: 2500, is_spot_trading_allowed: true, is_margin_trading_allowed: true, filters: [] },
        { symbol: 'SOLUSDT', base_asset: 'SOL', quote_asset: 'USDT', status: 'TRADING', price: 102.45, price_change_percent: -1.23, volume: 520000000, high: 108, low: 98, is_spot_trading_allowed: true, is_margin_trading_allowed: true, filters: [] },
        { symbol: 'ADAUSDT', base_asset: 'ADA', quote_asset: 'USDT', status: 'TRADING', price: 0.4567, price_change_percent: 1.89, volume: 340000000, high: 0.48, low: 0.44, is_spot_trading_allowed: true, is_margin_trading_allowed: true, filters: [] },
        { symbol: 'DOTUSDT', base_asset: 'DOT', quote_asset: 'USDT', status: 'TRADING', price: 6.789, price_change_percent: 0.56, volume: 180000000, high: 7.2, low: 6.5, is_spot_trading_allowed: true, is_margin_trading_allowed: true, filters: [] },
        { symbol: 'LINKUSDT', base_asset: 'LINK', quote_asset: 'USDT', status: 'TRADING', price: 14.25, price_change_percent: -0.89, volume: 120000000, high: 14.8, low: 13.9, is_spot_trading_allowed: true, is_margin_trading_allowed: true, filters: [] },
        { symbol: 'MATICUSDT', base_asset: 'MATIC', quote_asset: 'USDT', status: 'TRADING', price: 0.8934, price_change_percent: 4.12, volume: 95000000, high: 0.92, low: 0.85, is_spot_trading_allowed: true, is_margin_trading_allowed: true, filters: [] },
        { symbol: 'AVAXUSDT', base_asset: 'AVAX', quote_asset: 'USDT', status: 'TRADING', price: 36.78, price_change_percent: -2.34, volume: 85000000, high: 38.5, low: 35.2, is_spot_trading_allowed: true, is_margin_trading_allowed: true, filters: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(fav => fav !== symbol)
      : [...favorites, symbol];
    setFavorites(newFavorites);
    localStorage.setItem('symbol-favorites', JSON.stringify(newFavorites));
  };

  const getSortedSymbols = () => {
    return [...symbols].sort((a, b) => {
      let aValue: number;
      let bValue: number;
      
      switch (sortBy) {
        case 'volume':
          aValue = a.volume || 0;
          bValue = b.volume || 0;
          break;
        case 'price_change':
          aValue = a.price_change_percent || 0;
          bValue = b.price_change_percent || 0;
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        default:
          return 0;
      }
      
      const comparison = aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const handleSort = (newSortBy: 'volume' | 'price_change' | 'price') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  const formatPrice = (price: number, decimals: number = 2) => {
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(3);
    return price.toFixed(decimals);
  };

  return (
    <div className={`glass-morphic rounded-lg ${className}`}>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Market Overview</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={loadMarketData}
              disabled={loading}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Sort Controls */}
        <div className="flex items-center space-x-4 mt-3">
          <span className="text-white/60 text-sm">Sort by:</span>
          <button
            onClick={() => handleSort('volume')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === 'volume' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Volume {sortBy === 'volume' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('price_change')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === 'price_change' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Change {sortBy === 'price_change' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('price')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === 'price' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-white/60">Loading market data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={loadMarketData}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {getSortedSymbols().map((symbol, index) => (
              <motion.div
                key={symbol.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 glass-card hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                onClick={() => onSymbolSelect?.(symbol.symbol)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-sm">
                      {symbol.base_asset.slice(0, 2)}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{symbol.symbol}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(symbol.symbol);
                        }}
                        className={`p-1 rounded ${
                          favorites.includes(symbol.symbol)
                            ? 'text-yellow-400'
                            : 'text-white/40 hover:text-white/60'
                        }`}
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-white/60 text-sm">
                      {symbol.base_asset}/{symbol.quote_asset}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${formatPrice(symbol.price || 0)}
                    </div>
                    <div className="text-white/60 text-sm">
                      Vol: {formatVolume(symbol.volume || 0)}
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-1 ${
                    (symbol.price_change_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(symbol.price_change_percent || 0) >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {(symbol.price_change_percent || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {symbols.length === 0 && (
              <div className="text-center py-8 text-white/60">
                No market data available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};