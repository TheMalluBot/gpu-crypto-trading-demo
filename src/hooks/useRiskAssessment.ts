// Risk Assessment Hook - Advanced Risk Management
// Phase 3 Week 7 - Advanced Trading Agent Implementation

import { useState, useCallback, useEffect, useMemo } from 'react';
import { safeInvoke } from '../utils/tauri';

interface RiskAssessment {
  positionRisk: number;
  portfolioRisk: number;
  correlationRisk: number;
  liquidityRisk: number;
  concentrationRisk: number;
  marketRisk: number;
  var1Day: number;
  var1Week: number;
  stressTestScenarios: StressTestResult[];
  riskWarnings: RiskWarning[];
}

interface StressTestResult {
  scenarioName: string;
  potentialLoss: number;
  probability: number;
  impactSeverity: string;
}

interface RiskWarning {
  warningType: string;
  severity: string;
  message: string;
  recommendedAction: string;
}

interface RiskAlert {
  id: string;
  type: 'VaR' | 'Concentration' | 'Correlation' | 'Liquidity' | 'Drawdown' | 'Leverage';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  currentValue: number;
  thresholdValue: number;
  recommendedActions: string[];
  triggeredAt: Date;
}

export const useRiskAssessment = () => {
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Get current risk assessment
  const assessRisk = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const assessment = await safeInvoke<RiskAssessment>('assess_portfolio_risk');

      if (assessment) {
        setRiskAssessment(assessment);
        setLastUpdateTime(new Date());

        // Process risk warnings into alerts
        const alerts: RiskAlert[] = assessment.riskWarnings.map((warning, index) => ({
          id: `warning-${index}-${Date.now()}`,
          type: mapWarningTypeToAlertType(warning.warningType),
          severity: warning.severity as 'Low' | 'Medium' | 'High' | 'Critical',
          message: warning.message,
          currentValue: 0, // Would need to be extracted from warning context
          thresholdValue: 0, // Would need to be extracted from warning context
          recommendedActions: [warning.recommendedAction],
          triggeredAt: new Date(),
        }));

        setRiskAlerts(alerts);
        return assessment;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assess portfolio risk';
      setError(errorMessage);
      console.error('Risk assessment error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh risk assessment every 15 seconds
  useEffect(() => {
    // Initial load
    assessRisk();

    // Set up auto-refresh
    const interval = setInterval(() => {
      assessRisk();
    }, 15000); // 15 seconds - risk needs frequent updates

    return () => clearInterval(interval);
  }, [assessRisk]);

  // Computed risk metrics and insights
  const riskSummary = useMemo(() => {
    if (!riskAssessment) return null;

    // Calculate overall risk score (0-100)
    const weights = {
      position: 0.2,
      portfolio: 0.25,
      correlation: 0.15,
      liquidity: 0.1,
      concentration: 0.2,
      market: 0.1,
    };

    const normalizedRisks = {
      position: Math.min(100, riskAssessment.positionRisk * 10), // Assuming 0-10 scale
      portfolio: Math.min(100, riskAssessment.portfolioRisk * 5), // Assuming 0-20 scale
      correlation: Math.min(100, riskAssessment.correlationRisk * 10),
      liquidity: Math.min(100, riskAssessment.liquidityRisk * 20),
      concentration: Math.min(100, riskAssessment.concentrationRisk * 5),
      market: Math.min(100, riskAssessment.marketRisk * 5),
    };

    const overallRiskScore = Object.entries(weights).reduce(
      (total, [key, weight]) =>
        total + normalizedRisks[key as keyof typeof normalizedRisks] * weight,
      0
    );

    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    if (overallRiskScore <= 25) riskLevel = 'Low';
    else if (overallRiskScore <= 50) riskLevel = 'Medium';
    else if (overallRiskScore <= 75) riskLevel = 'High';
    else riskLevel = 'Critical';

    return {
      overallScore: overallRiskScore,
      level: riskLevel,
      breakdown: normalizedRisks,
      isAcceptable: overallRiskScore <= 60,
      requiresAction: overallRiskScore > 75,
    };
  }, [riskAssessment]);

  // VaR analysis
  const varAnalysis = useMemo(() => {
    if (!riskAssessment) return null;

    return {
      dailyVaR: riskAssessment.var1Day,
      weeklyVaR: riskAssessment.var1Week,
      varRatio: riskAssessment.var1Week / (riskAssessment.var1Day * Math.sqrt(7)), // Should be close to 1 for normal distribution
      isVarReasonable: riskAssessment.var1Week / (riskAssessment.var1Day * Math.sqrt(7)) <= 1.2,
      varTrend: riskAssessment.var1Week > riskAssessment.var1Day * 5 ? 'Increasing' : 'Stable',
    };
  }, [riskAssessment]);

  // Stress test analysis
  const stressTestAnalysis = useMemo(() => {
    if (!riskAssessment || !riskAssessment.stressTestScenarios) return null;

    const scenarios = riskAssessment.stressTestScenarios;
    const totalLoss = scenarios.reduce((sum, scenario) => sum + scenario.potentialLoss, 0);
    const averageLoss = totalLoss / scenarios.length;

    const criticalScenarios = scenarios.filter(s => s.impactSeverity === 'Critical');
    const highImpactScenarios = scenarios.filter(s => s.impactSeverity === 'High');

    const worstCaseScenario = scenarios.reduce(
      (worst, current) => (current.potentialLoss > worst.potentialLoss ? current : worst),
      scenarios[0]
    );

    return {
      totalScenarios: scenarios.length,
      criticalCount: criticalScenarios.length,
      highImpactCount: highImpactScenarios.length,
      averageLoss,
      worstCaseScenario,
      passesStressTest: criticalScenarios.length === 0,
    };
  }, [riskAssessment]);

  // Risk concentration analysis
  const concentrationAnalysis = useMemo(() => {
    if (!riskAssessment) return null;

    const concentrationLevel = riskAssessment.concentrationRisk;

    let concentrationRating:
      | 'Well Diversified'
      | 'Moderately Concentrated'
      | 'Highly Concentrated'
      | 'Over Concentrated';
    if (concentrationLevel <= 20) concentrationRating = 'Well Diversified';
    else if (concentrationLevel <= 40) concentrationRating = 'Moderately Concentrated';
    else if (concentrationLevel <= 70) concentrationRating = 'Highly Concentrated';
    else concentrationRating = 'Over Concentrated';

    return {
      level: concentrationLevel,
      rating: concentrationRating,
      needsDiversification: concentrationLevel > 50,
      isHealthy: concentrationLevel <= 40,
    };
  }, [riskAssessment]);

  // Correlation risk analysis
  const correlationAnalysis = useMemo(() => {
    if (!riskAssessment) return null;

    const correlationLevel = riskAssessment.correlationRisk;

    return {
      level: correlationLevel,
      isHigh: correlationLevel > 60,
      impactOnDiversification:
        correlationLevel > 70
          ? 'Severely Reduced'
          : correlationLevel > 50
            ? 'Moderately Reduced'
            : 'Minimal Impact',
      recommendsHedging: correlationLevel > 70,
    };
  }, [riskAssessment]);

  // Liquidity risk analysis
  const liquidityAnalysis = useMemo(() => {
    if (!riskAssessment) return null;

    const liquidityLevel = riskAssessment.liquidityRisk;

    let liquidityRating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Concerning';
    if (liquidityLevel <= 1) liquidityRating = 'Excellent';
    else if (liquidityLevel <= 2) liquidityRating = 'Good';
    else if (liquidityLevel <= 3) liquidityRating = 'Fair';
    else if (liquidityLevel <= 5) liquidityRating = 'Poor';
    else liquidityRating = 'Concerning';

    return {
      level: liquidityLevel,
      rating: liquidityRating,
      canExitQuickly: liquidityLevel <= 2,
      needsLiquidityBuffer: liquidityLevel > 3,
    };
  }, [riskAssessment]);

  // Priority actions based on risk assessment
  const priorityActions = useMemo(() => {
    if (!riskAssessment || !riskSummary) return [];

    const actions: { priority: 'High' | 'Medium' | 'Low'; action: string; reason: string }[] = [];

    // Critical risk level
    if (riskSummary.level === 'Critical') {
      actions.push({
        priority: 'High',
        action: 'Reduce position sizes immediately',
        reason: 'Overall risk level is critical',
      });
    }

    // High concentration
    if (riskAssessment.concentrationRisk > 70) {
      actions.push({
        priority: 'High',
        action: 'Diversify portfolio holdings',
        reason: 'Concentration risk exceeds safe limits',
      });
    }

    // High correlation
    if (riskAssessment.correlationRisk > 70) {
      actions.push({
        priority: 'Medium',
        action: 'Add uncorrelated assets or hedging positions',
        reason: 'High correlation reduces diversification benefits',
      });
    }

    // Liquidity concerns
    if (riskAssessment.liquidityRisk > 4) {
      actions.push({
        priority: 'Medium',
        action: 'Increase liquidity buffer',
        reason: 'Liquidity risk may impact ability to exit positions',
      });
    }

    // VaR concerns
    if (varAnalysis && !varAnalysis.isVarReasonable) {
      actions.push({
        priority: 'Medium',
        action: 'Review risk models and position sizing',
        reason: 'VaR calculations suggest unusual risk distribution',
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [riskAssessment, riskSummary, varAnalysis]);

  // Dismiss a risk alert
  const dismissAlert = useCallback((alertId: string) => {
    setRiskAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setRiskAlerts([]);
  }, []);

  return {
    // Raw data
    riskAssessment,
    riskAlerts,

    // Computed insights
    riskSummary,
    varAnalysis,
    stressTestAnalysis,
    concentrationAnalysis,
    correlationAnalysis,
    liquidityAnalysis,
    priorityActions,

    // State
    isLoading,
    error,
    lastUpdateTime,

    // Actions
    assessRisk,
    dismissAlert,
    clearAllAlerts,
  };
};

// Helper function to map warning types to alert types
function mapWarningTypeToAlertType(warningType: string): RiskAlert['type'] {
  const type = warningType.toLowerCase();
  if (type.includes('var') || type.includes('value at risk')) return 'VaR';
  if (type.includes('concentration')) return 'Concentration';
  if (type.includes('correlation')) return 'Correlation';
  if (type.includes('liquidity')) return 'Liquidity';
  if (type.includes('drawdown')) return 'Drawdown';
  if (type.includes('leverage')) return 'Leverage';
  return 'VaR'; // Default
}
