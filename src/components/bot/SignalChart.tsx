import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartDataPoint, LROConfig } from '../../types/bot';

interface SignalChartProps {
  chartData: ChartDataPoint[];
  config: LROConfig;
  showChart: boolean;
  setShowChart: (show: boolean) => void;
}

export const SignalChart: React.FC<SignalChartProps> = ({
  chartData,
  config,
  showChart,
  setShowChart
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-morphic p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Linear Regression Oscillator</h3>
        <button
          onClick={() => setShowChart(!showChart)}
          className="p-2 glass-card hover:bg-white/10 rounded-lg transition-colors focus-enhanced"
          aria-label={showChart ? "Hide chart" : "Show chart"}
          title={showChart ? "Hide chart" : "Show chart"}
        >
          <BarChart3 className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {showChart && chartData.length > 0 && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-text-primary), 0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(var(--color-text-secondary), 0.8)"
                fontSize={12}
              />
              <YAxis 
                domain={[-1.2, 1.2]}
                stroke="rgba(var(--color-text-secondary), 0.8)"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(var(--bg-secondary), 0.95)',
                  border: '1px solid rgba(var(--color-border-primary), 0.2)',
                  borderRadius: '8px',
                  color: 'rgb(var(--color-text-primary))'
                }}
              />
              <Legend />
              
              {/* Reference lines for overbought/oversold */}
              <ReferenceLine y={config.overbought} stroke="rgb(var(--color-secondary-500))" strokeDasharray="2 2" />
              <ReferenceLine y={config.oversold} stroke="rgb(var(--color-secondary-500))" strokeDasharray="2 2" />
              <ReferenceLine y={0} stroke="rgba(var(--color-text-primary), 0.3)" />
              
              {/* LRO and Signal lines */}
              <Line 
                type="monotone" 
                dataKey="lro_value" 
                stroke="rgb(var(--color-primary-500))" 
                strokeWidth={2}
                name="LRO Value"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="signal_line" 
                stroke="rgb(var(--color-accent-500))" 
                strokeWidth={2}
                name="Signal Line"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {showChart && chartData.length === 0 && (
        <div className="h-80 flex items-center justify-center text-white/60">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No chart data available</p>
            <p className="text-sm">Start the bot to generate signals</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};