import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/tauri';
import { Settings, Key, Server, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface AppSettings {
  api_key: string;
  api_secret: string;
  base_url: string;
  testnet: boolean;
  disable_animations: boolean;
}

interface AccountInfo {
  balances: Array<{
    asset: string;
    free: number;
    locked: number;
  }>;
  can_trade: boolean;
}

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    api_key: '',
    api_secret: '',
    base_url: 'https://api.binance.com',
    testnet: false,
    disable_animations: false,
  });
  
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string>('');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await invoke<AppSettings>('load_settings');
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await invoke('save_settings', { settings });
      setLoading(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setLoading(false);
    }
  };

  const testConnection = async () => {
    // Validate credentials before testing
    const validation = validateApiCredentials();
    if (!validation.isValid) {
      setTestError(validation.message);
      setTestResult('error');
      return;
    }

    try {
      setTestResult('testing');
      setTestError('');
      setAccountInfo(null);
      
      const connected = await invoke<boolean>('test_connection', { settings });
      
      if (connected) {
        const account = await invoke<AccountInfo>('get_account_info', { settings });
        setAccountInfo(account);
        setTestResult('success');
      } else {
        setTestError('Connection failed. Please check your API credentials and network connection.');
        setTestResult('error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestError(error instanceof Error ? error.message : 'Connection test failed');
      setTestResult('error');
    }
  };

  const handleInputChange = (field: keyof AppSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Reset test result when API credentials change
    if (field === 'api_key' || field === 'api_secret') {
      setTestResult('idle');
      setAccountInfo(null);
    }
  };

  const validateApiCredentials = () => {
    if (!settings.api_key || !settings.api_secret) {
      return { isValid: false, message: 'API Key and Secret are required' };
    }
    
    // Binance API keys are typically 64 characters long
    if (settings.api_key.length < 60 || settings.api_key.length > 70) {
      return { isValid: false, message: 'API Key appears to be invalid format' };
    }
    
    // Binance API secrets are typically 64 characters long
    if (settings.api_secret.length < 60 || settings.api_secret.length > 70) {
      return { isValid: false, message: 'API Secret appears to be invalid format' };
    }
    
    return { isValid: true, message: '' };
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Trading Settings</h2>
        </div>

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              <Key className="w-4 h-4 inline mr-2" />
              API Key *
            </label>
            <input
              type="password"
              value={settings.api_key}
              onChange={(e) => handleInputChange('api_key', e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Binance API Key"
            />
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              <Key className="w-4 h-4 inline mr-2" />
              API Secret *
            </label>
            <input
              type="password"
              value={settings.api_secret}
              onChange={(e) => handleInputChange('api_secret', e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your Binance API Secret"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              <Server className="w-4 h-4 inline mr-2" />
              Base URL
            </label>
            <input
              type="text"
              value={settings.base_url}
              onChange={(e) => handleInputChange('base_url', e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.binance.com"
            />
          </div>

          {/* Testnet Toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-white/80">
              <TestTube className="w-4 h-4" />
              <div>
                <span>Use Testnet</span>
                <div className="text-xs text-white/50 mt-1">
                  {settings.testnet ? 'Using testnet.binance.vision' : 'Using live API'}
                </div>
              </div>
            </label>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleInputChange('testnet', !settings.testnet)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                settings.testnet ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <motion.div
                className="w-4 h-4 bg-white rounded-full"
                animate={{ x: settings.testnet ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </motion.button>
          </div>

          {/* Disable Animations Toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-white/80">
              <span>Disable Background Animation</span>
            </label>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleInputChange('disable_animations', !settings.disable_animations)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                settings.disable_animations ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <motion.div
                className="w-4 h-4 bg-white rounded-full"
                animate={{ x: settings.disable_animations ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </motion.button>
          </div>
        </div>

        {/* Testnet Warning */}
        {settings.testnet && (
          <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <TestTube className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-blue-400 font-medium text-sm">Testnet Mode Active</div>
                <div className="text-blue-300/80 text-xs mt-1">
                  You're using the Binance testnet. No real money will be used for trading.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveSettings}
            disabled={loading}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={testConnection}
            disabled={testResult === 'testing' || !settings.api_key || !settings.api_secret}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {testResult === 'testing' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Testing...</span>
              </>
            ) : testResult === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Connected</span>
              </>
            ) : testResult === 'error' ? (
              <>
                <XCircle className="w-4 h-4" />
                <span>Failed</span>
              </>
            ) : (
              <span>Test Connection</span>
            )}
          </motion.button>
        </div>

        {/* Error Display */}
        {testResult === 'error' && testError && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-red-400 font-medium text-sm">Connection Failed</div>
                <div className="text-red-300/80 text-xs mt-1">{testError}</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Account Info */}
      {accountInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Account Information</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-white/80">Trading Enabled:</span>
              <span className={`font-medium ${accountInfo.can_trade ? 'text-green-400' : 'text-red-400'}`}>
                {accountInfo.can_trade ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div>
              <span className="text-white/80 block mb-2">Balances:</span>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {accountInfo.balances
                  .filter(balance => balance.free > 0 || balance.locked > 0)
                  .map((balance, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-2">
                      <div className="text-white font-medium">{balance.asset}</div>
                      <div className="text-white/60 text-sm">
                        Free: {balance.free.toFixed(4)}
                      </div>
                      {balance.locked > 0 && (
                        <div className="text-white/60 text-sm">
                          Locked: {balance.locked.toFixed(4)}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SettingsPanel;