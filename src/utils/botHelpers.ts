export const getSignalColor = (signalType: string): string => {
  switch (signalType) {
    case 'StrongBuy': return 'bg-green-500 text-white';
    case 'Buy': return 'bg-green-500/70 text-white';
    case 'StrongSell': return 'bg-red-500 text-white';
    case 'Sell': return 'bg-red-500/70 text-white';
    case 'Hold': return 'bg-yellow-500/70 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

export const getMarketPhaseColor = (phase: string): string => {
  switch (phase) {
    case 'Trending': return 'bg-blue-500/70 text-white';
    case 'Ranging': return 'bg-purple-500/70 text-white';
    case 'Breakout': return 'bg-orange-500/70 text-white';
    case 'Reversal': return 'bg-pink-500/70 text-white';
    default: return 'bg-gray-500 text-white';
  }
};