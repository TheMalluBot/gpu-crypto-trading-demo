import React from 'react';
import { motion } from 'framer-motion';

export const QuickActions: React.FC = () => {
  return (
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
  );
};