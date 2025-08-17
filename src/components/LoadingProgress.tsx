import React, { useEffect, useState } from 'react';
import { Loader2, Check, Circle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingProps {
  title?: string;
  message?: string;
  progress?: number;
  steps?: {
    completed: string[];
    current: string;
    upcoming: string[];
  };
  estimatedTime?: number; // in seconds
  variant?: 'simple' | 'detailed' | 'skeleton';
  onCancel?: () => void;
}

export const LoadingProgress: React.FC<LoadingProps> = ({
  title = "Loading...",
  message,
  progress,
  steps,
  estimatedTime,
  variant = 'simple',
  onCancel
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    if (estimatedTime) {
      const interval = setInterval(() => {
        setElapsedTime(prev => Math.min(prev + 1, estimatedTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [estimatedTime]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (variant === 'skeleton') {
    return <LoadingSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center p-8 max-w-md mx-auto"
    >
      {/* Animated loader */}
      <div className="relative mb-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-16 h-16 text-blue-500" />
        </motion.div>
        {progress !== undefined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
      
      {/* Title and message */}
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      
      {message && (
        <p className="text-gray-600 text-center mb-4 leading-relaxed">
          {message}
        </p>
      )}
      
      {/* Progress bar */}
      {progress !== undefined && (
        <div className="w-full mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
      
      {/* Time estimate */}
      {estimatedTime && (
        <div className="text-sm text-gray-500 mb-4">
          {elapsedTime < estimatedTime ? (
            <>Time remaining: ~{formatTime(estimatedTime - elapsedTime)}</>
          ) : (
            <>Almost done...</>
          )}
        </div>
      )}
      
      {/* Steps progress */}
      {steps && variant === 'detailed' && (
        <div className="w-full space-y-2 mb-6">
          <AnimatePresence>
            {steps.completed.map((step, i) => (
              <motion.div
                key={`completed-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center text-sm text-green-600"
              >
                <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="line-through">{step}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <motion.div
            key={steps.current}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center text-sm text-blue-600 font-semibold"
          >
            <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
            <span>{steps.current}</span>
          </motion.div>
          
          {steps.upcoming.map((step, i) => (
            <div key={`upcoming-${i}`} className="flex items-center text-sm text-gray-400">
              <Circle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Cancel
        </button>
      )}
      
      {/* Fun loading messages */}
      <LoadingMessages />
    </motion.div>
  );
};

// Skeleton loader for content
export const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-20 bg-gray-200 rounded"></div>
      <div className="h-20 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Fun rotating messages during loading
const LoadingMessages: React.FC = () => {
  const messages = [
    "🚀 Preparing your trading dashboard...",
    "📊 Fetching market data...",
    "🔐 Securing your connection...",
    "📈 Analyzing market trends...",
    "💡 Getting everything ready...",
    "🎯 Almost there...",
  ];

  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={currentMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-xs text-gray-500 mt-4 text-center"
      >
        {messages[currentMessage]}
      </motion.p>
    </AnimatePresence>
  );
};

// Quick loading indicator for buttons
export const ButtonLoader: React.FC<{ text?: string }> = ({ text = "Loading" }) => (
  <span className="inline-flex items-center gap-2">
    <Loader2 className="w-4 h-4 animate-spin" />
    {text}...
  </span>
);

// Page transition loader
export const PageLoader: React.FC = () => (
  <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
    <LoadingProgress
      title="Loading Page"
      message="Please wait while we prepare your content"
      variant="simple"
    />
  </div>
);

// Specific loaders for different operations
export const TradingDataLoader: React.FC = () => (
  <LoadingProgress
    title="Loading Market Data"
    message="Fetching real-time prices and order books"
    steps={{
      completed: ['Connected to exchange'],
      current: 'Fetching price data',
      upcoming: ['Loading order book', 'Calculating indicators']
    }}
    variant="detailed"
    estimatedTime={5}
  />
);

export const BotInitLoader: React.FC = () => (
  <LoadingProgress
    title="Initializing Trading Bot"
    message="Setting up your automated trading strategy"
    steps={{
      completed: [],
      current: 'Loading strategy parameters',
      upcoming: ['Connecting to market', 'Starting monitoring', 'Ready to trade']
    }}
    variant="detailed"
    estimatedTime={8}
  />
);

export const BacktestLoader: React.FC<{ progress: number }> = ({ progress }) => (
  <LoadingProgress
    title="Running Backtest"
    message="Testing your strategy against historical data"
    progress={progress}
    estimatedTime={30}
  />
);