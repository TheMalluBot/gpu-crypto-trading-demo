import React from 'react';
import { motion } from 'framer-motion';
import { useTrades } from '../../hooks/useTrades';
import { PnLDisplay } from '../common/PnLDisplay';

export const RecentActivity: React.FC = () => {
  const { trades } = useTrades();
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-morphic p-4"
    >
      <h3 className="text-lg font-bold text-white mb-3">Recent Activity</h3>
      <div className="space-y-2">
        {trades.slice(0, 3).map(trade => (
          <div
            key={trade.id}
            className="flex items-center justify-between p-2 glass-card rounded-lg"
          >
            <div>
              <div className="text-white text-sm font-medium">{trade.symbol}</div>
              <div className="text-white/60 text-xs">{trade.side}</div>
            </div>
            <PnLDisplay value={trade.pnl} size="sm" />
          </div>
        ))}
      </div>
    </motion.div>
  );
};
