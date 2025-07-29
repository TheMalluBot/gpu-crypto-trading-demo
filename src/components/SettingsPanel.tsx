import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { safeInvoke } from '../utils/tauri';
import { Settings, Key, Server, TestTube, CheckCircle, XCircle, Palette, Monitor } from 'lucide-react';
import SecureStorage from '../utils/secureStorage';
import NotificationManager from '../utils/notifications';
import HelpButton from './common/HelpButton';
import { HELP_CONTENT } from '../utils/helpContent';
import { ApiStatus } from './common/ApiStatus';
import { ToggleSwitch } from './common/ToggleSwitch';

interface AppSettings {
  api_key: string;
  api_secret: string;
  api_key_type: 'HMAC' | 'Ed25519' | 'RSA';
  base_url: string;
  testnet: boolean;
  disable_animations: boolean;
  performance_mode: boolean;
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
    api_key_type: 'HMAC',
    base_url: 'https://api.binance.com',
    testnet: false,
    disable_animations: false,
    performance_mode: false,
  });  
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string>('');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

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
        const loadedSettings = await safeInvoke<AppSettings>('load_settings');
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
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
      await safeInvoke('save_settings', { settings: nonSensitiveData });
      
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
      
      const connected = await safeInvoke<boolean>('test_connection', { settings });
      
      if (connected) {
        const account = await safeInvoke<AccountInfo>('get_account_info', { settings });
        if (account) {
          setAccountInfo(account);
        }
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
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Reset test result when API credentials change
    if (field === 'api_key' || field === 'api_secret' || field === 'api_key_type') {
      setTestResult('idle');
      setAccountInfo(null);
      
      // Real-time validation for API credentials based on key type
      if (typeof value === 'string' && value) {
        if (field === 'api_key') {
          switch (settings.api_key_type) {
            case 'HMAC':
              if (value.length < 60 || value.length > 70) {
                setValidationErrors(prev => ({ ...prev, [field]: 'HMAC API Key should be ~64 characters' }));
              }
              break;
            case 'Ed25519':
              if (value.length < 40 || value.length > 50) {
                setValidationErrors(prev => ({ ...prev, [field]: 'Ed25519 API Key should be ~44 characters' }));
              }
              break;
            case 'RSA':
              // RSA API keys are typically shorter identifiers
              if (value.length < 30) {
                setValidationErrors(prev => ({ ...prev, [field]: 'RSA API Key appears too short' }));
              }
              break;
          }
        } else if (field === 'api_secret') {
          switch (settings.api_key_type) {
            case 'HMAC':
              if (value.length < 60 || value.length > 70) {
                setValidationErrors(prev => ({ ...prev, [field]: 'HMAC API Secret should be ~64 characters' }));
              }
              break;
            case 'Ed25519':
              if (value.length < 80 || value.length > 100) {
                setValidationErrors(prev => ({ ...prev, [field]: 'Ed25519 Private Key appears invalid' }));
              }
              break;
            case 'RSA':
              if (!value.includes('-----BEGIN PRIVATE KEY-----')) {
                setValidationErrors(prev => ({ ...prev, [field]: 'RSA Private Key should be in PKCS#8 PEM format' }));
              }
              break;
          }
        }
      }
    }
    
    if (field === 'base_url' && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        if (value) {
          setValidationErrors(prev => ({ ...prev, [field]: 'Please enter a valid URL' }));
        }
      }
    }
  };

  const validateApiCredentials = () => {
    if (!settings.api_key) {
      return { isValid: false, message: 'API Key is required' };
    }
    
    switch (settings.api_key_type) {
      case 'HMAC':
        if (!settings.api_secret) {
          return { isValid: false, message: 'API Secret is required for HMAC keys' };
        }
        // HMAC keys are typically 64 characters (deprecated but still supported)
        if (settings.api_key.length < 60 || settings.api_key.length > 70) {
          return { isValid: false, message: 'HMAC API Key should be ~64 characters' };
        }
        if (settings.api_secret.length < 60 || settings.api_secret.length > 70) {
          return { isValid: false, message: 'HMAC API Secret should be ~64 characters' };
        }
        break;
        
      case 'Ed25519':
        if (!settings.api_secret) {
          return { isValid: false, message: 'Private Key is required for Ed25519 keys' };
        }
        // Ed25519 public keys are ~44 characters in base64
        if (settings.api_key.length < 40 || settings.api_key.length > 50) {
          return { isValid: false, message: 'Ed25519 API Key should be ~44 characters' };
        }
        // Ed25519 private keys in base64 are longer
        if (settings.api_secret.length < 80 || settings.api_secret.length > 100) {
          return { isValid: false, message: 'Ed25519 Private Key appears invalid' };
        }
        break;
        
      case 'RSA':
        if (!settings.api_secret) {
          return { isValid: false, message: 'Private Key is required for RSA keys' };
        }
        // RSA keys are in PEM format, much longer
        if (!settings.api_secret.includes('-----BEGIN PRIVATE KEY-----')) {
          return { isValid: false, message: 'RSA Private Key should be in PKCS#8 PEM format' };
        }
        break;
    }
    
    return { isValid: true, message: '' };
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Page Header with Help */}
      <div className="flex justify-between items-center">
        <h1 className="text-hierarchy-primary">Settings</h1>
        <HelpButton helpContent={HELP_CONTENT.settings} />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphic p-6 z-content"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Settings 
            className="w-6 h-6 text-primary-500" 
            aria-hidden="true"
          />
          <h2 className="text-xl sm:text-2xl font-bold text-theme-primary">
            Trading Settings
          </h2>
        </div>

        <div className="space-y-4">
          {/* API Key Type Selector */}
          <fieldset>
            <legend className="block text-sm font-medium mb-2 text-theme-primary">
              <Key 
                className="w-4 h-4 inline mr-2 text-primary-500" 
                aria-hidden="true"
              />
              API Key Type *
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['HMAC', 'Ed25519', 'RSA'] as const).map((keyType) => (
                <label key={keyType} className="relative">
                  <input
                    type="radio"
                    name="api_key_type"
                    value={keyType}
                    checked={settings.api_key_type === keyType}
                    onChange={(e) => handleInputChange('api_key_type', e.target.value as any)}
                    className="sr-only"
                  />
                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    settings.api_key_type === keyType
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="text-sm font-medium text-theme-primary">
                      {keyType}
                      {keyType === 'Ed25519' && (
                        <span className="ml-1 text-xs bg-green-500 text-white px-1 rounded">
                          Recommended
                        </span>
                      )}
                      {keyType === 'HMAC' && (
                        <span className="ml-1 text-xs bg-yellow-500 text-white px-1 rounded">
                          Deprecated
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-theme-tertiary mt-1">
                      {keyType === 'HMAC' && 'Symmetric encryption (legacy)'}
                      {keyType === 'Ed25519' && 'Fast & secure (modern)'}
                      {keyType === 'RSA' && 'Asymmetric encryption'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="text-xs mt-2 text-theme-tertiary">
              <strong>Ed25519</strong> is recommended by Binance for best performance and security. 
              <strong> HMAC</strong> keys are deprecated.
            </div>
          </fieldset>

          {/* API Key */}
          <div>
            <label 
              htmlFor="api-key-input"
              className="block text-sm font-medium mb-2 text-theme-primary"
            >
              <Key 
                className="w-4 h-4 inline mr-2 text-primary-500" 
                aria-hidden="true"
              />
              API Key *
            </label>
            <input
              id="api-key-input"
              type="password"
              value={settings.api_key}
              onChange={(e) => handleInputChange('api_key', e.target.value)}
              className={`input-theme ${validationErrors.api_key ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your Binance API Key"
              aria-describedby="api-key-help api-key-error"
              aria-required="true"
              aria-invalid={!!validationErrors.api_key}
            />
            <div id="api-key-help" className="text-xs mt-1 text-theme-tertiary">
              {settings.api_key_type === 'HMAC' && 'Your Binance API key (~64 characters)'}
              {settings.api_key_type === 'Ed25519' && 'Your Ed25519 public key (~44 characters)'}
              {settings.api_key_type === 'RSA' && 'Your RSA API key identifier'}
            </div>
            {validationErrors.api_key && (
              <div id="api-key-error" className="text-xs mt-1 text-red-400" role="alert">
                {validationErrors.api_key}
              </div>
            )}
          </div>

          {/* API Secret */}
          <div>
            <label 
              htmlFor="api-secret-input"
              className="block text-sm font-medium mb-2 text-theme-primary"
            >
              <Key 
                className="w-4 h-4 inline mr-2 text-primary-500" 
                aria-hidden="true"
              />
              {settings.api_key_type === 'HMAC' ? 'API Secret *' : 'Private Key *'}
            </label>
            <input
              id="api-secret-input"
              type="password"
              value={settings.api_secret}
              onChange={(e) => handleInputChange('api_secret', e.target.value)}
              className={`input-theme ${validationErrors.api_secret ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={
                settings.api_key_type === 'HMAC' 
                  ? 'Enter your Binance API Secret'
                  : settings.api_key_type === 'Ed25519'
                    ? 'Enter your Ed25519 private key'
                    : 'Enter your RSA private key (PKCS#8 PEM format)'
              }
              aria-describedby="api-secret-help api-secret-error"
              aria-required="true"
              aria-invalid={!!validationErrors.api_secret}
            />
            <div id="api-secret-help" className="text-xs mt-1 text-theme-tertiary">
              {settings.api_key_type === 'HMAC' && 'Your Binance API secret (~64 characters)'}
              {settings.api_key_type === 'Ed25519' && 'Your Ed25519 private key (base64 encoded)'}
              {settings.api_key_type === 'RSA' && 'Your RSA private key in PKCS#8 PEM format'}
            </div>
            {validationErrors.api_secret && (
              <div id="api-secret-error" className="text-xs mt-1 text-red-400" role="alert">
                {validationErrors.api_secret}
              </div>
            )}
          </div>

          {/* Base URL */}
          <div>
            <label 
              htmlFor="base-url-input"
              className="block text-sm font-medium mb-2 text-theme-primary"
            >
              <Server 
                className="w-4 h-4 inline mr-2 text-primary-500" 
                aria-hidden="true"
              />
              Base URL
            </label>
            <input
              id="base-url-input"
              type="url"
              value={settings.base_url}
              onChange={(e) => handleInputChange('base_url', e.target.value)}
              className={`input-theme ${validationErrors.base_url ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={settings.testnet ? "https://testnet.binance.vision" : "https://api.binance.com"}
              aria-describedby="base-url-help base-url-error"
              aria-invalid={!!validationErrors.base_url}
            />
            <div id="base-url-help" className="text-xs mt-1 text-theme-tertiary">
              {settings.testnet 
                ? 'Binance testnet API endpoint (https://testnet.binance.vision)'
                : 'Binance mainnet API endpoint (https://api.binance.com)'
              }
            </div>
            {validationErrors.base_url && (
              <div id="base-url-error" className="text-xs mt-1 text-red-400" role="alert">
                {validationErrors.base_url}
              </div>
            )}
          </div>

          {/* Testnet Toggle */}
          <div className="flex items-center justify-between">
            <label 
              htmlFor="testnet-toggle"
              className="flex items-center space-x-2 text-theme-primary cursor-pointer"
            >
              <TestTube 
                className="w-4 h-4 text-primary-500" 
                aria-hidden="true"
              />
              <div>
                <span>Use Testnet</span>
                <div id="testnet-help" className="text-xs mt-1 text-theme-tertiary">
                  {settings.testnet ? 'Using https://testnet.binance.vision' : 'Using live API'}
                </div>
              </div>
            </label>
            <ToggleSwitch
              id="testnet-toggle"
              checked={settings.testnet}
              onChange={(checked) => handleInputChange('testnet', checked)}
              ariaLabel="Toggle testnet mode"
              ariaDescribedBy="testnet-help"
            />
          </div>

          {/* Theme - Professional Theme Active */}
          <fieldset>
            <legend className="block text-sm font-medium mb-2 text-theme-primary">
              <Palette 
                className="w-4 h-4 inline mr-2 text-primary-500" 
                aria-hidden="true"
              />
              Theme
            </legend>
            <div className="card-theme px-4 py-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1" aria-hidden="true">
                    <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-theme-primary">
                      Professional
                    </div>
                    <div className="text-xs text-theme-secondary">
                      Clean, modern theme optimized for professional trading
                    </div>
                  </div>
                </div>
                <CheckCircle 
                  className="w-4 h-4 text-accent-500" 
                  aria-label="Current theme selected"
                />
              </div>
            </div>
          </fieldset>

          {/* Disable Animations Toggle */}
          <div className="flex items-center justify-between">
            <label 
              htmlFor="disable-animations-toggle"
              className="text-theme-primary cursor-pointer"
            >
              <span>Disable Background Animation</span>
              <div id="disable-animations-help" className="text-xs mt-1 text-theme-tertiary">
                {settings.disable_animations ? 'Background animation disabled' : 'Background animation enabled'}
              </div>
            </label>
            <ToggleSwitch
              id="disable-animations-toggle"
              checked={settings.disable_animations}
              onChange={(checked) => handleInputChange('disable_animations', checked)}
              ariaLabel="Toggle background animations"
              ariaDescribedBy="disable-animations-help"
            />
          </div>

          {/* Performance Mode Toggle */}
          <div className="flex items-center justify-between">
            <label 
              htmlFor="performance-mode-toggle"
              className="flex items-center space-x-2 text-theme-primary cursor-pointer"
            >
              <Monitor className="w-4 h-4 text-primary-500" aria-hidden="true" />
              <div>
                <span>Performance Mode</span>
                <div id="performance-mode-help" className="text-xs mt-1 text-theme-tertiary">
                  {settings.performance_mode ? 'Reduced animations for better performance' : 'Full visual effects enabled'}
                </div>
              </div>
            </label>
            <ToggleSwitch
              id="performance-mode-toggle"
              checked={settings.performance_mode}
              onChange={(checked) => handleInputChange('performance_mode', checked)}
              ariaLabel="Toggle performance mode"
              ariaDescribedBy="performance-mode-help"
            />
          </div>
        </div>

        {/* Testnet Warning */}
        {settings.testnet && (
          <div className="mt-4 p-3 rounded-lg alert-theme-info">
            <div className="flex items-start space-x-2">
              <TestTube 
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" 
              />
              <div>
                <div className="font-medium text-sm text-primary-500">
                  Testnet Mode Active
                </div>
                <div className="text-xs mt-1 text-theme-secondary">
                  You're using the Binance testnet. No real money will be used for trading.
                  <br />
                  <strong>Note:</strong> Create separate testnet API keys at{' '}
                  <a href="https://testnet.binance.vision" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                    testnet.binance.vision
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveSettings}
            disabled={loading || Object.keys(validationErrors).length > 0}
            className="flex-1 btn-theme-primary disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={testConnection}
            disabled={testResult === 'testing' || !settings.api_key || Object.keys(validationErrors).length > 0}
            className="flex-1 btn-theme-accent flex items-center justify-center space-x-2 disabled:opacity-50"
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
          <div className="mt-4 p-3 rounded-lg alert-theme-error">
            <div className="flex items-start space-x-2">
              <XCircle 
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" 
              />
              <div>
                <div className="font-medium text-sm text-red-400">
                  Connection Failed
                </div>
                <div className="text-xs mt-1 text-red-300/80">
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
          className="glass-morphic p-6 z-content"
        >
          <h3 className="text-xl font-bold mb-4 text-theme-primary">
            Account Information
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-theme-primary">Trading Enabled:</span>
              <span 
                className={`font-medium ${
                  accountInfo.can_trade ? 'text-accent-500' : 'text-red-400'
                }`}
              >
                {accountInfo.can_trade ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div>
              <span className="block mb-2 text-theme-primary">
                Balances:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {accountInfo.balances
                  .filter(balance => balance.free > 0 || balance.locked > 0)
                  .map((balance, index) => (
                    <div 
                      key={index} 
                      className="rounded-lg p-2 bg-theme-surface"
                    >
                      <div className="font-medium text-theme-primary">
                        {balance.asset}
                      </div>
                      <div className="text-sm text-theme-secondary">
                        Free: {balance.free.toFixed(4)}
                      </div>
                      {balance.locked > 0 && (
                        <div className="text-sm text-theme-secondary">
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
        className="glass-morphic p-6 z-content"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Monitor 
            className="w-6 h-6 text-primary-500" 
            aria-hidden="true"
          />
          <h2 className="text-xl font-bold text-theme-primary">
            API Status Monitor
          </h2>
        </div>
        
        <ApiStatus showDetails={true} />
        
        <div className="mt-4 text-sm text-theme-secondary">
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