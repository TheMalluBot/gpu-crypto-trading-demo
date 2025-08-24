import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Select } from './ui/Select';
import { Tabs } from './ui/Tabs';
import { Cpu, Zap, Activity, BarChart3, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface GpuBackend {
  name: string;
  priority: number;
}

interface GpuDevice {
  name: string;
  vendor: string;
  device_type: string;
  memory_mb: number;
  compute_units: number;
  backend: string;
  capabilities: {
    float64_support: boolean;
    tensor_cores: boolean;
    ray_tracing: boolean;
    async_compute: boolean;
  };
}

interface GpuSystemInfo {
  available_backends: string[];
  selected_backend?: string;
  devices: GpuDevice[];
  is_initialized: boolean;
}

interface BenchmarkResult {
  backend: string;
  metrics: {
    kernel_execution_time_ms: number;
    memory_transfer_time_ms: number;
    total_time_ms: number;
    throughput_gbps: number;
    compute_utilization: number;
  };
  rank: number;
}

interface PerformanceMetrics {
  kernel_execution_time_ms: number;
  memory_transfer_time_ms: number;
  total_time_ms: number;
  throughput_gbps: number;
  compute_utilization: number;
  memory_utilization: number;
  power_usage_watts: number;
  temperature_celsius: number;
}

const GpuSelector: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<GpuSystemInfo | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBackend, setSelectedBackend] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  // Detect GPU backends on mount
  useEffect(() => {
    detectGpuBackends();
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  const detectGpuBackends = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await invoke<GpuSystemInfo>('detect_gpu_backends');
      setSystemInfo(info);
      if (info.available_backends.length > 0) {
        setSelectedBackend(info.available_backends[0]);
      }
    } catch (err) {
      setError(`Failed to detect GPU backends: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const initializeGpu = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await invoke<GpuSystemInfo>('initialize_gpu_backend');
      setSystemInfo(info);
      if (info.selected_backend) {
        setSelectedBackend(info.selected_backend);
      }
    } catch (err) {
      setError(`Failed to initialize GPU: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const initializeSpecificBackend = async (backend: string) => {
    try {
      setLoading(true);
      setError(null);
      const info = await invoke<GpuSystemInfo>('initialize_specific_backend', { backend });
      setSystemInfo(info);
      setSelectedBackend(backend);
    } catch (err) {
      setError(`Failed to initialize ${backend}: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async () => {
    try {
      setLoading(true);
      setError(null);
      const results = await invoke<BenchmarkResult[]>('benchmark_gpu_backends');
      setBenchmarkResults(results);
      setActiveTab('benchmark');
    } catch (err) {
      setError(`Benchmark failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const updateMetrics = async () => {
    if (systemInfo?.is_initialized) {
      try {
        const metrics = await invoke<PerformanceMetrics>('get_gpu_metrics');
        setCurrentMetrics(metrics);
      } catch (err) {
        console.error('Failed to get GPU metrics:', err);
      }
    }
  };

  const getBackendIcon = (backend: string) => {
    switch (backend) {
      case 'CUDA':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'DirectX12':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'Vulkan':
        return <BarChart3 className="w-4 h-4 text-purple-500" />;
      case 'Metal':
        return <Cpu className="w-4 h-4 text-gray-500" />;
      default:
        return <Cpu className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDeviceTypeBadge = (type: string) => {
    const variants: Record<string, 'success' | 'warning' | 'default'> = {
      'DiscreteGpu': 'success',
      'IntegratedGpu': 'warning',
      'VirtualGpu': 'default',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Native GPU Acceleration</h2>
        <div className="flex gap-2">
          {systemInfo?.is_initialized ? (
            <Badge variant="success">
              <CheckCircle className="w-4 h-4 mr-1" />
              GPU Active
            </Badge>
          ) : (
            <Badge variant="warning">
              <XCircle className="w-4 h-4 mr-1" />
              GPU Inactive
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'devices', label: 'Devices' },
          { id: 'benchmark', label: 'Benchmark' },
          { id: 'metrics', label: 'Live Metrics' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Available Backends</label>
                <div className="flex flex-wrap gap-2">
                  {systemInfo?.available_backends.map((backend) => (
                    <div key={backend} className="flex items-center gap-1 p-2 bg-gray-50 rounded">
                      {getBackendIcon(backend)}
                      <span className="text-sm">{backend}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Select Backend</label>
                <Select
                  value={selectedBackend}
                  onChange={(e) => setSelectedBackend(e.target.value)}
                  options={systemInfo?.available_backends.map(b => ({ value: b, label: b })) || []}
                  disabled={loading || systemInfo?.is_initialized}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={initializeGpu}
                disabled={loading || systemInfo?.is_initialized}
                variant="primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  'Auto-Initialize Best GPU'
                )}
              </Button>
              
              <Button
                onClick={() => initializeSpecificBackend(selectedBackend)}
                disabled={loading || !selectedBackend || systemInfo?.is_initialized}
                variant="secondary"
              >
                Initialize {selectedBackend}
              </Button>
              
              <Button
                onClick={runBenchmark}
                disabled={loading || !systemInfo?.available_backends.length}
                variant="outline"
              >
                Run Benchmark
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-4">
            {systemInfo?.devices.map((device, idx) => (
              <div key={idx} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{device.name}</h3>
                  {getDeviceTypeBadge(device.device_type)}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Vendor:</span> {device.vendor}
                  </div>
                  <div>
                    <span className="text-gray-500">Memory:</span> {device.memory_mb} MB
                  </div>
                  <div>
                    <span className="text-gray-500">Compute Units:</span> {device.compute_units}
                  </div>
                  <div>
                    <span className="text-gray-500">Backend:</span> {device.backend}
                  </div>
                  <div>
                    <span className="text-gray-500">Float64:</span>{' '}
                    {device.capabilities.float64_support ? '✓' : '✗'}
                  </div>
                  <div>
                    <span className="text-gray-500">Tensor Cores:</span>{' '}
                    {device.capabilities.tensor_cores ? '✓' : '✗'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'benchmark' && (
          <div className="space-y-4">
            {benchmarkResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Run benchmark to see performance comparison
              </div>
            ) : (
              benchmarkResults.map((result) => (
                <div key={result.backend} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      {getBackendIcon(result.backend)}
                      <span className="font-semibold">{result.backend}</span>
                    </div>
                    <Badge variant={result.rank === 1 ? 'success' : 'default'}>
                      Rank #{result.rank}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Kernel Time:</span>{' '}
                      {result.metrics.kernel_execution_time_ms.toFixed(2)} ms
                    </div>
                    <div>
                      <span className="text-gray-500">Transfer Time:</span>{' '}
                      {result.metrics.memory_transfer_time_ms.toFixed(2)} ms
                    </div>
                    <div>
                      <span className="text-gray-500">Total Time:</span>{' '}
                      {result.metrics.total_time_ms.toFixed(2)} ms
                    </div>
                    <div>
                      <span className="text-gray-500">Throughput:</span>{' '}
                      {result.metrics.throughput_gbps.toFixed(2)} GB/s
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'metrics' && currentMetrics && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Kernel Execution</div>
              <div className="text-2xl font-bold">
                {currentMetrics.kernel_execution_time_ms.toFixed(2)} ms
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Memory Transfer</div>
              <div className="text-2xl font-bold">
                {currentMetrics.memory_transfer_time_ms.toFixed(2)} ms
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Throughput</div>
              <div className="text-2xl font-bold">
                {currentMetrics.throughput_gbps.toFixed(2)} GB/s
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">GPU Utilization</div>
              <div className="text-2xl font-bold">
                {currentMetrics.compute_utilization.toFixed(0)}%
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Memory Usage</div>
              <div className="text-2xl font-bold">
                {currentMetrics.memory_utilization.toFixed(0)}%
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Temperature</div>
              <div className="text-2xl font-bold">
                {currentMetrics.temperature_celsius.toFixed(0)}°C
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
export default GpuSelector;
