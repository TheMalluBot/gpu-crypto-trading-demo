import React from 'react';
import { motion } from 'framer-motion';
import { History, Filter, Upload, Download } from 'lucide-react';
import { Button } from '../common/Button';

interface TradeBookHeaderProps {
  filteredTradesCount: number;
  onToggleFilters: () => void;
  onImportTrades: () => void;
  onExportTrades: () => void;
}

export const TradeBookHeader: React.FC<TradeBookHeaderProps> = ({
  filteredTradesCount,
  onToggleFilters,
  onImportTrades,
  onExportTrades,
}) => {
  return (
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
            {filteredTradesCount} trades
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={onToggleFilters}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>

          <Button
            variant="primary"
            onClick={onImportTrades}
            className="flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </Button>

          <Button
            variant="success"
            onClick={onExportTrades}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
