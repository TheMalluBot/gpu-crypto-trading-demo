/**
 * Centralized formatting utilities for the trading application
 * Consolidates duplicate formatting logic across components
 */

/**
 * Format a number as currency (USD)
 */
export const formatCurrency = (amount: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format a decimal as percentage
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format a price with appropriate decimal places based on value
 */
export const formatPrice = (price: number, decimals?: number): string => {
  if (decimals !== undefined) {
    return price.toFixed(decimals);
  }

  // Auto-adjust decimal places based on price magnitude
  if (price < 1) return price.toFixed(4);
  if (price < 10) return price.toFixed(3);
  return price.toFixed(2);
};

/**
 * Format large numbers with K/M/B suffixes
 */
export const formatVolume = (volume: number): string => {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toFixed(0);
};

/**
 * Format a quantity with appropriate decimal places
 */
export const formatQuantity = (quantity: number, symbol?: string): string => {
  // For BTC and other high-value coins, show more decimals
  if (symbol && ['BTC', 'ETH'].includes(symbol.toUpperCase())) {
    return quantity.toFixed(6);
  }
  return quantity.toFixed(4);
};

/**
 * Format date in a consistent way across the app
 */
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format time in a consistent way across the app
 */
export const formatTime = (date: string | Date): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Format datetime for trading timestamps
 */
export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return `${formatDate(d)} ${formatTime(d)}`;
};

/**
 * Format a number with sign prefix for P&L display
 */
export const formatPnLWithSign = (value: number, showPercentage: boolean = false): string => {
  const sign = value >= 0 ? '+' : '';
  const formatted = showPercentage ? formatPercentage(value / 100) : formatCurrency(value);
  return `${sign}${formatted}`;
};

/**
 * Bot-related color utilities
 */
export const getSignalColor = (signalType: string): string => {
  switch (signalType) {
    case 'StrongBuy':
      return 'bg-green-500 text-white';
    case 'Buy':
      return 'bg-green-500/70 text-white';
    case 'StrongSell':
      return 'bg-red-500 text-white';
    case 'Sell':
      return 'bg-red-500/70 text-white';
    case 'Hold':
      return 'bg-yellow-500/70 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export const getMarketPhaseColor = (phase: string): string => {
  switch (phase) {
    case 'Trending':
      return 'bg-blue-500/70 text-white';
    case 'Ranging':
      return 'bg-purple-500/70 text-white';
    case 'Breakout':
      return 'bg-orange-500/70 text-white';
    case 'Reversal':
      return 'bg-pink-500/70 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};
