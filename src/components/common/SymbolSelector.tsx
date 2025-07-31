import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, TrendingUp, TrendingDown, Star, Filter } from 'lucide-react';
import { safeInvoke } from '../../utils/tauri';
import { SymbolInfo } from '../../types/bot';

interface SymbolSelectorProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  className?: string;
  placeholder?: string;
  showFavorites?: boolean;
  filterByQuote?: string[];
}

export const SymbolSelector: React.FC<SymbolSelectorProps> = ({
  selectedSymbol,
  onSymbolChange,
  className = '',
  placeholder = 'Search symbols...',
  showFavorites = true,
  filterByQuote = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<SymbolInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load popular symbols on mount
  useEffect(() => {
    loadPopularSymbols();
    loadFavorites();
  }, []);

  // Load favorites from localStorage
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

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('symbol-favorites', JSON.stringify(newFavorites));
  };

  const loadPopularSymbols = async () => {
    setLoading(true);
    const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');
    const popularSymbols = await safeInvoke<SymbolInfo[]>('get_popular_symbols', { settings });

    if (popularSymbols) {
      setSymbols(popularSymbols);
      setFilteredSymbols(popularSymbols);
    } else {
      // Fallback to popular symbols
      const fallbackSymbols = [
        {
          symbol: 'BTCUSDT',
          base_asset: 'BTC',
          quote_asset: 'USDT',
          status: 'TRADING',
          price: 43000,
          price_change_percent: 2.5,
          volume: 1000000,
          is_spot_trading_allowed: true,
          is_margin_trading_allowed: true,
          filters: [],
        },
        {
          symbol: 'ETHUSDT',
          base_asset: 'ETH',
          quote_asset: 'USDT',
          status: 'TRADING',
          price: 2600,
          price_change_percent: 3.2,
          volume: 800000,
          is_spot_trading_allowed: true,
          is_margin_trading_allowed: true,
          filters: [],
        },
        {
          symbol: 'SOLUSDT',
          base_asset: 'SOL',
          quote_asset: 'USDT',
          status: 'TRADING',
          price: 100,
          price_change_percent: -1.5,
          volume: 500000,
          is_spot_trading_allowed: true,
          is_margin_trading_allowed: true,
          filters: [],
        },
        {
          symbol: 'ADAUSDT',
          base_asset: 'ADA',
          quote_asset: 'USDT',
          status: 'TRADING',
          price: 0.45,
          price_change_percent: 1.8,
          volume: 300000,
          is_spot_trading_allowed: true,
          is_margin_trading_allowed: true,
          filters: [],
        },
        {
          symbol: 'DOTUSDT',
          base_asset: 'DOT',
          quote_asset: 'USDT',
          status: 'TRADING',
          price: 6.5,
          price_change_percent: 0.8,
          volume: 200000,
          is_spot_trading_allowed: true,
          is_margin_trading_allowed: true,
          filters: [],
        },
      ];
      setSymbols(fallbackSymbols);
      setFilteredSymbols(fallbackSymbols);
    }

    setLoading(false);
  };

  const searchSymbols = async (query: string) => {
    if (!query.trim()) {
      setFilteredSymbols(symbols);
      return;
    }

    setLoading(true);
    const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');
    const results = await safeInvoke<SymbolInfo[]>('search_symbols', {
      settings,
      query: query.trim(),
      limit: 50,
    });

    if (results) {
      setFilteredSymbols(results);
    } else {
      // Fallback to local filtering
      const filtered = symbols.filter(
        symbol =>
          symbol.symbol.toLowerCase().includes(query.toLowerCase()) ||
          symbol.base_asset.toLowerCase().includes(query.toLowerCase()) ||
          symbol.quote_asset.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSymbols(filtered);
    }

    setLoading(false);
  };

  // Filter symbols based on selected filter
  const getFilteredSymbols = () => {
    let filtered = filteredSymbols;

    // Apply quote currency filter
    if (filterByQuote.length > 0) {
      filtered = filtered.filter(symbol => filterByQuote.includes(symbol.quote_asset));
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'favorites':
        filtered = filtered.filter(symbol => favorites.includes(symbol.symbol));
        break;
      case 'usdt':
        filtered = filtered.filter(symbol => symbol.quote_asset === 'USDT');
        break;
      case 'btc':
        filtered = filtered.filter(symbol => symbol.quote_asset === 'BTC');
        break;
      case 'eth':
        filtered = filtered.filter(symbol => symbol.quote_asset === 'ETH');
        break;
      case 'winners':
        filtered = filtered.filter(symbol => (symbol.price_change_percent || 0) > 0);
        break;
      case 'losers':
        filtered = filtered.filter(symbol => (symbol.price_change_percent || 0) < 0);
        break;
      default:
        break;
    }

    return filtered;
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchSymbols(query);
  };

  // Handle symbol selection
  const handleSymbolSelect = (symbol: string) => {
    onSymbolChange(symbol);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Toggle favorite
  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(fav => fav !== symbol)
      : [...favorites, symbol];
    saveFavorites(newFavorites);
  };

  // Close dropdown when clicking outside and handle positioning
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      if (isOpen) {
        setIsOpen(false); // Close on resize to avoid positioning issues
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isOpen]);

  // Position dropdown based on available space and calculate fixed position
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const calculateDropdownPosition = () => {
    if (!isOpen || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const buffer = 16;
    const dropdownHeight = 400;

    const spaceBelow = viewportHeight - rect.bottom - buffer;
    const spaceAbove = rect.top - buffer;

    let top: number;
    let maxHeight: string;

    // Determine vertical position
    if (spaceBelow >= dropdownHeight) {
      top = rect.bottom + 8;
      maxHeight = Math.min(spaceBelow - 8, dropdownHeight) + 'px';
    } else if (spaceAbove >= dropdownHeight) {
      top = rect.top - dropdownHeight - 8;
      maxHeight = Math.min(spaceAbove - 8, dropdownHeight) + 'px';
    } else {
      // Use the side with more space
      if (spaceBelow > spaceAbove) {
        top = rect.bottom + 8;
        maxHeight = spaceBelow - 8 + 'px';
      } else {
        top = buffer;
        maxHeight = spaceAbove - 8 + 'px';
      }
    }

    // Ensure horizontal positioning stays within viewport
    const left = Math.min(rect.left, viewportWidth - rect.width - buffer);

    setDropdownStyle({
      position: 'fixed',
      top,
      left,
      width: rect.width,
      maxHeight,
      zIndex: 'var(--z-dropdown, 950)' as any,
    });
  };

  useEffect(() => {
    if (isOpen) {
      calculateDropdownPosition();

      // Recalculate on resize/scroll
      const handleReposition = () => calculateDropdownPosition();
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);

      return () => {
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition, true);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const filtered = getFilteredSymbols();
      if (filtered.length > 0) {
        handleSymbolSelect(filtered[0].symbol);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectedSymbolInfo = symbols.find(s => s.symbol === selectedSymbol);

  return (
    <div className={`dropdown-container ${className} ${isOpen ? 'open' : ''}`} ref={containerRef}>
      {/* Selected Symbol Display */}
      <div
        className="flex items-center justify-between p-3 glass-card hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
            <span className="text-blue-400 font-bold text-sm">
              {selectedSymbolInfo?.base_asset.slice(0, 2) || 'BTC'}
            </span>
          </div>
          <div>
            <div className="text-white font-medium">{selectedSymbol}</div>
            <div className="text-white/60 text-sm">
              {selectedSymbolInfo?.base_asset}/{selectedSymbolInfo?.quote_asset}
            </div>
          </div>
        </div>

        {selectedSymbolInfo && (
          <div className="text-right">
            <div className="text-white font-medium">
              ${selectedSymbolInfo.price?.toFixed(2) || '0.00'}
            </div>
            <div
              className={`text-sm flex items-center ${
                (selectedSymbolInfo.price_change_percent || 0) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {(selectedSymbolInfo.price_change_percent || 0) >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {(selectedSymbolInfo.price_change_percent || 0).toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu glass-morphic rounded-lg shadow-2xl overflow-hidden z-dropdown"
            style={dropdownStyle}
          >
            {/* Search Input */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 p-3 border-b border-white/10 overflow-x-auto">
              {[
                { id: 'all', label: 'All', icon: Filter },
                { id: 'favorites', label: 'Favorites', icon: Star },
                { id: 'usdt', label: 'USDT', icon: Filter },
                { id: 'btc', label: 'BTC', icon: Filter },
                { id: 'winners', label: 'Winners', icon: TrendingUp },
                { id: 'losers', label: 'Losers', icon: TrendingDown },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                    selectedFilter === filter.id
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <filter.icon className="w-3 h-3" />
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>

            {/* Symbol List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-white/60">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading symbols...
                </div>
              ) : (
                <>
                  {getFilteredSymbols().map(symbol => (
                    <div
                      key={symbol.symbol}
                      className="flex items-center justify-between p-3 hover:bg-white/10 cursor-pointer transition-colors"
                      onClick={() => handleSymbolSelect(symbol.symbol)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <span className="text-blue-400 font-bold text-sm">
                            {symbol.base_asset.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{symbol.symbol}</div>
                          <div className="text-white/60 text-sm">
                            {symbol.base_asset}/{symbol.quote_asset}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {showFavorites && (
                          <button
                            onClick={e => toggleFavorite(symbol.symbol, e)}
                            className={`p-1 rounded ${
                              favorites.includes(symbol.symbol)
                                ? 'text-yellow-400'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}

                        <div className="text-right">
                          <div className="text-white font-medium">
                            ${symbol.price?.toFixed(2) || '0.00'}
                          </div>
                          <div
                            className={`text-sm flex items-center ${
                              (symbol.price_change_percent || 0) >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {(symbol.price_change_percent || 0) >= 0 ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {(symbol.price_change_percent || 0).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {getFilteredSymbols().length === 0 && (
                    <div className="p-6 text-center text-white/60">No symbols found</div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
