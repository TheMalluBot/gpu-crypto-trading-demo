import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './bot/ErrorBoundary';
import { AssetManagerPanel } from './asset/AssetManagerPanel';
import { AutomatedAssetManagerStatus } from './asset/AutomatedAssetManagerStatus';
import { BotStatusPanel } from './bot/BotStatusPanel';
import { BotOnboardingModal } from './bot/BotOnboardingModal';
import { MarketConditions } from './bot/MarketConditions';
import ImprovedBotConfigForm from './bot/ImprovedBotConfigForm';
import { SignalChart } from './bot/SignalChart';
import { VirtualPortfolio } from './bot/VirtualPortfolio';
import { PositionStatus } from './bot/PositionStatus';
import { PerformanceMetrics } from './bot/PerformanceMetrics';
import { RecentSignals } from './bot/RecentSignals';
import { useBotData } from '../hooks/useBotData';
import { getSignalColor, getMarketPhaseColor } from '../utils/formatters';
import HelpButton from './common/HelpButton';
import { ConfirmationModal } from './common/ConfirmationModal';
import { HELP_CONTENT } from '../utils/helpContent';
const SwingBotPanel: React.FC = React.memo(() => {
  const [showConfig, setShowConfig] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [showAssetManager, setShowAssetManager] = useState(false);
  const {
    botStatus,
    signals,
    chartData,
    performanceData,
    marketConditions,
    virtualPortfolio,
    config,
    loading,
    setConfig,
    toggleBot,
    pauseBot,
    resumeBot,
    triggerEmergencyStop,
    updateAccountBalance,
    resetVirtualPortfolio,
    assetManager,
  } = useBotData();

  // Performance optimizations - memoized data available for future use

  // Check if user has seen onboarding - with improved UX
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('bot-onboarding-completed');
    const dismissedToday = localStorage.getItem('bot-onboarding-dismissed-today');
    const remindLater = localStorage.getItem('bot-onboarding-remind-later');
    const today = new Date().toDateString();

    // Don't show if already completed
    if (hasSeenOnboarding) return;

    // Don't show if dismissed today
    if (dismissedToday === today) return;

    // Don't show if remind later is set and time hasn't passed
    if (remindLater && new Date(remindLater) > new Date()) return;

    // Only show after a delay to avoid immediate popup
    if (botStatus) {
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 3000); // 3 second delay

      return () => clearTimeout(timer);
    }
  }, [botStatus]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('bot-onboarding-completed', 'true');
    // Clear any temporary dismissals
    localStorage.removeItem('bot-onboarding-dismissed-today');
    localStorage.removeItem('bot-onboarding-remind-later');
    setShowOnboarding(false);
  };

  const handleOnboardingDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem('bot-onboarding-dismissed-today', today);
    setShowOnboarding(false);
  };

  const handleRemindLater = () => {
    const remindTime = new Date();
    remindTime.setHours(remindTime.getHours() + 24); // Remind in 24 hours
    localStorage.setItem('bot-onboarding-remind-later', remindTime.toISOString());
    setShowOnboarding(false);
  };

  const handleShowOnboarding = () => {
    setShowOnboarding(true);
  };

  if (!botStatus) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="glass-morphic p-6 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full"></div>
          <span className="ml-3 text-theme-primary">Loading bot status...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Page Header with Help */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-hierarchy-primary">Trading Bot</h1>
            {/* Paper Mode Badge */}
            {botStatus?.config.paper_trading_enabled && (
              <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs sm:text-sm">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-semibold text-blue-400">PAPER</span>
                <span className="hidden sm:inline text-blue-300/70">No Real Money</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleShowOnboarding}
              className="btn-theme-secondary text-sm px-3 py-2 sm:px-4 sm:py-3"
              aria-label="Open getting started tutorial"
            >
              Getting Started
            </button>
            <button
              onClick={() => setShowAssetManager(true)}
              className="btn-theme-secondary text-sm px-3 py-2 sm:px-4 sm:py-3"
              aria-label="Open asset management system"
            >
              Asset Manager
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="btn-theme-primary text-sm px-3 py-2 sm:px-4 sm:py-3"
              aria-expanded={showConfig}
              aria-controls="bot-config-panel"
              aria-label={showConfig ? 'Hide bot configuration' : 'Show bot configuration'}
            >
              {showConfig ? 'Hide Config' : 'Configure Bot'}
            </button>
            <HelpButton helpContent={HELP_CONTENT.bot} />
          </div>
        </div>
        {/* Bot Status Panel */}
        <BotStatusPanel
          botStatus={botStatus}
          onStart={toggleBot}
          onStop={toggleBot}
          onPause={pauseBot}
          onResume={resumeBot}
          onEmergencyStop={() => setShowEmergencyConfirm(true)}
          loading={loading}
        />

        {/* Market Conditions */}
        <MarketConditions
          marketConditions={marketConditions}
          config={config}
          botStatus={botStatus}
        />

        {/* Automated Asset Manager Status */}
        <AutomatedAssetManagerStatus assetManager={assetManager} className="mb-4" />

        {/* Configuration Panel */}
        {showConfig && (
          <div id="bot-config-panel" role="region" aria-labelledby="bot-config-heading">
            <ImprovedBotConfigForm
              config={config}
              setConfig={setConfig}
              botStatus={botStatus}
              marketConditions={marketConditions}
              updateAccountBalance={updateAccountBalance}
            />
          </div>
        )}

        {/* Signal Chart */}
        <SignalChart
          chartData={chartData}
          config={config}
          showChart={showChart}
          setShowChart={setShowChart}
        />

        {/* Virtual Portfolio (Paper Trading) */}
        <VirtualPortfolio
          virtualPortfolio={virtualPortfolio}
          config={config}
          resetVirtualPortfolio={resetVirtualPortfolio}
        />

        {/* Position Status and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PositionStatus botStatus={botStatus} config={config} />

          <PerformanceMetrics botStatus={botStatus} performanceData={performanceData} />
        </div>

        {/* Recent Signals */}
        <RecentSignals
          signals={signals}
          config={config}
          getSignalColor={getSignalColor}
          getMarketPhaseColor={getMarketPhaseColor}
        />

        {/* Onboarding Modal */}
        <BotOnboardingModal
          isOpen={showOnboarding}
          onClose={handleOnboardingDismiss}
          onComplete={handleOnboardingComplete}
          onRemindLater={handleRemindLater}
        />

        {/* Asset Manager Panel */}
        <AssetManagerPanel
          isVisible={showAssetManager}
          onToggle={() => setShowAssetManager(false)}
        />

        {/* Emergency Stop Confirmation */}
        <ConfirmationModal
          isOpen={showEmergencyConfirm}
          onClose={() => setShowEmergencyConfirm(false)}
          onConfirm={() => {
            triggerEmergencyStop('User initiated emergency stop');
            setShowEmergencyConfirm(false);
          }}
          title="Emergency Stop"
          message="Are you sure you want to trigger an emergency stop? This will immediately close all open positions and stop the bot."
          confirmText="Emergency Stop"
          type="danger"
        />
      </div>
    </ErrorBoundary>
  );
});
export default SwingBotPanel;
