import React from 'react';

export type StatusBadgeVariant = 'trade-side' | 'trade-status' | 'bot-status' | 'signal-type';

interface StatusBadgeProps {
  status: string;
  variant?: StatusBadgeVariant;
  className?: string;
}

/**
 * Reusable status badge component that applies consistent styling
 * across different status types throughout the application
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  variant = 'trade-status',
  className = ''
}) => {
  const getStatusClasses = (): string => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    
    switch (variant) {
      case 'trade-side':
        if (status === 'Long') {
          return `${baseClasses} bg-green-500/20 text-green-400`;
        } else if (status === 'Short') {
          return `${baseClasses} bg-red-500/20 text-red-400`;
        }
        break;
        
      case 'trade-status':
        if (status === 'Open') {
          return `${baseClasses} bg-blue-500/20 text-blue-400`;
        } else if (status === 'Closed') {
          return `${baseClasses} bg-gray-500/20 text-gray-400`;
        } else if (status === 'Cancelled') {
          return `${baseClasses} bg-red-500/20 text-red-400`;
        }
        break;
        
      case 'bot-status':
        if (status === 'Active' || status === 'Running') {
          return `${baseClasses} bg-green-500/20 text-green-400`;
        } else if (status === 'Stopped' || status === 'Inactive') {
          return `${baseClasses} bg-gray-500/20 text-gray-400`;
        } else if (status === 'Error' || status === 'Failed') {
          return `${baseClasses} bg-red-500/20 text-red-400`;
        }
        break;
        
      case 'signal-type':
        if (status === 'Buy' || status === 'StrongBuy') {
          return `${baseClasses} bg-green-500/20 text-green-400`;
        } else if (status === 'Sell' || status === 'StrongSell') {
          return `${baseClasses} bg-red-500/20 text-red-400`;
        } else if (status === 'Hold') {
          return `${baseClasses} bg-yellow-500/20 text-yellow-400`;
        }
        break;
        
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-400`;
    }
    
    // Fallback for unknown status values
    return `${baseClasses} bg-gray-500/20 text-gray-400`;
  };

  return (
    <span className={`${getStatusClasses()} ${className}`}>
      {status}
    </span>
  );
};