import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Bell } from 'lucide-react';
import { MarketConditions as MarketConditionsType, LROConfig, BotStatus } from '../../types/bot';

interface MarketConditionsProps {
  marketConditions: MarketConditionsType | null;
  config: LROConfig;
  botStatus: BotStatus;
}

export const MarketConditions: React.FC<MarketConditionsProps> = ({
  marketConditions,
  config,
  botStatus,
}) => {
  if (!marketConditions) return null;

  return (
    <>
      {/* Market Conditions Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-4 glass-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">Market Conditions</span>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              marketConditions.market_regime === 'Bull'
                ? 'bg-accent-500/20 text-accent-400'
                : marketConditions.market_regime === 'Bear'
                  ? 'bg-red-500/20 text-red-400'
                  : marketConditions.market_regime === 'Volatile'
                    ? 'bg-secondary-500/20 text-secondary-400'
                    : 'bg-primary-500/20 text-primary-400'
            }`}
          >
            {marketConditions.market_regime}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-white/60">Volatility</div>
            <div className="text-white font-medium">
              {(marketConditions.volatility * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-white/60">Trend Strength</div>
            <div className="text-white font-medium">
              {(marketConditions.trend_strength * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-white/60">Volume</div>
            <div className="text-white font-medium">
              {(marketConditions.volume_profile * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-white/60">Momentum</div>
            <div
              className={`font-medium ${
                marketConditions.price_momentum > 0 ? 'text-accent-400' : 'text-red-400'
              }`}
            >
              {marketConditions.price_momentum > 0 ? '+' : ''}
              {(marketConditions.price_momentum * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {config.auto_strategy_enabled && (
          <div className="mt-3 flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-blue-400 text-sm font-medium">Auto-Strategy Active</span>
            <span className="text-white/60 text-sm">
              - Adapting to {marketConditions.market_regime.toLowerCase()} market
            </span>
          </div>
        )}
      </motion.div>

      {/* Alert System */}
      {botStatus.latest_signal && botStatus.latest_signal.signal_type !== 'Hold' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 glass-card p-3 border-l-4 border-blue-400"
        >
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-white font-medium">Signal Alert</div>
              <div className="text-white/60 text-sm">
                {botStatus.latest_signal.signal_type} signal detected with{' '}
                {(botStatus.latest_signal.strength * 100).toFixed(1)}% strength
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};
