import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';
import { safeInvoke, isTauriApp } from './utils/tauri';
import { ThemeProvider } from './contexts/ThemeContext';
import ParticleCanvas from './components/ParticleCanvas';
import TitleBar from './components/TitleBar';
import Navigation from './components/Navigation';
import TradePanel from './components/TradePanel';
import SettingsPanel from './components/SettingsPanel';
import PnLChart from './components/PnLChart';
import SwingBotPanel from './components/SwingBotPanel';
import Dashboard from './components/Dashboard';
import TutorialPanel from './components/TutorialPanel';
import NotificationContainer from './components/common/NotificationContainer';
import FloatingHelpButton from './components/common/FloatingHelpButton';
import { AppLoading } from './components/common/AppLoading';
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
    gpu_frame_time: 0
  });

  const [settings, setSettings] = useState<AppSettings>({ disable_animations: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (isTauriApp()) {
      const unlisten = listen('stats-update', (event) => {
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
    <ThemeProvider>
      <Router>
        <div className="min-h-safe-screen w-full gradient-bg overflow-hidden relative">        {/* Skip to main content link for accessibility */}
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
        <main id="main-content" className="relative z-content min-h-screen pt-8 pb-24 md:pb-20 overflow-y-auto safe-area-bottom" role="main">
          <Routes>
            <Route path="/" element={<Navigate to="/trade" replace />} />
            <Route path="/trade" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                <TradePanel />
              </motion.div>
            } />
            <Route path="/bot" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                <SwingBotPanel />
              </motion.div>
            } />
            <Route path="/tutorial" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                <TutorialPanel />
              </motion.div>
            } />
            <Route path="/dashboard" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                <Dashboard />
              </motion.div>
            } />
            <Route path="/analytics" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                <PnLChart />
              </motion.div>
            } />
            <Route path="/settings" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-full"
              >
                <SettingsPanel />
              </motion.div>
            } />
          </Routes>
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
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></div>
                <span className="text-white/70 text-sm font-medium" aria-label={`Current FPS: ${stats.fps.toFixed(1)}`}>
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
    </ThemeProvider>
  );
}

export default App;