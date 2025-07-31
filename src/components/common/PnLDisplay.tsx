import React from 'react';
import { formatCurrency, formatPercentage, formatPnLWithSign } from '../../utils/formatters';

interface PnLDisplayProps {
  value: number | undefined | null;
  showSign?: boolean;
  showPercentage?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable P&L display component that consistently formats and colors
 * profit/loss values throughout the application
 */
export const PnLDisplay: React.FC<PnLDisplayProps> = ({
  value,
  showSign = false,
  showPercentage = false,
  className = '',
  size = 'md',
}) => {
  // Handle null/undefined values
  if (value === undefined || value === null) {
    return <span className={`text-white/60 ${className}`}>-</span>;
  }

  // Determine if value is positive or negative
  const isPositive = value >= 0;
  const colorClass = isPositive ? 'text-green-400' : 'text-red-400';

  // Size classes
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-bold',
  };

  // Format the value
  let formattedValue: string;

  if (showPercentage) {
    if (showSign) {
      formattedValue = formatPnLWithSign(value, true);
    } else {
      formattedValue = formatPercentage(value / 100);
    }
  } else {
    if (showSign) {
      formattedValue = formatPnLWithSign(value);
    } else {
      formattedValue = formatCurrency(value);
    }
  }

  return (
    <span className={`font-medium ${colorClass} ${sizeClasses[size]} ${className}`}>
      {formattedValue}
    </span>
  );
};
