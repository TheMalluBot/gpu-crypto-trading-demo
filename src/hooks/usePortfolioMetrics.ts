// Portfolio Metrics Hook - Real-time Portfolio Analytics
// Phase 3 Week 7 - Advanced Trading Agent Implementation

import { useState, useCallback, useEffect, useMemo } from 'react';
import { safeInvoke } from '../utils/tauri';

interface PortfolioMetrics {
  totalValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dailyPnl: number;
  totalReturn: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown: number;
  calmarRatio?: number;
  valueAtRisk: number;
  beta?: number;
  alpha?: number;
  winRate: number;
  profitFactor: number;
  positionsCount: number;
  riskExposure: number;
}

interface PerformanceReport {
  periodStart: string;
  periodEnd: string;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
  maxDrawdown: number;
  valueAtRisk95: number;
}

export const usePortfolioMetrics = () => {
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Get current portfolio metrics
  const getPortfolioMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const metrics = await safeInvoke<PortfolioMetrics>('get_portfolio_metrics');

      if (metrics) {
        setPortfolioMetrics(metrics);
        setLastUpdateTime(new Date());
        return metrics;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get portfolio metrics';
      setError(errorMessage);
      console.error('Portfolio metrics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get performance report for a specific period
  const getPerformanceReport = useCallback(async (periodDays: number = 30) => {
    try {
      setIsLoading(true);
      setError(null);

      const report = await safeInvoke<PerformanceReport>('get_performance_report', {
        periodDays,
      });

      if (report) {
        setPerformanceReport(report);
        return report;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get performance report';
      setError(errorMessage);
      console.error('Performance report error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh all metrics
  const refreshMetrics = useCallback(
    async (reportPeriodDays: number = 30) => {
      await Promise.all([getPortfolioMetrics(), getPerformanceReport(reportPeriodDays)]);
    },
    [getPortfolioMetrics, getPerformanceReport]
  );

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    // Initial load
    refreshMetrics();

    // Set up auto-refresh
    const interval = setInterval(() => {
      refreshMetrics();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshMetrics]);

  // Computed portfolio health indicators
  const portfolioHealth = useMemo(() => {
    if (!portfolioMetrics) return null;

    // Calculate health score based on various metrics
    let healthScore = 50; // Start with neutral

    // Positive indicators
    if (portfolioMetrics.totalReturn > 0) healthScore += 10;
    if (portfolioMetrics.sharpeRatio && portfolioMetrics.sharpeRatio > 1) healthScore += 15;
    if (portfolioMetrics.winRate > 60) healthScore += 10;
    if (portfolioMetrics.profitFactor > 1.5) healthScore += 10;
    if (portfolioMetrics.maxDrawdown < 10) healthScore += 5;

    // Negative indicators
    if (portfolioMetrics.totalReturn < -5) healthScore -= 15;
    if (portfolioMetrics.maxDrawdown > 20) healthScore -= 15;
    if (portfolioMetrics.winRate < 40) healthScore -= 10;
    if (portfolioMetrics.profitFactor < 1) healthScore -= 20;
    if (portfolioMetrics.riskExposure > 80) healthScore -= 10;

    // Clamp between 0 and 100
    healthScore = Math.max(0, Math.min(100, healthScore));

    let healthLevel: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
    if (healthScore >= 80) healthLevel = 'Excellent';
    else if (healthScore >= 65) healthLevel = 'Good';
    else if (healthScore >= 50) healthLevel = 'Fair';
    else if (healthScore >= 30) healthLevel = 'Poor';
    else healthLevel = 'Critical';

    return {
      score: healthScore,
      level: healthLevel,
      isHealthy: healthScore >= 65,
      needsAttention: healthScore < 50,
    };
  }, [portfolioMetrics]);

  // Risk assessment based on metrics
  const riskProfile = useMemo(() => {
    if (!portfolioMetrics) return null;

    let riskScore = 0;
    const factors: { factor: string; impact: number; description: string }[] = [];

    // Volatility risk (based on Sharpe ratio)
    if (portfolioMetrics.sharpeRatio !== undefined) {
      if (portfolioMetrics.sharpeRatio < 0.5) {
        riskScore += 20;
        factors.push({
          factor: 'Low Sharpe Ratio',
          impact: 20,
          description: 'Returns not compensating for risk taken',
        });
      }
    }

    // Drawdown risk
    if (portfolioMetrics.maxDrawdown > 15) {
      const impact = Math.min(25, portfolioMetrics.maxDrawdown);
      riskScore += impact;
      factors.push({
        factor: 'High Drawdown',
        impact,
        description: `Maximum drawdown of ${portfolioMetrics.maxDrawdown.toFixed(1)}%`,
      });
    }

    // Concentration risk
    if (portfolioMetrics.riskExposure > 70) {
      const impact = Math.min(20, (portfolioMetrics.riskExposure - 70) / 2);
      riskScore += impact;
      factors.push({
        factor: 'High Concentration',
        impact,
        description: `${portfolioMetrics.riskExposure.toFixed(1)}% risk exposure`,
      });
    }

    // Performance consistency risk
    if (portfolioMetrics.winRate < 45) {
      const impact = Math.min(15, (45 - portfolioMetrics.winRate) / 2);
      riskScore += impact;
      factors.push({
        factor: 'Low Win Rate',
        impact,
        description: `Only ${portfolioMetrics.winRate.toFixed(1)}% winning trades`,
      });
    }

    // VaR risk
    const varPercentage = (portfolioMetrics.valueAtRisk / portfolioMetrics.totalValue) * 100;
    if (varPercentage > 5) {
      const impact = Math.min(15, varPercentage - 5);
      riskScore += impact;
      factors.push({
        factor: 'High Value at Risk',
        impact,
        description: `${varPercentage.toFixed(1)}% of portfolio at risk`,
      });
    }

    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    if (riskScore <= 20) riskLevel = 'Low';
    else if (riskScore <= 40) riskLevel = 'Medium';
    else if (riskScore <= 70) riskLevel = 'High';
    else riskLevel = 'Critical';

    return {
      score: Math.min(100, riskScore),
      level: riskLevel,
      factors,
      isAcceptable: riskScore <= 40,
      needsAction: riskScore > 60,
    };
  }, [portfolioMetrics]);

  // Performance trends (requires historical data)
  const performanceTrends = useMemo(() => {
    if (!performanceReport || !portfolioMetrics) return null;

    return {
      isImproving: portfolioMetrics.totalReturn > 0,
      volatilityTrend: performanceReport.volatility,
      returnConsistency: performanceReport.sharpeRatio,
      winRateStability: performanceReport.winRate,
      drawdownRecovery: portfolioMetrics.maxDrawdown < 10 ? 'Good' : 'Needs Improvement',
    };
  }, [performanceReport, portfolioMetrics]);

  // Trading statistics summary
  const tradingStats = useMemo(() => {
    if (!portfolioMetrics || !performanceReport) return null;

    const avgTradeSize = portfolioMetrics.totalValue / Math.max(1, performanceReport.totalTrades);
    const profitPerTrade =
      portfolioMetrics.realizedPnl / Math.max(1, performanceReport.totalTrades);
    const lossPerTrade =
      portfolioMetrics.realizedPnl < 0
        ? Math.abs(portfolioMetrics.realizedPnl) /
          Math.max(1, performanceReport.totalTrades - performanceReport.profitableTrades)
        : 0;

    return {
      totalTrades: performanceReport.totalTrades,
      profitableTrades: performanceReport.profitableTrades,
      losingTrades: performanceReport.totalTrades - performanceReport.profitableTrades,
      averageTradeSize: avgTradeSize,
      averageProfit: profitPerTrade,
      averageLoss: lossPerTrade,
      profitLossRatio: lossPerTrade > 0 ? profitPerTrade / lossPerTrade : 0,
      expectancy:
        (portfolioMetrics.winRate / 100) * profitPerTrade -
        ((100 - portfolioMetrics.winRate) / 100) * lossPerTrade,
    };
  }, [portfolioMetrics, performanceReport]);

  return {
    // Raw data
    portfolioMetrics,
    performanceReport,

    // Computed insights
    portfolioHealth,
    riskProfile,
    performanceTrends,
    tradingStats,

    // State
    isLoading,
    error,
    lastUpdateTime,

    // Actions
    getPortfolioMetrics,
    getPerformanceReport,
    refreshMetrics,
  };
};
