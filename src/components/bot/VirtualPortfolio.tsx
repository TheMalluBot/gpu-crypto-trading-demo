import React from 'react';
import { motion } from 'framer-motion';
import { VirtualPortfolio as VirtualPortfolioType, LROConfig } from '../../types/bot';

interface VirtualPortfolioProps {
  virtualPortfolio: VirtualPortfolioType | null;
  config: LROConfig;
  resetVirtualPortfolio: () => void;
}

export const VirtualPortfolio: React.FC<VirtualPortfolioProps> = ({
  virtualPortfolio,
  config,
  resetVirtualPortfolio,
}) => {
  if (!config.paper_trading_enabled || !virtualPortfolio) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-morphic p-6 z-content"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Virtual Portfolio</h3>
        <button
          onClick={resetVirtualPortfolio}
          className="px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-3 text-center">
          <div className="text-white/60 text-sm">Balance</div>
          <div className="text-lg font-bold text-white">${virtualPortfolio.balance.toFixed(2)}</div>
        </div>

        <div className="glass-card p-3 text-center">
          <div className="text-white/60 text-sm">Equity</div>
          <div
            className={`text-lg font-bold ${
              virtualPortfolio.equity >= virtualPortfolio.balance
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            ${virtualPortfolio.equity.toFixed(2)}
          </div>
        </div>

        <div className="glass-card p-3 text-center">
          <div className="text-white/60 text-sm">Unrealized P&L</div>
          <div
            className={`text-lg font-bold ${
              virtualPortfolio.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            ${virtualPortfolio.unrealized_pnl.toFixed(2)}
          </div>
        </div>

        <div className="glass-card p-3 text-center">
          <div className="text-white/60 text-sm">Win Rate</div>
          <div className="text-lg font-bold text-white">
            {virtualPortfolio.total_trades > 0
              ? ((virtualPortfolio.winning_trades / virtualPortfolio.total_trades) * 100).toFixed(1)
              : '0.0'}
            %
          </div>
        </div>
      </div>

      {/* Recent Paper Trades */}
      <div>
        <h4 className="text-white font-medium mb-3">Recent Paper Trades</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {virtualPortfolio.paper_trades.slice(0, 8).map(trade => (
            <div key={trade.id} className="glass-card p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    trade.side === 'Long'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {trade.side}
                </span>
                <div>
                  <div className="text-white text-sm font-medium">{trade.symbol}</div>
                  <div className="text-white/60 text-xs">
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-white text-sm">${trade.entry_price.toFixed(2)}</div>
                {trade.status === 'Closed' && trade.pnl !== undefined && (
                  <div className={`text-xs ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    {trade.pnl_percentage !== undefined && (
                      <span className="ml-1">
                        ({trade.pnl_percentage >= 0 ? '+' : ''}
                        {trade.pnl_percentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
                {trade.status === 'Open' && <div className="text-xs text-yellow-400">Open</div>}
              </div>
            </div>
          ))}

          {virtualPortfolio.paper_trades.length === 0 && (
            <div className="text-center text-white/60 py-8">
              <p>No paper trades yet</p>
              <p className="text-sm">Start the bot to begin paper trading</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
