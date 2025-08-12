import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  loading = false,
}) => {
  const baseClasses =
    'rounded-lg font-medium transition-all focus-enhanced disabled:opacity-50 disabled:cursor-not-allowed touch-target';

  const variants = {
    primary: 'btn-theme-primary',
    secondary: 'btn-theme-secondary',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    success: 'btn-theme-accent',
    ghost: 'bg-transparent hover:bg-theme-surface-hover text-theme-primary',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};

Button.displayName = 'Button';
