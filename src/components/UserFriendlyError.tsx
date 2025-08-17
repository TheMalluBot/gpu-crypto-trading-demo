import React from 'react';
import { AlertCircle, RefreshCw, HelpCircle, Home, WifiOff, ShieldOff, Clock, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';

interface ErrorProps {
  error?: Error | string;
  title?: string;
  message?: string;
  suggestion?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onSettings?: () => void;
  type?: 'connection' | 'auth' | 'timeout' | 'general' | 'permission';
}

export const UserFriendlyError: React.FC<ErrorProps> = ({
  error,
  title,
  message,
  suggestion,
  onRetry,
  onGoHome,
  onSettings,
  type = 'general'
}) => {
  // Determine error details based on error type or content
  const getErrorDetails = () => {
    const errorString = error?.toString() || message || '';
    
    // Connection errors
    if (type === 'connection' || errorString.includes('WebSocket') || errorString.includes('network')) {
      return {
        icon: <WifiOff className="w-16 h-16 text-orange-500" />,
        title: title || "Connection Problem",
        message: "We're having trouble connecting to the market data.",
        suggestion: "Please check your internet connection and try again. If the problem persists, the service might be temporarily unavailable.",
        iconBg: 'bg-orange-50'
      };
    }
    
    // Authentication errors
    if (type === 'auth' || errorString.includes('auth') || errorString.includes('API')) {
      return {
        icon: <ShieldOff className="w-16 h-16 text-red-500" />,
        title: title || "Authentication Issue",
        message: "There's a problem with your API credentials.",
        suggestion: "Please check your API keys in Settings. Make sure they're correct and have the right permissions (read-only for safety).",
        iconBg: 'bg-red-50'
      };
    }
    
    // Timeout errors
    if (type === 'timeout' || errorString.includes('timeout')) {
      return {
        icon: <Clock className="w-16 h-16 text-yellow-500" />,
        title: title || "Request Timed Out",
        message: "The operation took too long to complete.",
        suggestion: "This might be due to slow internet or high server load. Please try again in a moment.",
        iconBg: 'bg-yellow-50'
      };
    }
    
    // Permission errors
    if (type === 'permission' || errorString.includes('permission') || errorString.includes('denied')) {
      return {
        icon: <ShieldOff className="w-16 h-16 text-purple-500" />,
        title: title || "Permission Required",
        message: "You don't have permission to perform this action.",
        suggestion: "This might be a safety feature. Check if you're in paper trading mode or if your account has the necessary permissions.",
        iconBg: 'bg-purple-50'
      };
    }
    
    // General errors
    return {
      icon: <AlertCircle className="w-16 h-16 text-blue-500" />,
      title: title || "Oops! Something went wrong",
      message: message || "We encountered an unexpected issue.",
      suggestion: suggestion || "Please try again. If the problem continues, try restarting the application or contact support.",
      iconBg: 'bg-blue-50'
    };
  };

  const errorDetails = getErrorDetails();

  // Common error solutions
  const commonSolutions = [
    { icon: '🔄', text: 'Refresh the page' },
    { icon: '🌐', text: 'Check internet connection' },
    { icon: '⚙️', text: 'Verify settings' },
    { icon: '📱', text: 'Restart the application' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto"
    >
      {/* Icon */}
      <div className={`p-6 rounded-full ${errorDetails.iconBg} mb-6`}>
        {errorDetails.icon}
      </div>
      
      {/* Title */}
      <h2 className="text-2xl font-bold mb-3 text-center text-gray-900">
        {errorDetails.title}
      </h2>
      
      {/* Message */}
      <p className="text-gray-600 text-center mb-6 leading-relaxed">
        {errorDetails.message}
      </p>
      
      {/* Suggestion Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-6 w-full">
        <div className="flex items-start">
          <HelpCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">What you can try:</p>
            <p className="text-sm text-blue-700 leading-relaxed">
              {errorDetails.suggestion}
            </p>
          </div>
        </div>
      </div>
      
      {/* Quick Solutions */}
      <div className="mb-6 w-full">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
          Quick Solutions
        </p>
        <div className="grid grid-cols-2 gap-2">
          {commonSolutions.map((solution, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
            >
              <span>{solution.icon}</span>
              <span>{solution.text}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3 w-full">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="primary"
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        {onSettings && (
          <Button
            onClick={onSettings}
            variant="secondary"
            className="flex-1"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        )}
        {onGoHome && (
          <Button
            onClick={onGoHome}
            variant="outline"
            className="flex-1"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        )}
      </div>
      
      {/* Error Details (collapsible) */}
      {error && (
        <details className="mt-6 w-full">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            Technical details (for support)
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 overflow-auto max-h-32 w-full">
            {error.toString()}
          </pre>
        </details>
      )}
      
      {/* Support Link */}
      <p className="text-xs text-gray-500 text-center mt-6">
        Still having issues?{' '}
        <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
          Contact Support
        </a>{' '}
        or check our{' '}
        <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
          Help Center
        </a>
      </p>
    </motion.div>
  );
};

// Specific error variants for common scenarios
export const ConnectionError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <UserFriendlyError
    type="connection"
    title="Can't Connect to Market"
    message="We're unable to fetch live market data right now."
    suggestion="This is usually temporary. Check your internet connection or try again in a few seconds."
    onRetry={onRetry}
  />
);

export const AuthError: React.FC<{ onSettings?: () => void }> = ({ onSettings }) => (
  <UserFriendlyError
    type="auth"
    title="API Key Problem"
    message="Your API credentials need attention."
    suggestion="Go to Settings to update your API keys. Remember, we only need read-only access for safety!"
    onSettings={onSettings}
  />
);

export const TimeoutError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <UserFriendlyError
    type="timeout"
    title="Taking Too Long"
    message="The server is taking longer than expected to respond."
    suggestion="The servers might be busy. Wait a moment and try again."
    onRetry={onRetry}
  />
);