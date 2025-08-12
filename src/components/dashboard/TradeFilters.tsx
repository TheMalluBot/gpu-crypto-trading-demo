import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { TradeFilters as TradeFiltersType } from '../../hooks/useTrades';

interface TradeFiltersProps {
  showFilters: boolean;
  filters: TradeFiltersType;
  onFiltersChange: (filters: TradeFiltersType) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onClearFilters: () => void;
}

export const TradeFilters: React.FC<TradeFiltersProps> = ({
  showFilters,
  filters,
  onFiltersChange,
  searchTerm,
  onSearchChange,
  selectedTimeframe,
  onTimeframeChange,
  onClearFilters,
}) => {
  const symbolOptions = [
    { value: '', label: 'All Symbols' },
    { value: 'BTCUSDT', label: 'BTCUSDT' },
    { value: 'ETHUSDT', label: 'ETHUSDT' },
    { value: 'ADAUSDT', label: 'ADAUSDT' },
  ];

  const sideOptions = [
    { value: '', label: 'All Sides' },
    { value: 'Long', label: 'Long' },
    { value: 'Short', label: 'Short' },
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Open', label: 'Open' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const strategyOptions = [
    { value: '', label: 'All Strategies' },
    { value: 'Manual', label: 'Manual' },
    { value: 'LRO Bot', label: 'LRO Bot' },
    { value: 'Scalping', label: 'Scalping' },
  ];

  return (
    <>
      {/* Search and Timeframe */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search trades..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 glass-card text-white bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
          />
        </div>

        <div className="flex space-x-2">
          {['all', '1d', '7d', '30d', '90d'].map(timeframe => (
            <button
              key={timeframe}
              onClick={() => onTimeframeChange(timeframe)}
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
          <Select
            label="Symbol"
            value={filters.symbol}
            onChange={e => onFiltersChange({ ...filters, symbol: e.target.value })}
            options={symbolOptions}
          />

          <Select
            label="Side"
            value={filters.side}
            onChange={e => onFiltersChange({ ...filters, side: e.target.value })}
            options={sideOptions}
          />

          <Select
            label="Status"
            value={filters.status}
            onChange={e => onFiltersChange({ ...filters, status: e.target.value })}
            options={statusOptions}
          />

          <Select
            label="Strategy"
            value={filters.strategy}
            onChange={e => onFiltersChange({ ...filters, strategy: e.target.value })}
            options={strategyOptions}
          />

          <div className="md:col-span-4 flex justify-end">
            <Button
              variant="danger"
              onClick={onClearFilters}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              Clear Filters
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
};
