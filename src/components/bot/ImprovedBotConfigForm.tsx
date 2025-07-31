import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, Zap, Save, X } from 'lucide-react';
import { safeInvoke } from '../../utils/tauri';
import { LROConfig, BotStatus, MarketConditions } from '../../types/bot';
import { BasicConfigSection } from './config/BasicConfigSection';
import { RiskManagementSection } from './config/RiskManagementSection';
import { AdvancedConfigSection } from './config/AdvancedConfigSection';
import PresetSelector from './PresetSelector';
import NotificationManager from '../../utils/notifications';

interface ImprovedBotConfigFormProps {
  config: LROConfig;
  setConfig: (config: LROConfig) => void;
  botStatus: BotStatus;
  marketConditions: MarketConditions | null;
  updateAccountBalance: (balance: number) => void;
}

type ConfigTab = 'basic' | 'risk' | 'advanced';

const ImprovedBotConfigForm: React.FC<ImprovedBotConfigFormProps> = ({
  config,
  setConfig,
  botStatus,
  marketConditions,
  updateAccountBalance,
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>('basic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleConfigChange = (key: keyof LROConfig, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setHasUnsavedChanges(true);

    // Auto-save to backend with error handling
    safeInvoke('update_bot_config', { config: newConfig }).catch(error => {
      console.error('Failed to save config:', error);
      NotificationManager.error(
        'Configuration Error',
        'Failed to save configuration changes. Please try again.'
      );
    });
  };

  const handlePresetSelect = (presetConfig: Partial<LROConfig>) => {
    const newConfig = { ...config, ...presetConfig };
    setConfig(newConfig);
    setHasUnsavedChanges(false);

    safeInvoke('update_bot_config', { config: newConfig }).catch(error => {
      console.error('Failed to apply preset:', error);
      NotificationManager.error(
        'Preset Error',
        'Failed to apply preset configuration. Please try again.'
      );
    });

    setShowPresets(false);
    NotificationManager.success('Preset Applied', 'Configuration updated successfully');
  };

  const tabConfig = [
    {
      id: 'basic' as ConfigTab,
      label: 'Basic Settings',
      icon: Zap,
      description: 'Core trading parameters',
    },
    {
      id: 'risk' as ConfigTab,
      label: 'Risk Management',
      icon: Shield,
      description: 'Position and risk controls',
    },
    {
      id: 'advanced' as ConfigTab,
      label: 'Advanced',
      icon: Settings,
      description: 'AI adaptation and automation',
    },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'basic':
        return <BasicConfigSection config={config} onConfigChange={handleConfigChange} />;
      case 'risk':
        return <RiskManagementSection config={config} onConfigChange={handleConfigChange} />;
      case 'advanced':
        return (
          <AdvancedConfigSection
            config={config}
            onConfigChange={handleConfigChange}
            botStatus={botStatus}
            marketConditions={marketConditions}
            updateAccountBalance={updateAccountBalance}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Bot Configuration</h2>
          <p className="text-theme-secondary mt-1">Optimize your trading strategy parameters</p>
        </div>

        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 text-amber-400">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-sm">Auto-saving...</span>
            </div>
          )}

          <button onClick={() => setShowPresets(true)} className="btn-theme-secondary">
            <Settings className="w-4 h-4" />
            Load Preset
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-theme-surface rounded-lg p-1 border border-theme-border">
        <div className="flex space-x-1">
          {tabConfig.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md 
                  transition-all duration-200 relative
                  ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-background/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <div className="hidden sm:block">
                  <div className="font-medium text-sm">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-[600px]"
        >
          {renderActiveTab()}
        </motion.div>
      </AnimatePresence>

      {/* Preset Selector Modal */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPresets(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-theme-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-theme-border">
                <h3 className="text-xl font-bold text-theme-primary">
                  Choose Configuration Preset
                </h3>
                <button
                  onClick={() => setShowPresets(false)}
                  className="p-2 hover:bg-theme-background rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-theme-secondary" />
                </button>
              </div>

              <div className="p-6">
                <PresetSelector onPresetSelect={handlePresetSelect} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImprovedBotConfigForm;
