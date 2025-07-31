import React from 'react';

interface TradeStatsProps {
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  totalFees: number;
  winningTrades: number;
}

export const TradeStats: React.FC<TradeStatsProps> = ({
  totalPnL,
  avgPnL,
  winRate,
  totalFees,
  winningTrades,
}) => {
  return (
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
        <div className="text-lg font-bold text-white">{winRate.toFixed(1)}%</div>
      </div>

      <div className="glass-card p-3">
        <div className="text-white/60 text-sm">Total Fees</div>
        <div className="text-lg font-bold text-orange-400">${totalFees.toFixed(2)}</div>
      </div>

      <div className="glass-card p-3">
        <div className="text-white/60 text-sm">Winning Trades</div>
        <div className="text-lg font-bold text-white">{winningTrades}</div>
      </div>
    </div>
  );
};
