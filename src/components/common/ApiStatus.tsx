import React, { useState, useEffect } from 'react';
import { testApiConnection, isTauriApp } from '../../utils/tauri';
import { TauriTroubleshooting } from './TauriTroubleshooting';

interface ApiStatusProps {
  showDetails?: boolean;
}

export const ApiStatus: React.FC<ApiStatusProps> = ({ showDetails = false }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<any>(null);
  const [isManualTesting, setIsManualTesting] = useState(false);

  const checkConnection = async () => {
    setStatus('checking');
    setError('');
    
    const result = await testApiConnection();
    setInfo(result.info);
    
    if (result.success) {
      setStatus('connected');
    } else {
      setStatus('error');
      setError(result.error || 'Unknown error');
    }
  };

  const manualTest = async () => {
    setIsManualTesting(true);
    await checkConnection();
    setIsManualTesting(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'checking': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '✅';
      case 'error': return '❌';
      case 'checking': return '🔄';
      default: return '⚪';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'API Connected';
      case 'error': return 'API Error';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        <button
          onClick={manualTest}
          disabled={isManualTesting || status === 'checking'}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
        >
          {isManualTesting ? 'Testing...' : 'Retest'}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-2 p-2 bg-red-900/20 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {showDetails && info && (
        <details className="mt-3">
          <summary className="text-gray-400 text-sm cursor-pointer hover:text-white">
            Debug Information
          </summary>
          <div className="mt-2 p-3 bg-gray-900/50 rounded text-xs">
            <div className="space-y-1">
              <div><strong>Environment:</strong> {info.environment}</div>
              <div><strong>Tauri Available:</strong> {info.available ? 'Yes' : 'No'}</div>
              <div><strong>__TAURI_IPC__:</strong> {info.__TAURI_IPC__}</div>
              <div><strong>__TAURI__:</strong> {info.__TAURI__}</div>
              <div><strong>Location:</strong> {info.location}</div>
              {info.userAgent && (
                <div><strong>User Agent:</strong> {info.userAgent}</div>
              )}
            </div>
          </div>
        </details>
      )}

      {(status === 'error' || !isTauriApp()) && showDetails && (
        <div className="mt-4">
          <TauriTroubleshooting 
            error={error} 
            onRetry={manualTest}
          />
        </div>
      )}

      {!isTauriApp() && !showDetails && (
        <div className="mt-2 text-yellow-400 text-sm p-2 bg-yellow-900/20 rounded">
          ⚠️ Running in browser mode. Tauri APIs are not available.
        </div>
      )}
    </div>
  );
};