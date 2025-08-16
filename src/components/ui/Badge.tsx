import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variants = {
    default: 'bg-gray-700 text-gray-200 border-gray-600',
    success: 'bg-green-900/50 text-green-400 border-green-700',
    warning: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    danger: 'bg-red-900/50 text-red-400 border-red-700',
    info: 'bg-blue-900/50 text-blue-400 border-blue-700',
    secondary: 'bg-purple-900/50 text-purple-400 border-purple-700'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span
      className={`
        inline-flex items-center
        ${variants[variant]}
        ${sizes[size]}
        border rounded-full font-medium
        ${className}
      `}
    >
      {children}
    </span>
  );
};