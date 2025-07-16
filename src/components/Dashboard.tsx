import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/tauri';
import { 
  Calendar, 
  DollarSign, 
  Target, 
  Filter, 
  Search, 
  Download, 
  Upload,
  Edit3,
  Award,
  Activity,
  History
} from 'lucide-react';
import { MarketOverview } from './common/MarketOverview';

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  joined_date: string;
  timezone: string;
  preferred_currency: string;
  risk_tolerance: 'Conservative' | 'Moderate' | 'Aggressive';
  experience_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  total_trades: number;
  total_volume: number;
  win_rate: number;
}

interface TradeRecord {
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

interface TradeFilters {
  symbol: string;
  side: string;
  status: string;
  strategy: string;
  date_from: string;
  date_to: string;
  min_pnl: string;
  max_pnl: string;
}

const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Crypto Trader',
    email: 'trader@example.com',
    joined_date: '2024-01-15',
    timezone: 'UTC',
    preferred_currency: 'USD',
    risk_tolerance: 'Moderate',
    experience_level: 'Intermediate',
    total_trades: 0,
    total_volume: 0,
    win_rate: 0,
  });

  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<TradeRecord[]>([]);
  const [filters, setFilters] = useState<TradeFilters>({
    symbol: '',
    side: '',
    status: '',
    strategy: '',
    date_from: '',
    date_to: '',
    min_pnl: '',
    max_pnl: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [tradesPerPage] = useState(10);
  const [profileErrors, setProfileErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadTradeHistory();
    loadProfile();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [trades, filters, searchTerm]);

  const loadTradeHistory = async () => {
    try {
      // Load paper trades from the trading system
      const paperTrades = await invoke<any[]>('get_paper_trades');
      
      // Load bot trades if available
      await invoke<any>('get_bot_status');
      
      // Combine and format trades
      const formattedTrades: TradeRecord[] = [
        ...paperTrades.map(formatPaperTrade),
        ...generateMockTrades(), // Generate some mock historical data for demo
      ];

      setTrades(formattedTrades);
      updateProfileStats(formattedTrades);
    } catch (error) {
      console.error('Failed to load trade history:', error);
      // Generate mock data for demo
      const mockTrades = generateMockTrades();
      setTrades(mockTrades);
      updateProfileStats(mockTrades);
    }
  };

  const formatPaperTrade = (trade: any): TradeRecord => {
    const duration = trade.closed_at 
      ? calculateDuration(trade.created_at, trade.closed_at)
      : calculateDuration(trade.created_at, new Date().toISOString());

    return {
      id: trade.id,
      timestamp: trade.created_at,
      symbol: trade.symbol,
      side: trade.side,
      type: 'Market',
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      quantity: trade.quantity,
      pnl: trade.pnl,
      pnl_percentage: trade.pnl && trade.entry_price 
        ? (trade.pnl / (trade.entry_price * trade.quantity)) * 100 
        : undefined,
      status: trade.status,
      strategy: 'Manual',
      duration,
      fees: trade.quantity * 0.001, // 0.1% fee estimate
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

    return mockTrades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const generateMockProfile = () => {
    // This would normally load from backend/storage
    setProfile(prev => ({
      ...prev,
      name: 'Alex Thompson',
      email: 'alex.thompson@email.com',
      joined_date: '2024-01-15',
    }));
  };

  const loadProfile = async () => {
    try {
      // Try to load from backend first
      const savedProfile = await invoke<UserProfile>('load_user_profile');
      setProfile(savedProfile);
    } catch (error) {
      console.error('Failed to load profile from backend:', error);
      // Fallback to localStorage
      const localProfile = localStorage.getItem('user_profile');
      if (localProfile) {
        setProfile(JSON.parse(localProfile));
      } else {
        // Generate mock profile if nothing saved
        generateMockProfile();
      }
    }
  };

  const validateProfile = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!profile.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!profile.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveProfile = async () => {
    if (!validateProfile()) {
      return;
    }

    try {
      // Save profile to backend/local storage
      await invoke('save_user_profile', { profile });
      console.log('Profile saved successfully');
    } catch (error) {
      console.error('Failed to save profile:', error);
      // For now, just save to localStorage as fallback
      localStorage.setItem('user_profile', JSON.stringify(profile));
    }
  };

  const updateProfileStats = (tradeHistory: TradeRecord[]) => {
    const closedTrades = tradeHistory.filter(t => t.status === 'Closed');
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const totalVolume = closedTrades.reduce((sum, t) => sum + (t.entry_price * t.quantity), 0);

    setProfile(prev => ({
      ...prev,
      total_trades: closedTrades.length,
      total_volume: totalVolume,
      win_rate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
    }));
  };

  const calculateDuration = (start: string, end: string): string => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const applyFilters = () => {
    let filtered = trades;

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(trade =>
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
    if (selectedTimeframe !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedTimeframe) {
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

    setFilteredTrades(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      symbol: '',
      side: '',
      status: '',
      strategy: '',
      date_from: '',
      date_to: '',
      min_pnl: '',
      max_pnl: '',
    });
    setSearchTerm('');
    setSelectedTimeframe('all');
  };

  const exportTrades = () => {
    const csv = [
      'Date,Symbol,Side,Type,Entry Price,Exit Price,Quantity,P/L,P/L %,Status,Strategy,Duration,Fees,Notes',
      ...filteredTrades.map(trade => [
        new Date(trade.timestamp).toLocaleDateString(),
        trade.symbol,
        trade.side,
        trade.type,
        trade.entry_price.toFixed(2),
        trade.exit_price?.toFixed(2) || '',
        trade.quantity.toFixed(4),
        trade.pnl?.toFixed(2) || '',
        trade.pnl_percentage?.toFixed(2) || '',
        trade.status,
        trade.strategy || '',
        trade.duration || '',
        trade.fees.toFixed(4),
        trade.notes || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_history_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const importTrades = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const csv = event.target?.result as string;
            const lines = csv.split('\n');
            lines[0].split(','); // headers
            
            const importedTrades: TradeRecord[] = lines.slice(1)
              .filter(line => line.trim())
              .map((line, index) => {
                const values = line.split(',');
                return {
                  id: `imported_${Date.now()}_${index}`,
                  timestamp: new Date(values[0]).toISOString(),
                  symbol: values[1],
                  side: values[2] as 'Long' | 'Short',
                  type: values[3] as 'Market' | 'Limit' | 'Bot',
                  entry_price: parseFloat(values[4]),
                  exit_price: values[5] ? parseFloat(values[5]) : undefined,
                  quantity: parseFloat(values[6]),
                  pnl: values[7] ? parseFloat(values[7]) : undefined,
                  pnl_percentage: values[8] ? parseFloat(values[8]) : undefined,
                  status: values[9] as 'Open' | 'Closed' | 'Cancelled',
                  strategy: values[10] || undefined,
                  duration: values[11] || undefined,
                  fees: parseFloat(values[12]) || 0,
                  notes: values[13] || undefined,
                };
              });

            setTrades(prev => [...importedTrades, ...prev]);
            updateProfileStats([...importedTrades, ...trades]);
            console.log(`Imported ${importedTrades.length} trades`);
          } catch (error) {
            console.error('Failed to parse CSV file:', error);
            alert('Error parsing CSV file. Please check the format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Calculate summary statistics
  const totalPnL = filteredTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const totalFees = filteredTrades.reduce((sum, trade) => sum + trade.fees, 0);
  const avgPnL = filteredTrades.length > 0 ? totalPnL / filteredTrades.length : 0;
  const winningTrades = filteredTrades.filter(trade => (trade.pnl || 0) > 0);
  const currentWinRate = filteredTrades.length > 0 ? (winningTrades.length / filteredTrades.length) * 100 : 0;

  // Pagination
  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTrades = filteredTrades.slice(indexOfFirstTrade, indexOfLastTrade);
  const totalPages = Math.ceil(filteredTrades.length / tradesPerPage);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphic p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
              <p className="text-white/60">{profile.email}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="flex items-center space-x-1 text-white/80 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(profile.joined_date).toLocaleDateString()}</span>
                </span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                  {profile.experience_level}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowProfileEdit(true);
              setProfileErrors({});
            }}
            className="p-2 glass-card hover:bg-white/10 rounded-lg transition-colors"
          >
            <Edit3 className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
          <div className="glass-card p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-white/80 text-sm">Total Trades</span>
            </div>
            <span className="text-2xl font-bold text-white">{profile.total_trades}</span>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-white/80 text-sm">Total Volume</span>
            </div>
            <span className="text-2xl font-bold text-white">
              ${(profile.total_volume / 1000).toFixed(1)}K
            </span>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-purple-400" />
              <span className="text-white/80 text-sm">Win Rate</span>
            </div>
            <span className="text-2xl font-bold text-white">{profile.win_rate.toFixed(1)}%</span>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <span className="text-white/80 text-sm">Risk Level</span>
            </div>
            <span className="text-2xl font-bold text-white">{profile.risk_tolerance}</span>
          </div>
        </div>
      </motion.div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <MarketOverview 
            onSymbolSelect={(symbol) => {
              // Navigate to trade panel with selected symbol
              console.log('Selected symbol:', symbol);
              // You could dispatch an event or use routing here
            }}
            limit={10}
          />
        </div>
        
        <div className="space-y-4">
          {/* Quick Action Cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-morphic p-4"
          >
            <h3 className="text-lg font-bold text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.hash = '#/trade'}
                className="w-full p-3 glass-card hover:bg-white/10 rounded-lg transition-colors text-left"
              >
                <div className="text-white font-medium">Start Trading</div>
                <div className="text-white/60 text-sm">Place manual orders</div>
              </button>
              <button 
                onClick={() => window.location.hash = '#/bot'}
                className="w-full p-3 glass-card hover:bg-white/10 rounded-lg transition-colors text-left"
              >
                <div className="text-white font-medium">Setup Bot</div>
                <div className="text-white/60 text-sm">Configure LRO strategy</div>
              </button>
            </div>
          </motion.div>
          
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-morphic p-4"
          >
            <h3 className="text-lg font-bold text-white mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {trades.slice(0, 3).map(trade => (
                <div key={trade.id} className="flex items-center justify-between p-2 glass-card rounded-lg">
                  <div>
                    <div className="text-white text-sm font-medium">{trade.symbol}</div>
                    <div className="text-white/60 text-xs">{trade.side}</div>
                  </div>
                  <div className={`text-sm font-medium ${
                    (trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${(trade.pnl || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Trade Book Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-morphic p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <History className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Trade Book</h2>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
              {filteredTrades.length} trades
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 glass-card hover:bg-white/10 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <button
              onClick={importTrades}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>

            <button
              onClick={exportTrades}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          <div className="glass-card p-3">
            <div className="text-white/60 text-sm">Total P/L</div>
            <div className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${totalPnL.toFixed(2)}
            </div>
          </div>

          <div className="glass-card p-3">
            <div className="text-white/60 text-sm">Avg P/L</div>
            <div className={`text-lg font-bold ${avgPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${avgPnL.toFixed(2)}
            </div>
          </div>

          <div className="glass-card p-3">
            <div className="text-white/60 text-sm">Win Rate</div>
            <div className="text-lg font-bold text-white">{currentWinRate.toFixed(1)}%</div>
          </div>

          <div className="glass-card p-3">
            <div className="text-white/60 text-sm">Total Fees</div>
            <div className="text-lg font-bold text-orange-400">${totalFees.toFixed(2)}</div>
          </div>

          <div className="glass-card p-3">
            <div className="text-white/60 text-sm">Winning Trades</div>
            <div className="text-lg font-bold text-white">{winningTrades.length}</div>
          </div>
        </div>

        {/* Search and Timeframe */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass-card text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            />
          </div>

          <div className="flex space-x-2">
            {['all', '1d', '7d', '30d', '90d'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-500 text-white'
                    : 'glass-card text-white/70 hover:bg-white/10'
                }`}
              >
                {timeframe === 'all' ? 'All Time' : timeframe.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 glass-card rounded-lg mb-6"
          >
            <div>
              <label className="block text-sm text-white/60 mb-1">Symbol</label>
              <select
                value={filters.symbol}
                onChange={(e) => setFilters({...filters, symbol: e.target.value})}
                className="w-full glass-card px-3 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                <option value="" className="bg-gray-800">All Symbols</option>
                <option value="BTCUSDT" className="bg-gray-800">BTCUSDT</option>
                <option value="ETHUSDT" className="bg-gray-800">ETHUSDT</option>
                <option value="ADAUSDT" className="bg-gray-800">ADAUSDT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">Side</label>
              <select
                value={filters.side}
                onChange={(e) => setFilters({...filters, side: e.target.value})}
                className="w-full glass-card px-3 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                <option value="" className="bg-gray-800">All Sides</option>
                <option value="Long" className="bg-gray-800">Long</option>
                <option value="Short" className="bg-gray-800">Short</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full glass-card px-3 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                <option value="" className="bg-gray-800">All Status</option>
                <option value="Open" className="bg-gray-800">Open</option>
                <option value="Closed" className="bg-gray-800">Closed</option>
                <option value="Cancelled" className="bg-gray-800">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">Strategy</label>
              <select
                value={filters.strategy}
                onChange={(e) => setFilters({...filters, strategy: e.target.value})}
                className="w-full glass-card px-3 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                <option value="" className="bg-gray-800">All Strategies</option>
                <option value="Manual" className="bg-gray-800">Manual</option>
                <option value="LRO Bot" className="bg-gray-800">LRO Bot</option>
                <option value="Scalping" className="bg-gray-800">Scalping</option>
              </select>
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Trade History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-morphic p-6"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-white/60 text-sm border-b border-white/10">
                <th className="text-left py-3">Date</th>
                <th className="text-left py-3">Symbol</th>
                <th className="text-left py-3">Side</th>
                <th className="text-left py-3">Type</th>
                <th className="text-left py-3">Entry</th>
                <th className="text-left py-3">Exit</th>
                <th className="text-left py-3">Quantity</th>
                <th className="text-left py-3">P/L</th>
                <th className="text-left py-3">P/L %</th>
                <th className="text-left py-3">Duration</th>
                <th className="text-left py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 text-white text-sm">
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-white font-medium">{trade.symbol}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      trade.side === 'Long' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="py-3 text-white/80 text-sm">{trade.type}</td>
                  <td className="py-3 text-white">${trade.entry_price.toFixed(2)}</td>
                  <td className="py-3 text-white">
                    {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 text-white">{trade.quantity.toFixed(4)}</td>
                  <td className="py-3">
                    <span className={`font-medium ${
                      (trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`font-medium ${
                      (trade.pnl_percentage || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.pnl_percentage ? `${trade.pnl_percentage.toFixed(2)}%` : '-'}
                    </span>
                  </td>
                  <td className="py-3 text-white/60 text-sm">{trade.duration || '-'}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      trade.status === 'Open' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : trade.status === 'Closed'
                        ? 'bg-gray-500/20 text-gray-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-white/60 text-sm">
              Showing {indexOfFirstTrade + 1} to {Math.min(indexOfLastTrade, filteredTrades.length)} of {filteredTrades.length} trades
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 glass-card hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                return page <= totalPages ? (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded transition-colors ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'glass-card hover:bg-white/10 text-white'
                    }`}
                  >
                    {page}
                  </button>
                ) : null;
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 glass-card hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-modal flex items-center justify-center p-4"
          onClick={() => setShowProfileEdit(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-morphic p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit Profile</h3>
              <button
                onClick={() => setShowProfileEdit(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4 text-white/70" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => {
                    setProfile({...profile, name: e.target.value});
                    if (profileErrors.name) {
                      setProfileErrors({...profileErrors, name: ''});
                    }
                  }}
                  className={`w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 rounded-lg ${
                    profileErrors.name ? 'focus:ring-red-500 ring-1 ring-red-500' : 'focus:ring-blue-500'
                  }`}
                />
                {profileErrors.name && (
                  <p className="text-red-400 text-xs mt-1">{profileErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => {
                    setProfile({...profile, email: e.target.value});
                    if (profileErrors.email) {
                      setProfileErrors({...profileErrors, email: ''});
                    }
                  }}
                  className={`w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 rounded-lg ${
                    profileErrors.email ? 'focus:ring-red-500 ring-1 ring-red-500' : 'focus:ring-blue-500'
                  }`}
                />
                {profileErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{profileErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Timezone</label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({...profile, timezone: e.target.value})}
                  className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                >
                  <option value="UTC" className="bg-gray-800">UTC</option>
                  <option value="America/New_York" className="bg-gray-800">EST</option>
                  <option value="America/Los_Angeles" className="bg-gray-800">PST</option>
                  <option value="Europe/London" className="bg-gray-800">GMT</option>
                  <option value="Asia/Tokyo" className="bg-gray-800">JST</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Preferred Currency</label>
                <select
                  value={profile.preferred_currency}
                  onChange={(e) => setProfile({...profile, preferred_currency: e.target.value})}
                  className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                >
                  <option value="USD" className="bg-gray-800">USD</option>
                  <option value="EUR" className="bg-gray-800">EUR</option>
                  <option value="GBP" className="bg-gray-800">GBP</option>
                  <option value="BTC" className="bg-gray-800">BTC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Risk Tolerance</label>
                <select
                  value={profile.risk_tolerance}
                  onChange={(e) => setProfile({...profile, risk_tolerance: e.target.value as 'Conservative' | 'Moderate' | 'Aggressive'})}
                  className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                >
                  <option value="Conservative" className="bg-gray-800">Conservative</option>
                  <option value="Moderate" className="bg-gray-800">Moderate</option>
                  <option value="Aggressive" className="bg-gray-800">Aggressive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Experience Level</label>
                <select
                  value={profile.experience_level}
                  onChange={(e) => setProfile({...profile, experience_level: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'})}
                  className="w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                >
                  <option value="Beginner" className="bg-gray-800">Beginner</option>
                  <option value="Intermediate" className="bg-gray-800">Intermediate</option>
                  <option value="Advanced" className="bg-gray-800">Advanced</option>
                  <option value="Expert" className="bg-gray-800">Expert</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowProfileEdit(false)}
                className="px-4 py-2 glass-card hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await saveProfile();
                  setShowProfileEdit(false);
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;