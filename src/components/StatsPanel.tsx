import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Zap } from 'lucide-react';

interface SystemStats {
  fps: number;
  cpu_load: number;
  gpu_frame_time: number;
}

interface StatsPanelProps {
  stats: SystemStats;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const getLoadColor = (load: number) => {
    if (load < 30) return 'text-green-400';
    if (load < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLoadBgColor = (load: number) => {
    if (load < 30) return 'bg-green-400';
    if (load < 70) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string;
    unit: string;
    load?: number;
  }> = ({ icon, title, value, unit, load }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/10 rounded-lg">
            {icon}
          </div>
          <span className="text-white/80 font-medium">{title}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-white">{value}</span>
          <span className="text-sm text-white/60">{unit}</span>
        </div>
        
        {load !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Load</span>
              <span className={`font-medium ${getLoadColor(load)}`}>
                {load.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <motion.div
                className={`h-2 rounded-full ${getLoadBgColor(load)}`}
                style={{ width: `${Math.min(load, 100)}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(load, 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        icon={<Activity className="w-5 h-5 text-blue-400" />}
        title="Frame Rate"
        value={stats.fps.toFixed(1)}
        unit="FPS"
      />
      
      <StatCard
        icon={<Cpu className="w-5 h-5 text-purple-400" />}
        title="CPU Usage"
        value={stats.cpu_load.toFixed(1)}
        unit="%"
        load={stats.cpu_load}
      />
      
      <StatCard
        icon={<Zap className="w-5 h-5 text-yellow-400" />}
        title="GPU Frame Time"
        value={stats.gpu_frame_time.toFixed(1)}
        unit="ms"
      />
    </div>
  );
};

export default StatsPanel;