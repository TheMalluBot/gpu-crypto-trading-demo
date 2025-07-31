import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  error,
  disabled = false,
  className = '',
  required = false,
  placeholder,
}) => {
  const selectClasses = `w-full glass-card px-4 py-2 text-white bg-transparent border-0 focus:outline-none focus:ring-2 rounded-lg transition-all ${
    error ? 'focus:ring-red-500 ring-1 ring-red-500' : 'focus:ring-blue-500'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-white/80">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={selectClasses}
      >
        {placeholder && (
          <option value="" disabled className="bg-gray-800">
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-gray-800">
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
};
