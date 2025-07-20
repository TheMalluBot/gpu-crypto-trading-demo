import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 1,
  height = 'h-4',
  className = '',
  variant = 'text'
}) => {
  const baseClasses = 'bg-white/10 animate-pulse rounded';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full w-10 h-10';
      case 'rectangular':
        return 'rounded-lg';
      case 'card':
        return 'rounded-2xl h-32';
      default:
        return height;
    }
  };

  if (lines === 1) {
    return (
      <div 
        className={`${baseClasses} ${getVariantClasses()} ${className}`}
        role="status"
        aria-label="Loading content"
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: lines }, (_, index) => (
        <motion.div
          key={index}
          className={`${baseClasses} ${height}`}
          style={{ width: `${85 + Math.random() * 15}%` }}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.1
          }}
        />
      ))}
    </div>
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 6,
  className = ''
}) => {
  return (
    <div className={`glass-morphic p-6 ${className}`} role="status" aria-label="Loading table">
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, index) => (
          <LoadingSkeleton key={`header-${index}`} height="h-3" />
        ))}
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <LoadingSkeleton key={`cell-${rowIndex}-${colIndex}`} height="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface CardSkeletonProps {
  className?: string;
  showAvatar?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className = '',
  showAvatar = false
}) => {
  return (
    <div className={`glass-morphic p-6 ${className}`} role="status" aria-label="Loading card">
      <div className="flex items-start space-x-4">
        {showAvatar && <LoadingSkeleton variant="circular" />}
        <div className="flex-1 space-y-3">
          <LoadingSkeleton height="h-5" className="w-3/4" />
          <LoadingSkeleton lines={2} height="h-4" />
          <div className="flex space-x-2">
            <LoadingSkeleton height="h-6" className="w-16" />
            <LoadingSkeleton height="h-6" className="w-20" />
          </div>
        </div>
      </div>
    </div>
  );
};

LoadingSkeleton.displayName = 'LoadingSkeleton';
TableSkeleton.displayName = 'TableSkeleton';
CardSkeleton.displayName = 'CardSkeleton';