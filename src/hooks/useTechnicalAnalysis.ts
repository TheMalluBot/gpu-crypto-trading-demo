// Technical Analysis Hook - Professional Market Analysis
// Phase 3 Week 7 - Advanced Trading Agent Implementation

import { useState, useCallback, useEffect, useMemo } from 'react';
import { safeInvoke } from '../utils/tauri';

interface TechnicalAnalysis {
  symbol: string;
  timeframe: string;
  timestamp: string;
  currentPrice: number;
  trendDirection: string;
  trendStrength: number;
  rsi: number;
  macdSignal: string;
  bollingerPosition: number;
  volumeTrend: string;
  supportLevels: number[];
  resistanceLevels: number[];
  signals: TradingSignal[];
  overallSentiment: string;
  confidenceScore: number;
}

interface TradingSignal {
  signalType: string;
  strength: string;
  priceTarget?: number;
  stopLoss?: number;
  timeHorizon: string;
  confidence: number;
  rationale: string;
}

interface MultiTimeframeAnalysis {
  [timeframe: string]: TechnicalAnalysis;
}

export const useTechnicalAnalysis = (symbol: string) => {
  const [technicalAnalysis, setTechnicalAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [multiTimeframeAnalysis, setMultiTimeframeAnalysis] =
    useState<MultiTimeframeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Get technical analysis for specific timeframe
  const getTechnicalAnalysis = useCallback(
    async (targetSymbol: string, timeframe: string = '1h') => {
      try {
        setIsLoading(true);
        setError(null);

        const analysis = await safeInvoke<TechnicalAnalysis>('get_technical_analysis', {
          symbol: targetSymbol,
          timeframe,
        });

        if (analysis) {
          setTechnicalAnalysis(analysis);
          setLastUpdateTime(new Date());
          return analysis;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get technical analysis';
        setError(errorMessage);
        console.error('Technical analysis error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Get multi-timeframe analysis
  const getMultiTimeframeAnalysis = useCallback(async (targetSymbol: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const analysis = await safeInvoke<MultiTimeframeAnalysis>('multi_timeframe_analysis', {
        symbol: targetSymbol,
      });

      if (analysis) {
        setMultiTimeframeAnalysis(analysis);
        setLastUpdateTime(new Date());
        return analysis;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to get multi-timeframe analysis';
      setError(errorMessage);
      console.error('Multi-timeframe analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh analysis data
  const refreshAnalysis = useCallback(
    async (timeframe: string = '1h') => {
      if (!symbol) return;

      await Promise.all([
        getTechnicalAnalysis(symbol, timeframe),
        getMultiTimeframeAnalysis(symbol),
      ]);
    },
    [symbol, getTechnicalAnalysis, getMultiTimeframeAnalysis]
  );

  // Auto-refresh analysis every 60 seconds
  useEffect(() => {
    if (!symbol) return;

    // Initial load
    refreshAnalysis();

    // Set up auto-refresh
    const interval = setInterval(() => {
      refreshAnalysis();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [symbol, refreshAnalysis]);

  // Computed values for easier use in components
  const analysisData = useMemo(() => {
    if (!technicalAnalysis) return null;

    return {
      ...technicalAnalysis,
      isBullish: technicalAnalysis.trendDirection.toLowerCase().includes('bullish'),
      isBearish: technicalAnalysis.trendDirection.toLowerCase().includes('bearish'),
      isOverbought: technicalAnalysis.rsi > 70,
      isOversold: technicalAnalysis.rsi < 30,
      strongSignals: technicalAnalysis.signals.filter(
        s => s.strength === 'Strong' || s.strength === 'VeryStrong'
      ),
      buySignals: technicalAnalysis.signals.filter(s => s.signalType.includes('Buy')),
      sellSignals: technicalAnalysis.signals.filter(s => s.signalType.includes('Sell')),
    };
  }, [technicalAnalysis]);

  // Get consensus from multi-timeframe analysis
  const timeframeConsensus = useMemo(() => {
    if (!multiTimeframeAnalysis) return null;

    const timeframes = Object.keys(multiTimeframeAnalysis);
    const bullishCount = timeframes.filter(tf =>
      multiTimeframeAnalysis[tf].trendDirection.toLowerCase().includes('bullish')
    ).length;

    const bearishCount = timeframes.filter(tf =>
      multiTimeframeAnalysis[tf].trendDirection.toLowerCase().includes('bearish')
    ).length;

    const avgConfidence =
      timeframes.reduce((sum, tf) => sum + multiTimeframeAnalysis[tf].confidenceScore, 0) /
      timeframes.length;

    const avgRsi =
      timeframes.reduce((sum, tf) => sum + multiTimeframeAnalysis[tf].rsi, 0) / timeframes.length;

    return {
      totalTimeframes: timeframes.length,
      bullishCount,
      bearishCount,
      neutralCount: timeframes.length - bullishCount - bearishCount,
      consensus:
        bullishCount > bearishCount
          ? 'Bullish'
          : bearishCount > bullishCount
            ? 'Bearish'
            : 'Neutral',
      averageConfidence: avgConfidence,
      averageRsi: avgRsi,
      isStrongConsensus: Math.max(bullishCount, bearishCount) / timeframes.length >= 0.7,
    };
  }, [multiTimeframeAnalysis]);

  // Get key levels (support/resistance)
  const keyLevels = useMemo(() => {
    if (!technicalAnalysis) return null;

    const currentPrice = technicalAnalysis.currentPrice;

    // Find nearest support and resistance
    const nearestSupport = technicalAnalysis.supportLevels
      .filter(level => level < currentPrice)
      .sort((a, b) => b - a)[0]; // Highest support below current price

    const nearestResistance = technicalAnalysis.resistanceLevels
      .filter(level => level > currentPrice)
      .sort((a, b) => a - b)[0]; // Lowest resistance above current price

    return {
      nearestSupport,
      nearestResistance,
      supportDistance: nearestSupport
        ? ((currentPrice - nearestSupport) / currentPrice) * 100
        : null,
      resistanceDistance: nearestResistance
        ? ((nearestResistance - currentPrice) / currentPrice) * 100
        : null,
      allSupports: technicalAnalysis.supportLevels.sort((a, b) => b - a),
      allResistances: technicalAnalysis.resistanceLevels.sort((a, b) => a - b),
    };
  }, [technicalAnalysis]);

  // Get trading recommendations
  const recommendations = useMemo(() => {
    if (!technicalAnalysis || !keyLevels) return null;

    const signals = technicalAnalysis.signals;
    const strongBuySignals = signals.filter(s => s.signalType === 'StrongBuy').length;
    const buySignals = signals.filter(s => s.signalType === 'Buy').length;
    const sellSignals = signals.filter(s => s.signalType === 'Sell').length;
    const strongSellSignals = signals.filter(s => s.signalType === 'StrongSell').length;

    let recommendation = 'Hold';
    let confidence = 0;
    let reasoning = '';

    if (strongBuySignals > 0 || buySignals > sellSignals + strongSellSignals) {
      recommendation = strongBuySignals > 0 ? 'Strong Buy' : 'Buy';
      confidence = technicalAnalysis.confidenceScore;
      reasoning = `${strongBuySignals + buySignals} buy signals detected. RSI: ${technicalAnalysis.rsi.toFixed(1)}`;
    } else if (strongSellSignals > 0 || sellSignals > buySignals + strongBuySignals) {
      recommendation = strongSellSignals > 0 ? 'Strong Sell' : 'Sell';
      confidence = technicalAnalysis.confidenceScore;
      reasoning = `${strongSellSignals + sellSignals} sell signals detected. RSI: ${technicalAnalysis.rsi.toFixed(1)}`;
    } else {
      recommendation = 'Hold';
      confidence = 50;
      reasoning = 'Mixed signals, recommend holding position';
    }

    return {
      action: recommendation,
      confidence,
      reasoning,
      entryPrice: recommendation.includes('Buy') ? keyLevels.nearestSupport : undefined,
      exitPrice: recommendation.includes('Sell') ? keyLevels.nearestResistance : undefined,
      stopLoss: recommendation.includes('Buy')
        ? keyLevels.nearestSupport * 0.98
        : recommendation.includes('Sell')
          ? keyLevels.nearestResistance * 1.02
          : undefined,
    };
  }, [technicalAnalysis, keyLevels]);

  return {
    // Raw data
    technicalAnalysis,
    multiTimeframeAnalysis,

    // Processed data
    analysisData,
    timeframeConsensus,
    keyLevels,
    recommendations,

    // State
    isLoading,
    error,
    lastUpdateTime,

    // Actions
    getTechnicalAnalysis,
    getMultiTimeframeAnalysis,
    refreshAnalysis,
  };
};
