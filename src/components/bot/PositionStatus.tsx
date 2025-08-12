import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { BotStatus, LROConfig } from '../../types/bot';

interface PositionStatusProps {
  botStatus: BotStatus;
  config: LROConfig;
}

export const PositionStatus: React.FC<PositionStatusProps> = ({ botStatus, config }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-morphic p-6"
    >
      <h3 className="text-xl font-bold text-white mb-4">
        {config.paper_trading_enabled ? 'Virtual Position' : 'Current Position'}
      </h3>

      {botStatus.current_position ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white/80">Symbol</span>
            <span className="text-white font-medium">{botStatus.current_position.symbol}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/80">Side</span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                botStatus.current_position.side === 'Long'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {botStatus.current_position.side}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/80">Entry Price</span>
            <span className="text-white font-medium">
              ${botStatus.current_position.entry_price.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/80">Quantity</span>
            <span className="text-white font-medium">{botStatus.current_position.quantity}</span>
          </div>

          {botStatus.current_position.stop_loss && (
            <div className="flex items-center justify-between">
              <span className="text-white/80">Stop Loss</span>
              <span className="text-red-400 font-medium">
                ${botStatus.current_position.stop_loss.toFixed(2)}
              </span>
            </div>
          )}

          {botStatus.current_position.take_profit && (
            <div className="flex items-center justify-between">
              <span className="text-white/80">Take Profit</span>
              <span className="text-green-400 font-medium">
                ${botStatus.current_position.take_profit.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">No active position</p>
        </div>
      )}
    </motion.div>
  );
};
