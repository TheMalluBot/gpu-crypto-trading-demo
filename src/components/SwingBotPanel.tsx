import React, { useState } from 'react';
import { ErrorBoundary } from './bot/ErrorBoundary';
import { BotControlPanel } from './bot/BotControlPanel';
import { MarketConditions } from './bot/MarketConditions';
import { BotConfigForm } from './bot/BotConfigForm';
import { SignalChart } from './bot/SignalChart';
import { VirtualPortfolio } from './bot/VirtualPortfolio';
import { PositionStatus } from './bot/PositionStatus';
import { PerformanceMetrics } from './bot/PerformanceMetrics';
import { RecentSignals } from './bot/RecentSignals';
import { useBotData } from '../hooks/useBotData';
import { getSignalColor, getMarketPhaseColor } from '../utils/botHelpers';

const SwingBotPanel: React.FC = () => {
  const [showConfig, setShowConfig] = useState(false);
  const [showChart, setShowChart] = useState(true);

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
    triggerEmergencyStop,
    resetEmergencyStop,
    updateAccountBalance,
    resetVirtualPortfolio,
    simulateData,
    applyStrategyPreset,
  } = useBotData();

  if (!botStatus) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="glass-morphic p-6 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-white">Loading bot status...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Bot Control Header */}
        <BotControlPanel
          botStatus={botStatus}
          config={config}
          loading={loading}
          showConfig={showConfig}
          setShowConfig={setShowConfig}
          toggleBot={toggleBot}
          simulateData={simulateData}
          triggerEmergencyStop={triggerEmergencyStop}
          resetEmergencyStop={resetEmergencyStop}
          getSignalColor={getSignalColor}
        />

        {/* Market Conditions */}
        <MarketConditions
          marketConditions={marketConditions}
          config={config}
          botStatus={botStatus}
        />

        {/* Configuration Panel */}
        {showConfig && (
          <BotConfigForm
            config={config}
            setConfig={setConfig}
            botStatus={botStatus}
            marketConditions={marketConditions}
            updateAccountBalance={updateAccountBalance}
            applyStrategyPreset={applyStrategyPreset}
          />
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
          <PositionStatus
            botStatus={botStatus}
            config={config}
          />
          
          <PerformanceMetrics
            botStatus={botStatus}
            performanceData={performanceData}
          />
        </div>

        {/* Recent Signals */}
        <RecentSignals
          signals={signals}
          config={config}
          getSignalColor={getSignalColor}
          getMarketPhaseColor={getMarketPhaseColor}
        />
      </div>
    </ErrorBoundary>
  );
};

export default SwingBotPanel;