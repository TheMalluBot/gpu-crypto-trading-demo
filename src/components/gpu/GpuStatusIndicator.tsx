import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Cpu, Zap } from 'lucide-react';

interface GpuStats {
  gpu_available: boolean;
  backend: string;
  memory_usage: string;
  compute_utilization: string;
}

export const GpuStatusIndicator: React.FC = () => {
  const [gpuStats, setGpuStats] = useState<GpuStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchGpuStats = async () => {
      try {
        const stats = await invoke<GpuStats>('get_gpu_performance_stats');
        setGpuStats(stats);
      } catch (error) {
        console.error('Failed to fetch GPU stats:', error);
      }
    };

    fetchGpuStats();

    const interval = setInterval(fetchGpuStats, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!gpuStats?.gpu_available) {
    return (
      <div className="glass-card p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">CPU Mode</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card p-3 rounded-lg cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="flex items-center space-x-2">
        <Zap className="w-4 h-4 text-blue-400" />
        <span className="text-xs text-blue-400 font-medium">GPU ACCELERATED</span>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      </div>

      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-600/30 text-xs text-gray-300 space-y-1">
          <div>Backend: {gpuStats.backend}</div>
          <div>Memory: {gpuStats.memory_usage}</div>
          <div>Compute: {gpuStats.compute_utilization}</div>
        </div>
      )}
    </div>
  );
};
