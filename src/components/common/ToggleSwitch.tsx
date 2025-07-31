import React from 'react';
import { motion } from 'framer-motion';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <motion.button
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`w-12 h-6 rounded-full p-1 transition-all duration-200 focus-enhanced ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{
        backgroundColor: checked
          ? `rgb(var(--color-primary-500))`
          : `rgba(var(--color-surface-400), 0.3)`,
      }}
    >
      <motion.div
        className="w-4 h-4 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </motion.button>
  );
};
