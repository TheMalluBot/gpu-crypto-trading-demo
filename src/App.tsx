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
import { AppLoading } from './components/common/AppLoading';

// Lazy load heavy components to improve initial load time
const TradePanel = lazy(() => import('./components/TradePanel'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));
const PnLChart = lazy(() => import('./components/PnLChart'));
const SwingBotPanel = lazy(() => import('./components/SwingBotPanel'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const TutorialPanel = lazy(() => import('./components/TutorialPanel'));

interface SystemStats {
  fps: number;
  cpu_load: number;
  gpu_frame_time: number;
}

interface AppSettings {
  disable_animations: boolean;
}

function App() {
  const [stats, setStats] = useState<SystemStats>({
    fps: 0,
    cpu_load: 0,
    gpu_frame_time: 0,
  });

  const [settings, setSettings] = useState<AppSettings>({ disable_animations: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize application
    const initApp = async () => {
      try {
        // Initialize Binance service
        const { binanceService } = await import('./services/BinanceService');
        await binanceService.initialize();
        
        // Simulate additional app initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to initialize app:', error);
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
  };

  if (isLoading) {
    return <AppLoading />;
  }

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
              {!settings.disable_animations && (
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
                  <Suspense fallback={<AppLoading />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/trade" replace />} />
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
                            <TradePanel />
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
                        path="/dashboard"
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
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>
              
              {/* Navigation */}
              <div className="relative z-navigation">
                <Navigation />
              </div>
              
              {/* System Stats (for background animation) */}
              {!settings.disable_animations && (
                <div className="fixed top-20 right-4 z-header hidden md:block">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                        aria-hidden="true"
                      ></div>
                      <span
                        className="text-white/70 text-sm font-medium"
                        aria-label={`Current FPS: ${stats.fps.toFixed(1)}`}
                      >
                        {stats.fps.toFixed(1)} FPS
                      </span>
                    </div>
                  </motion.div>
                </div>
              )}
              
              {/* Notification Container */}
              <NotificationContainer />
              
              {/* Floating Help Button */}
              <FloatingHelpButton />
            </div>
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;