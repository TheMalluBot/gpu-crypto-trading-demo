import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Tooltip from './Tooltip';

interface ConfigInputProps {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  type: 'number' | 'text';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  tooltip?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
    custom?: (value: any) => string | null;
  };
  recommendation?: string;
}

const ConfigInput: React.FC<ConfigInputProps> = ({
  label,
  value,
  onChange,
  type,
  min,
  max,
  step,
  unit,
  tooltip,
  description,
  placeholder,
  disabled = false,
  validation,
  recommendation,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const validateValue = (val: number | string): string | null => {
    if (validation) {
      if (validation.required && (val === '' || val === null || val === undefined)) {
        return 'This field is required';
      }

      if (type === 'number') {
        const numVal = Number(val);
        if (isNaN(numVal)) {
          return 'Must be a valid number';
        }

        if (validation.min !== undefined && numVal < validation.min) {
          return `Must be at least ${validation.min}`;
        }

        if (validation.max !== undefined && numVal > validation.max) {
          return `Must be at most ${validation.max}`;
        }
      }

      if (validation.custom) {
        return validation.custom(val);
      }
    }

    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) : e.target.value;
    const validationError = validateValue(newValue);

    setError(validationError);

    if (!validationError) {
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const validationError = validateValue(value);
    setError(validationError);
  };

  const isValid = error === null;
  const showValidation = !isFocused && value !== '' && value !== null && value !== undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <label className="block text-sm font-medium text-white/90">
          {label}
          {unit && <span className="text-white/60 ml-1">({unit})</span>}
        </label>
        {tooltip && <Tooltip content={tooltip} />}
      </div>

      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 ${
            disabled
              ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
              : showValidation
                ? isValid
                  ? 'bg-white/5 border-green-500/50 text-white focus:ring-green-500/20'
                  : 'bg-white/5 border-red-500/50 text-white focus:ring-red-500/20'
                : 'bg-white/5 border-white/20 text-white focus:ring-blue-500/50 hover:border-white/30'
          }`}
        />

        {showValidation && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
        )}
      </div>

      {description && <p className="text-xs text-white/50">{description}</p>}

      {error && (
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {recommendation && !error && (
        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
          <strong>Recommendation:</strong> {recommendation}
        </div>
      )}
    </div>
  );
};

export default ConfigInput;
