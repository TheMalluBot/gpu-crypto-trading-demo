import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Key, Server, TestTube, CheckCircle, XCircle, Palette, Monitor } from 'lucide-react';
import SecureStorage from '../utils/secureStorage';
import NotificationManager from '../utils/notifications';
import HelpButton from './common/HelpButton';
import { HELP_CONTENT } from '../utils/helpContent';
import { ApiStatus } from './common/ApiStatus';

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
      // Try to load from secure storage first
      const secureSettings = await SecureStorage.retrieve('app_settings');
      if (secureSettings) {
        setSettings(prev => ({ ...prev, ...secureSettings }));
      } else {
        // Fallback to Tauri backend
        const loadedSettings = await invoke<AppSettings>('load_settings');
        setSettings(loadedSettings);
      }
    } catch (error) {
      NotificationManager.error(
        'Settings Load Failed',
        'Failed to load application settings. Using defaults.'
      );
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      
      // Save sensitive data to secure storage
      const sensitiveData = {
        api_key: settings.api_key,
        api_secret: settings.api_secret
      };
      
      // Save non-sensitive data to regular storage
      const nonSensitiveData = {
        base_url: settings.base_url,
        testnet: settings.testnet,
        disable_animations: settings.disable_animations
      };
      
      await SecureStorage.store('app_settings', sensitiveData);
      await invoke('save_settings', { settings: nonSensitiveData });
      
      NotificationManager.success(
        'Settings Saved',
        'Your settings have been saved securely.'
      );
      
      setLoading(false);
    } catch (error) {
      NotificationManager.error(
        'Save Failed',
        'Failed to save settings. Please try again.'
      );
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
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      NotificationManager.error(
        'Connection Test Failed',
        errorMessage
      );
      setTestError(errorMessage);
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
      {/* Page Header with Help */}
      <div className="flex justify-between items-center">
        <h1 className="text-hierarchy-primary">Settings</h1>
        <HelpButton helpContent={HELP_CONTENT.settings} />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphic p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Settings 
            className="w-6 h-6" 
            style={{ color: `rgb(var(--color-primary-500))` }}
          />
          <h2 
            className="text-2xl font-bold"
            style={{ color: `rgb(var(--color-text-primary))` }}
          >
            Trading Settings
          </h2>
        </div>

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: `rgba(var(--color-text-primary), 0.8)` }}
            >
              <Key 
                className="w-4 h-4 inline mr-2" 
                style={{ color: `rgb(var(--color-primary-500))` }}
              />
              API Key *
            </label>
            <input
              type="password"
              value={settings.api_key}
              onChange={(e) => handleInputChange('api_key', e.target.value)}
              className="form-input"
              placeholder="Enter your Binance API Key"
            />
          </div>

          {/* API Secret */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: `rgba(var(--color-text-primary), 0.8)` }}
            >
              <Key 
                className="w-4 h-4 inline mr-2" 
                style={{ color: `rgb(var(--color-primary-500))` }}
              />
              API Secret *
            </label>
            <input
              type="password"
              value={settings.api_secret}
              onChange={(e) => handleInputChange('api_secret', e.target.value)}
              className="form-input"
              placeholder="Enter your Binance API Secret"
            />
          </div>

          {/* Base URL */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: `rgba(var(--color-text-primary), 0.8)` }}
            >
              <Server 
                className="w-4 h-4 inline mr-2" 
                style={{ color: `rgb(var(--color-primary-500))` }}
              />
              Base URL
            </label>
            <input
              type="text"
              value={settings.base_url}
              onChange={(e) => handleInputChange('base_url', e.target.value)}
              className="form-input"
              placeholder="https://api.binance.com"
            />
          </div>

          {/* Testnet Toggle */}
          <div className="flex items-center justify-between">
            <label 
              className="flex items-center space-x-2"
              style={{ color: `rgba(var(--color-text-primary), 0.8)` }}
            >
              <TestTube 
                className="w-4 h-4" 
                style={{ color: `rgb(var(--color-primary-500))` }}
              />
              <div>
                <span>Use Testnet</span>
                <div 
                  className="text-xs mt-1"
                  style={{ color: `rgba(var(--color-text-secondary), 0.7)` }}
                >
                  {settings.testnet ? 'Using testnet.binance.vision' : 'Using live API'}
                </div>
              </div>
            </label>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleInputChange('testnet', !settings.testnet)}
              className="w-12 h-6 rounded-full p-1 transition-colors"
              style={{
                backgroundColor: settings.testnet 
                  ? `rgb(var(--color-primary-500))` 
                  : `rgba(var(--color-surface-400), 0.3)`
              }}
            >
              <motion.div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: `rgb(var(--color-text-inverse))` }}
                animate={{ x: settings.testnet ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </motion.button>
          </div>

          {/* Theme - Professional Theme Active */}
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: `rgba(var(--color-text-primary), 0.8)` }}
            >
              <Palette 
                className="w-4 h-4 inline mr-2" 
                style={{ color: `rgb(var(--color-primary-500))` }}
              />
              Theme
            </label>
            <div 
              className="px-4 py-3 rounded-lg"
              style={{
                backgroundColor: `rgba(var(--color-surface-100), 0.1)`,
                border: `1px solid rgba(var(--color-border-primary), 0.2)`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div>
                    <div 
                      className="text-sm font-medium"
                      style={{ color: `rgb(var(--color-text-primary))` }}
                    >
                      Professional
                    </div>
                    <div 
                      className="text-xs"
                      style={{ color: `rgb(var(--color-text-secondary))` }}
                    >
                      Clean, modern theme optimized for professional trading
                    </div>
                  </div>
                </div>
                <CheckCircle 
                  className="w-4 h-4" 
                  style={{ color: `rgb(var(--color-accent-500))` }}
                />
              </div>
            </div>
          </div>

          {/* Disable Animations Toggle */}
          <div className="flex items-center justify-between">
            <label 
              className="flex items-center space-x-2"
              style={{ color: `rgba(var(--color-text-primary), 0.8)` }}
            >
              <span>Disable Background Animation</span>
            </label>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleInputChange('disable_animations', !settings.disable_animations)}
              className="w-12 h-6 rounded-full p-1 transition-colors"
              style={{
                backgroundColor: settings.disable_animations 
                  ? `rgb(var(--color-primary-500))` 
                  : `rgba(var(--color-surface-400), 0.3)`
              }}
            >
              <motion.div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: `rgb(var(--color-text-inverse))` }}
                animate={{ x: settings.disable_animations ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </motion.button>
          </div>
        </div>

        {/* Testnet Warning */}
        {settings.testnet && (
          <div 
            className="mt-4 p-3 rounded-lg"
            style={{
              backgroundColor: `rgba(var(--color-primary-500), 0.2)`,
              border: `1px solid rgba(var(--color-primary-500), 0.3)`
            }}
          >
            <div className="flex items-start space-x-2">
              <TestTube 
                className="w-4 h-4 mt-0.5 flex-shrink-0" 
                style={{ color: `rgb(var(--color-primary-500))` }}
              />
              <div>
                <div 
                  className="font-medium text-sm"
                  style={{ color: `rgb(var(--color-primary-500))` }}
                >
                  Testnet Mode Active
                </div>
                <div 
                  className="text-xs mt-1"
                  style={{ color: `rgba(var(--color-text-secondary), 0.8)` }}
                >
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
            className="flex-1 btn-theme-primary"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={testConnection}
            disabled={testResult === 'testing' || !settings.api_key || !settings.api_secret}
            className="flex-1 btn-theme-accent flex items-center justify-center space-x-2"
          >
            {testResult === 'testing' ? (
              <>
                <div 
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: `rgba(var(--color-text-inverse), 0.2)`,
                    borderTopColor: `rgb(var(--color-text-inverse))`
                  }}
                />
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
          <div 
            className="mt-4 p-3 rounded-lg"
            style={{
              backgroundColor: `rgba(239, 68, 68, 0.2)`, // red-500/20
              border: `1px solid rgba(239, 68, 68, 0.3)` // red-500/30
            }}
          >
            <div className="flex items-start space-x-2">
              <XCircle 
                className="w-4 h-4 mt-0.5 flex-shrink-0" 
                style={{ color: `rgb(248, 113, 113)` }} // red-400
              />
              <div>
                <div 
                  className="font-medium text-sm"
                  style={{ color: `rgb(248, 113, 113)` }} // red-400
                >
                  Connection Failed
                </div>
                <div 
                  className="text-xs mt-1"
                  style={{ color: `rgba(252, 165, 165, 0.8)` }} // red-300/80
                >
                  {testError}
                </div>
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
          className="glass-morphic p-6"
        >
          <h3 
            className="text-xl font-bold mb-4"
            style={{ color: `rgb(var(--color-text-primary))` }}
          >
            Account Information
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span style={{ color: `rgba(var(--color-text-primary), 0.8)` }}>Trading Enabled:</span>
              <span 
                className="font-medium"
                style={{ 
                  color: accountInfo.can_trade 
                    ? `rgb(var(--color-accent-500))` 
                    : `rgb(248, 113, 113)` // red-400
                }}
              >
                {accountInfo.can_trade ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div>
              <span 
                className="block mb-2"
                style={{ color: `rgba(var(--color-text-primary), 0.8)` }}
              >
                Balances:
              </span>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {accountInfo.balances
                  .filter(balance => balance.free > 0 || balance.locked > 0)
                  .map((balance, index) => (
                    <div 
                      key={index} 
                      className="rounded-lg p-2"
                      style={{ backgroundColor: `rgba(var(--color-surface-100), 0.05)` }}
                    >
                      <div 
                        className="font-medium"
                        style={{ color: `rgb(var(--color-text-primary))` }}
                      >
                        {balance.asset}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ color: `rgba(var(--color-text-secondary), 0.8)` }}
                      >
                        Free: {balance.free.toFixed(4)}
                      </div>
                      {balance.locked > 0 && (
                        <div 
                          className="text-sm"
                          style={{ color: `rgba(var(--color-text-secondary), 0.8)` }}
                        >
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

      {/* API Status Monitor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-morphic p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Monitor 
            className="w-6 h-6" 
            style={{ color: `rgb(var(--color-primary-500))` }}
          />
          <h2 
            className="text-xl font-bold"
            style={{ color: `rgb(var(--color-text-primary))` }}
          >
            API Status Monitor
          </h2>
        </div>
        
        <ApiStatus showDetails={true} />
        
        <div className="mt-4 text-sm" style={{ color: `rgba(var(--color-text-secondary), 0.8)` }}>
          <p>This monitor checks if the Tauri API is properly connected. If you see errors, try:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Restart the application</li>
            <li>Check if you're running in development mode</li>
            <li>Verify the Tauri configuration</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPanel;