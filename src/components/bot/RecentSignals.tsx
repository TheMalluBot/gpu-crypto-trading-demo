import React from 'react';
import { motion } from 'framer-motion';
import { LROSignal, LROConfig } from '../../types/bot';

interface RecentSignalsProps {
  signals: LROSignal[];
  config: LROConfig;
  getSignalColor: (signalType: string) => string;
  getMarketPhaseColor: (marketPhase: string) => string;
}

export const RecentSignals: React.FC<RecentSignalsProps> = ({
  signals,
  config,
  getSignalColor,
  getMarketPhaseColor
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-morphic p-6"
    >
      <h3 className="text-xl font-bold text-white mb-4">Recent Signals</h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {signals.map((signal, index) => (
          <div key={index} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs ${getSignalColor(signal.signal_type)}`}>
                  {signal.signal_type}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${getMarketPhaseColor(signal.market_condition.market_phase)}`}>
                  {signal.market_condition.market_phase}
                </span>
              </div>
              <span className="text-white/60 text-sm">
                {new Date(signal.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-white/60">LRO Value</span>
                <div className="text-white font-medium">{signal.lro_value.toFixed(3)}</div>
              </div>
              <div>
                <span className="text-white/60">Signal Line</span>
                <div className="text-white font-medium">{signal.signal_line.toFixed(3)}</div>
              </div>
              <div>
                <span className="text-white/60">Strength</span>
                <div className="text-white font-medium">{(signal.strength * 100).toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-white/60">Volatility</span>
                <div className="text-white font-medium">{(signal.market_condition.volatility * 100).toFixed(1)}%</div>
              </div>
            </div>
            
            {/* LRO Oscillator Visualization */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                <span>-1.0</span>
                <span>LRO</span>
                <span>1.0</span>
              </div>
              <div className="relative h-2 bg-white/10 rounded-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full relative">
                    {/* Oversold/Overbought zones */}
                    <div 
                      className="absolute h-full bg-red-500/30 rounded-l-full"
                      style={{ width: `${((config.oversold + 1) / 2) * 100}%` }}
                    />
                    <div 
                      className="absolute h-full bg-green-500/30 rounded-r-full right-0"
                      style={{ width: `${((1 - config.overbought) / 2) * 100}%` }}
                    />
                    
                    {/* LRO value indicator */}
                    <div 
                      className="absolute w-3 h-3 bg-blue-400 rounded-full transform -translate-y-0.5 -translate-x-1.5"
                      style={{ left: `${((signal.lro_value + 1) / 2) * 100}%` }}
                    />
                    
                    {/* Signal line indicator */}
                    <div 
                      className="absolute w-2 h-2 bg-yellow-400 rounded-full transform -translate-y-0.5 -translate-x-1"
                      style={{ left: `${((signal.signal_line + 1) / 2) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {signals.length === 0 && (
          <div className="text-center py-8 text-white/60">
            <p>No signals generated yet</p>
            <p className="text-sm">Start the bot to begin signal analysis</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};