import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';
import { safeInvoke, isTauriApp } from './utils/tauri';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import ParticleCanvas from './components/ParticleCanvas';
import TitleBar from './components/TitleBar';
import Navigation from './components/Navigation';
import NotificationContainer from './components/common/NotificationContainer';
import FloatingHelpButton from './components/common/FloatingHelpButton';

// New UX Components
import { WelcomeModal } from './components/WelcomeModal';
import { SimpleDashboard } from './components/SimpleDashboard';
import { LoadingProgress, TradingDataLoader } from './components/LoadingProgress';
import { UserFriendlyError } from './components/UserFriendlyError';

// Lazy load heavy components to improve initial load time
const TradePanel = lazy(() => import('./components/TradePanel'));
const SimpleTradeForm = lazy(() => import('./components/SimpleTradeForm'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));
const PnLChart = lazy(() => import('./components/PnLChart'));
const SwingBotPanel = lazy(() => import('./components/SwingBotPanel'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const TutorialPanel = lazy(() => import('./components/TutorialPanel'));
const GpuSelector = lazy(() => import('./components/GpuSelector'));

interface SystemStats {
  fps: number;
  cpu_load: number;
  gpu_frame_time: number;
}

interface AppSettings {
  disable_animations: boolean;
  user_level?: 'beginner' | 'intermediate' | 'advanced';
  show_welcome?: boolean;
  simplified_mode?: boolean;
}

function App() {
  const [stats, setStats] = useState<SystemStats>({
    fps: 0,
    cpu_load: 0,
    gpu_frame_time: 0,
  });

  const [settings, setSettings] = useState<AppSettings>({ 
    disable_animations: false,
    show_welcome: true,
    simplified_mode: true,
    user_level: 'beginner'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [initError, setInitError] = useState<Error | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Initialize application with better error handling and progress
    const initApp = async () => {
      try {
        // Step 1: Check local storage for first-time user
        const isFirstTime = localStorage.getItem('hasVisited') !== 'true';
        const userLevel = localStorage.getItem('userLevel') as AppSettings['user_level'];
        
        if (isFirstTime && !userLevel) {
          setShowWelcome(true);
        }

        // Step 2: Initialize core services with progress updates
        setLoadingStep('Connecting to market data...');
        setLoadingProgress(20);
        
        try {
          const { binanceService } = await import('./services/BinanceService');
          await binanceService.initialize();
        } catch (error) {
          console.warn('Market data connection optional in demo mode');
        }
        
        setLoadingStep('Loading your preferences...');
        setLoadingProgress(50);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLoadingStep('Preparing trading interface...');
        setLoadingProgress(80);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setLoadingStep('Ready to trade!');
        setLoadingProgress(100);
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    if (isTauriApp()) {
      const unlisten = listen('stats-update', event => {
        setStats(event.payload as SystemStats);
      });

      loadSettings();

      return () => {
        unlisten.then(fn => fn());
      };
    }
  }, []);

  const loadSettings = async () => {
    const appSettings = await safeInvoke<AppSettings>('load_settings');
    if (appSettings) {
      setSettings(appSettings);
    }
    
    // Also check local storage
    const userLevel = localStorage.getItem('userLevel') as AppSettings['user_level'];
    if (userLevel) {
      setSettings(prev => ({ ...prev, user_level: userLevel }));
    }
  };

  const handleWelcomeComplete = (choice: 'beginner' | 'intermediate' | 'advanced' | 'skip') => {
    localStorage.setItem('hasVisited', 'true');
    
    if (choice !== 'skip') {
      localStorage.setItem('userLevel', choice);
      setSettings(prev => ({ 
        ...prev, 
        user_level: choice,
        simplified_mode: choice === 'beginner'
      }));
    }
    
    setShowWelcome(false);
  };

  const handleRetryInit = () => {
    setInitError(null);
    setIsLoading(true);
    window.location.reload();
  };

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <UserFriendlyError
          error={initError}
          type="connection"
          onRetry={handleRetryInit}
        />
      </div>
    );
  }

  // Show loading state with progress
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingProgress
          title="Starting Crypto Trader"
          message={loadingStep}
          progress={loadingProgress}
          variant="detailed"
        />
      </div>
    );
  }

  // Show welcome modal for first-time users
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <WelcomeModal onComplete={handleWelcomeComplete} />
      </div>
    );
  }

  const isSimplifiedMode = settings.simplified_mode || settings.user_level === 'beginner';

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider maxToasts={5}>
          <Router>
            <div className="min-h-safe-screen w-full gradient-bg overflow-hidden relative">
              {/* Skip to main content link for accessibility */}
              <a href="#main-content" className="skip-link focus-enhanced">
                Skip to main content
              </a>
              
              {/* Particle Canvas Background - conditionally rendered */}
              {!settings.disable_animations && !isSimplifiedMode && (
                <div className="absolute inset-0 z-background">
                  <ParticleCanvas />
                </div>
              )}
              
              {/* Custom Title Bar */}
              <div className="relative z-titlebar">
                <TitleBar />
              </div>
              
              {/* Main Content */}
              <main
                id="main-content"
                className="relative z-content min-h-screen pt-8 pb-32 md:pb-28 overflow-y-auto safe-area-bottom"
                role="main"
              >
                <ErrorBoundary>
                  <Suspense fallback={<TradingDataLoader />}>
                    <Routes>
                      {/* Default to dashboard for better UX */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      
                      {/* New simplified dashboard as default */}
                      <Route
                        path="/dashboard"
                        element={
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-full"
                          >
                            <SimpleDashboard />
                          </motion.div>
                        }
                      />
                      
                      {/* Simplified or advanced trade panel based on user level */}
                      <Route
                        path="/trade"
                        element={
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-full"
                          >
                            {isSimplifiedMode ? <SimpleTradeForm /> : <TradePanel />}
                          </motion.div>
                        }
                      />
                      
                      <Route
                        path="/bot"
                        element={
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-full"
                          >
                            <SwingBotPanel />
                          </motion.div>
                        }
                      />
                      
                      <Route
                        path="/tutorial"
                        element={
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-full"
                          >
                            <TutorialPanel />
                          </motion.div>
                        }
                      />
                      
                      <Route
                        path="/analytics"
                        element={
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-full"
                          >
                            <PnLChart />
                          </motion.div>
                        }
                      />
                      
                      <Route
                        path="/gpu"
                        element={
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-full"
                          >
                            <GpuSelector />
                          </motion.div>
                        }
                      />
                      
                      <Route
                        path="/settings"
                        element={
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-full"
                          >
                            <SettingsPanel />
                          </motion.div>
                        }
                      />
                      
                      {/* Advanced dashboard for experienced users */}
                      {!isSimplifiedMode && (
                        <Route
                          path="/advanced"
                          element={
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                              className="min-h-full"
                            >
                              <Dashboard />
                            </motion.div>
                          }
                        />
                      )}
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>
              
              {/* Navigation - now with better organization */}
              <div className="relative z-navigation">
                <Navigation userLevel={settings.user_level} />
              </div>
              
              {/* Notification Container */}
              <div className="relative z-notifications">
                <NotificationContainer />
              </div>
              
              {/* Floating Help Button - more prominent for beginners */}
              <div className="relative z-help">
                <FloatingHelpButton 
                  enhanced={settings.user_level === 'beginner'}
                />
              </div>
              
              {/* Stats overlay - only for advanced users */}
              {settings.user_level === 'advanced' && stats.fps > 0 && (
                <div className="fixed bottom-4 left-4 z-50 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
                  <div>FPS: {stats.fps}</div>
                  <div>CPU: {(stats.cpu_load * 100).toFixed(1)}%</div>
                  <div>GPU: {stats.gpu_frame_time.toFixed(2)}ms</div>
                </div>
              )}
            </div>
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;