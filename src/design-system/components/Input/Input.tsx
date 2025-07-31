// Phase 2 Week 6 Design System Agent - Design System Input Component
import React, { forwardRef, InputHTMLAttributes, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

// Input variants using class-variance-authority
const inputVariants = cva(
  [
    'w-full',
    'rounded-md',
    'border',
    'px-3',
    'py-3',
    'text-base',
    'transition-all',
    'duration-200',
    'placeholder:text-gray-400',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'disabled:bg-gray-50',
    // Minimum touch target for accessibility
    'min-h-[44px]',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-gray-300',
          'bg-white',
          'text-gray-900',
          'focus:border-blue-500',
          'focus:ring-blue-500',
        ],
        error: [
          'border-red-300',
          'bg-red-50',
          'text-red-900',
          'focus:border-red-500',
          'focus:ring-red-500',
          'placeholder:text-red-400',
        ],
        success: [
          'border-green-300',
          'bg-green-50',
          'text-green-900',
          'focus:border-green-500',
          'focus:ring-green-500',
        ],
        warning: [
          'border-yellow-300',
          'bg-yellow-50',
          'text-yellow-900',
          'focus:border-yellow-500',
          'focus:ring-yellow-500',
        ],
      },
      size: {
        sm: ['h-9', 'px-3', 'text-sm'],
        md: ['h-11', 'px-3', 'text-base'],
        lg: ['h-12', 'px-4', 'text-lg'],
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Input component interface
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Input label */
  label?: string;
  /** Help text displayed below input */
  helpText?: string;
  /** Error message */
  error?: string;
  /** Success message */
  success?: string;
  /** Warning message */
  warning?: string;
  /** Icon to display on the left */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right */
  rightIcon?: React.ReactNode;
  /** Custom CSS classes */
  className?: string;
  /** Wrapper className */
  wrapperClassName?: string;
  /** Required field indicator */
  required?: boolean;
}

// Main Input component with forwardRef
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helpText,
      error,
      success,
      warning,
      leftIcon,
      rightIcon,
      variant,
      size,
      className,
      wrapperClassName,
      required,
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    // Determine variant based on validation state
    const computedVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant;

    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const helpTextId = `${inputId}-help`;
    const errorId = `${inputId}-error`;

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400" aria-hidden="true">
                {leftIcon}
              </span>
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              inputVariants({ variant: computedVariant, size }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              [helpText && helpTextId, error && errorId].filter(Boolean).join(' ') || undefined
            }
            required={required}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-400" aria-hidden="true">
                {rightIcon}
              </span>
            </div>
          )}

          {/* Validation icons */}
          {(error || success || warning) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {error && <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />}
              {success && <Check className="h-5 w-5 text-green-500" aria-hidden="true" />}
              {warning && <AlertCircle className="h-5 w-5 text-yellow-500" aria-hidden="true" />}
            </div>
          )}
        </div>

        {/* Help text, error, success, or warning message */}
        {(helpText || error || success || warning) && (
          <div className="mt-2 text-sm">
            {error && (
              <p id={errorId} className="text-red-600" role="alert">
                {error}
              </p>
            )}
            {success && !error && <p className="text-green-600">{success}</p>}
            {warning && !error && !success && <p className="text-yellow-600">{warning}</p>}
            {helpText && !error && !success && !warning && (
              <p id={helpTextId} className="text-gray-600">
                {helpText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Password input component with toggle visibility
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  /** Show/hide password visibility toggle */
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          showToggle ? (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="p-1 hover:bg-gray-100 rounded transition-colors pointer-events-auto"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-500" />
              ) : (
                <Eye className="h-4 w-4 text-gray-500" />
              )}
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

// Textarea component
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    Pick<
      InputProps,
      'label' | 'helpText' | 'error' | 'success' | 'warning' | 'required' | 'wrapperClassName'
    > {
  /** Textarea size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom CSS classes */
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helpText,
      error,
      success,
      warning,
      size = 'md',
      className,
      wrapperClassName,
      required,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    // Determine variant based on validation state
    const variant = error ? 'error' : success ? 'success' : warning ? 'warning' : 'default';

    // Generate unique ID if not provided
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const helpTextId = `${textareaId}-help`;
    const errorId = `${textareaId}-error`;

    const sizeClasses = {
      sm: 'text-sm px-3 py-2',
      md: 'text-base px-3 py-3',
      lg: 'text-lg px-4 py-3',
    };

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full rounded-md border transition-all duration-200 resize-vertical',
            'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            sizeClasses[size],
            variant === 'default' &&
              'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500',
            variant === 'error' &&
              'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 placeholder:text-red-400',
            variant === 'success' &&
              'border-green-300 bg-green-50 text-green-900 focus:border-green-500 focus:ring-green-500',
            variant === 'warning' &&
              'border-yellow-300 bg-yellow-50 text-yellow-900 focus:border-yellow-500 focus:ring-yellow-500',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [helpText && helpTextId, error && errorId].filter(Boolean).join(' ') || undefined
          }
          required={required}
          {...props}
        />

        {/* Help text, error, success, or warning message */}
        {(helpText || error || success || warning) && (
          <div className="mt-2 text-sm">
            {error && (
              <p id={errorId} className="text-red-600" role="alert">
                {error}
              </p>
            )}
            {success && !error && <p className="text-green-600">{success}</p>}
            {warning && !error && !success && <p className="text-yellow-600">{warning}</p>}
            {helpText && !error && !success && !warning && (
              <p id={helpTextId} className="text-gray-600">
                {helpText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Search input component
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  /** Search button callback */
  onSearch?: (value: string) => void;
  /** Clear button callback */
  onClear?: () => void;
  /** Show clear button when input has value */
  showClear?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onClear, showClear = true, value, ...props }, ref) => {
    const hasValue = value && value.toString().length > 0;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(e.currentTarget.value);
      }
      props.onKeyDown?.(e);
    };

    const handleClear = () => {
      onClear?.();
    };

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        rightIcon={
          showClear && hasValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors pointer-events-auto"
              aria-label="Clear search"
              tabIndex={-1}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : undefined
        }
        value={value}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// Export input variants for external usage
export { inputVariants };
export type { VariantProps as InputVariantProps };
