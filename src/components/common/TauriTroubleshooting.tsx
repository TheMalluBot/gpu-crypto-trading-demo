import React from 'react';
import { AlertTriangle, RefreshCw, Terminal, Settings } from 'lucide-react';

interface TauriTroubleshootingProps {
  error?: string;
  onRetry?: () => void;
}

export const TauriTroubleshooting: React.FC<TauriTroubleshootingProps> = ({ error, onRetry }) => {
  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">Tauri API Connection Issue</h3>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4">
              <p className="text-red-400 text-sm font-mono">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-white mb-2">Quick Fixes:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span>Try the "Retest" button above to retry the connection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-green-400" />
                  <span>Restart the application completely</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-purple-400" />
                  <span>Check if you're running in development mode (npm run tauri dev)</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Running in Browser?</h4>
              <p className="text-sm text-gray-300">
                This application requires the Tauri runtime. If you're seeing this in a web browser,
                you need to run it as a desktop application using:
              </p>
              <div className="bg-gray-800 rounded p-2 mt-2">
                <code className="text-green-400 text-xs">npm run tauri dev</code>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Still Having Issues?</h4>
              <div className="text-sm text-gray-300 space-y-1">
                <p>• Check the console for detailed error messages</p>
                <p>• Verify your Rust and Tauri installations</p>
                <p>• Try clearing browser cache if testing in dev mode</p>
                <p>• Ensure no other instance is running on the same port</p>
              </div>
            </div>

            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
