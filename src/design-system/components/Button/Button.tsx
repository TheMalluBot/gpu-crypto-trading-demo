// Phase 2 Week 6 Design System Agent - Design System Button Component
import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// Button variants using class-variance-authority for type-safe variants
const buttonVariants = cva(
  // Base styles applied to all buttons
  [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-2',
    'rounded-md',
    'font-medium',
    'transition-all',
    'duration-200',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-offset-2',
    'disabled:pointer-events-none',
    'disabled:opacity-50',
    // Minimum touch target for accessibility
    'min-h-[44px]',
    'min-w-[44px]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-blue-600',
          'text-white',
          'border-blue-600',
          'hover:bg-blue-700',
          'hover:border-blue-700',
          'active:bg-blue-800',
          'focus-visible:ring-blue-500',
        ],
        secondary: [
          'bg-gray-100',
          'text-gray-900',
          'border-gray-200',
          'hover:bg-gray-200',
          'hover:border-gray-300',
          'active:bg-gray-300',
          'focus-visible:ring-gray-500',
        ],
        success: [
          'bg-green-600',
          'text-white',
          'border-green-600',
          'hover:bg-green-700',
          'hover:border-green-700',
          'active:bg-green-800',
          'focus-visible:ring-green-500',
        ],
        danger: [
          'bg-red-600',
          'text-white',
          'border-red-600',
          'hover:bg-red-700',
          'hover:border-red-700',
          'active:bg-red-800',
          'focus-visible:ring-red-500',
        ],
        warning: [
          'bg-yellow-600',
          'text-white',
          'border-yellow-600',
          'hover:bg-yellow-700',
          'hover:border-yellow-700',
          'active:bg-yellow-800',
          'focus-visible:ring-yellow-500',
        ],
        ghost: [
          'bg-transparent',
          'text-gray-700',
          'border-transparent',
          'hover:bg-gray-100',
          'hover:text-gray-900',
          'active:bg-gray-200',
          'focus-visible:ring-gray-500',
        ],
        outline: [
          'bg-transparent',
          'text-gray-700',
          'border-gray-300',
          'hover:bg-gray-50',
          'hover:text-gray-900',
          'active:bg-gray-100',
          'focus-visible:ring-gray-500',
        ],
        // Trading-specific variants
        buy: [
          'bg-green-600',
          'text-white',
          'border-green-600',
          'hover:bg-green-700',
          'hover:border-green-700',
          'active:bg-green-800',
          'focus-visible:ring-green-500',
          'hover:transform',
          'hover:-translate-y-0.5',
          'hover:shadow-md',
        ],
        sell: [
          'bg-red-600',
          'text-white',
          'border-red-600',
          'hover:bg-red-700',
          'hover:border-red-700',
          'active:bg-red-800',
          'focus-visible:ring-red-500',
          'hover:transform',
          'hover:-translate-y-0.5',
          'hover:shadow-md',
        ],
      },
      size: {
        sm: ['h-9', 'px-3', 'text-sm'],
        md: ['h-11', 'px-4', 'text-base'],
        lg: ['h-12', 'px-6', 'text-lg'],
        xl: ['h-14', 'px-8', 'text-xl'],
        icon: ['h-11', 'w-11', 'p-0'],
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// Button component interface
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Button content */
  children: React.ReactNode;
  /** Loading state with spinner */
  loading?: boolean;
  /** Icon to display before text */
  leftIcon?: React.ReactNode;
  /** Icon to display after text */
  rightIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Custom CSS classes */
  className?: string;
}

// Loading spinner component
const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
    <path
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      className="opacity-75"
    />
  </svg>
);

// Main Button component with forwardRef for proper ref handling
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant,
      size,
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth,
      className,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Left icon or loading spinner */}
        {loading ? (
          <LoadingSpinner size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        ) : leftIcon ? (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        {/* Button text - hidden when loading and no text */}
        {children && <span className={loading ? 'ml-2' : undefined}>{children}</span>}

        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Button group component for related actions
export interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ButtonGroup = ({
  children,
  orientation = 'horizontal',
  spacing = 'md',
  className,
}: ButtonGroupProps) => {
  const spacingMap = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4',
  };

  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        spacingMap[spacing],
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';

// Icon button wrapper for better accessibility
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, 'aria-label': ariaLabel, ...props }, ref) => {
    return (
      <Button ref={ref} size="icon" aria-label={ariaLabel} {...props}>
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// Export button variants for external usage
export { buttonVariants };
export type { VariantProps as ButtonVariantProps };

// Trading-specific button components
export const BuyButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="buy" {...props} />
);

BuyButton.displayName = 'BuyButton';

export const SellButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="sell" {...props} />
);

SellButton.displayName = 'SellButton';
