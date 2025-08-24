#!/bin/bash

# Fix AdvancedAnalytics.tsx imports
sed -i 's/import { HelpTooltip, TradingTermTooltip }/import { TradingTermTooltip }/' src/components/AdvancedAnalytics.tsx
sed -i 's/LineChart, Line, //' src/components/AdvancedAnalytics.tsx
sed -i 's/, Scatter//' src/components/AdvancedAnalytics.tsx
sed -i 's/DollarSign, Activity, AlertTriangle,//' src/components/AdvancedAnalytics.tsx
sed -i 's/Clock, Calendar, //' src/components/AdvancedAnalytics.tsx
sed -i 's/, Filter//' src/components/AdvancedAnalytics.tsx
sed -i 's/, PieChartIcon, LineChartIcon//' src/components/AdvancedAnalytics.tsx
sed -i 's/import { motion, AnimatePresence }/import { motion }/' src/components/AdvancedAnalytics.tsx

# Fix unused variables
sed -i 's/const \[selectedStrategy, setSelectedStrategy\]/const [selectedStrategy]/' src/components/AdvancedAnalytics.tsx
sed -i 's/const \[selectedSymbol, setSelectedSymbol\]/const [selectedSymbol]/' src/components/AdvancedAnalytics.tsx
sed -i 's/const \[compareMode, setCompareMode\]/const [compareMode]/' src/components/AdvancedAnalytics.tsx
sed -i 's/const \[selectedMetric, setSelectedMetric\]/const [selectedMetric]/' src/components/AdvancedAnalytics.tsx
sed -i 's/const COLORS/\/\/ const COLORS/' src/components/AdvancedAnalytics.tsx

echo "TypeScript fixes applied!"