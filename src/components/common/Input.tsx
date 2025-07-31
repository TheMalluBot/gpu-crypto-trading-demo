import React from 'react';

interface InputProps {
  id?: string;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'search';
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  'aria-describedby'?: string;
  'aria-label'?: string;
  autoComplete?: string;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  className = '',
  required = false,
  min,
  max,
  step,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  autoComplete,
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helpTextId = ariaDescribedBy || errorId;

  const inputClasses = `w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 rounded-lg transition-all ${
    error ? 'focus:ring-red-500 ring-1 ring-red-500' : 'focus:ring-blue-500'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-white/80">
          {label}
          {required && (
            <span className="text-red-400 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        step={step}
        className={inputClasses}
        aria-describedby={helpTextId}
        aria-label={ariaLabel || label}
        aria-invalid={error ? 'true' : 'false'}
        autoComplete={autoComplete}
      />
      {error && (
        <p id={errorId} className="text-red-400 text-xs" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
};

Input.displayName = 'Input';
