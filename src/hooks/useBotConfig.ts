import { useState, useCallback } from 'react';
import { LROConfig } from '../types/bot';

const defaultConfig: LROConfig = {
  timeframe: '1h',
  period: 25,
  signal_period: 9,
  overbought: 0.8,
  oversold: -0.8,
  min_swing_bars: 5,
  adaptive_enabled: true,
  stop_loss_percent: 2.0,
  take_profit_percent: 4.0,
  max_position_size: 1000,
  max_daily_loss: 100,
  trailing_stop_enabled: false,
  trailing_stop_percent: 1.0,
  auto_strategy_enabled: false,
  market_adaptation_level: 'Moderate',
  paper_trading_enabled: true,
  virtual_balance: 10000,
  emergency_stop_enabled: true,
  circuit_breaker_enabled: true,
  max_position_hold_hours: 24,
  signal_strength_threshold: 0.6,
};

/**
 * Hook for managing bot configuration
 * Handles configuration state, validation, and persistence
 */
export const useBotConfig = () => {
  const [config, setConfig] = useState<LROConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);

  const updateConfig = useCallback((newConfig: Partial<LROConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  const validateConfig = useCallback((config: LROConfig): string[] => {
    const errors: string[] = [];

    if (config.period <= 0) {
      errors.push('Period must be greater than 0');
    }

    if (config.signal_period <= 0) {
      errors.push('Signal period must be greater than 0');
    }

    if (config.overbought <= config.oversold) {
      errors.push('Overbought threshold must be greater than oversold threshold');
    }

    if (config.stop_loss_percent <= 0 || config.stop_loss_percent > 100) {
      errors.push('Stop loss percent must be between 0 and 100');
    }

    if (config.take_profit_percent <= 0 || config.take_profit_percent > 1000) {
      errors.push('Take profit percent must be between 0 and 1000');
    }

    if (config.max_position_size <= 0) {
      errors.push('Max position size must be greater than 0');
    }

    if (config.virtual_balance <= 0) {
      errors.push('Virtual balance must be greater than 0');
    }

    return errors;
  }, []);

  const saveConfig = useCallback(
    async (configToSave: LROConfig) => {
      const errors = validateConfig(configToSave);
      if (errors.length > 0) {
        throw new Error(`Configuration errors: ${errors.join(', ')}`);
      }

      setLoading(true);
      try {
        // Here you would save to backend/localStorage
        // await safeInvoke('save_bot_config', { config: configToSave });
        setConfig(configToSave);
        return true;
      } catch (error) {
        console.error('Failed to save bot configuration:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [validateConfig]
  );

  return {
    config,
    setConfig,
    updateConfig,
    resetConfig,
    validateConfig,
    saveConfig,
    loading,
    defaultConfig,
  };
};
