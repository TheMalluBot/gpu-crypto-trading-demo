import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import ParticleCanvas from './components/ParticleCanvas';
import TitleBar from './components/TitleBar';
import Navigation from './components/Navigation';
import TradePanel from './components/TradePanel';
import SettingsPanel from './components/SettingsPanel';
import PnLChart from './components/PnLChart';
import SwingBotPanel from './components/SwingBotPanel';
import Dashboard from './components/Dashboard';

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

  const [currentRoute, setCurrentRoute] = useState('/trade');
  const [settings, setSettings] = useState<AppSettings>({ disable_animations: false });

  useEffect(() => {
    const unlisten = listen('stats-update', (event) => {
      setStats(event.payload as SystemStats);
    });

    loadSettings();

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const loadSettings = async () => {
    try {
      const appSettings = await invoke('load_settings');
      setSettings(appSettings as AppSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case '/trade':
        return <TradePanel />;
      case '/bot':
        return <SwingBotPanel />;
      case '/dashboard':
        return <Dashboard />;
      case '/analytics':
        return <PnLChart />;
      case '/settings':
        return <SettingsPanel />;
      default:
        return <TradePanel />;
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      {/* Particle Canvas Background - conditionally rendered */}
      {!settings.disable_animations && (
        <div className="absolute inset-0 z-0">
          <ParticleCanvas />
        </div>
      )}

      {/* Custom Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <div className="relative z-content h-full pt-8 pb-24 md:pb-20 overflow-y-auto">
        <motion.div
          key={currentRoute}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-full"
        >
          {renderCurrentPage()}
        </motion.div>
      </div>

      {/* Navigation */}
      <Navigation currentRoute={currentRoute} onRouteChange={setCurrentRoute} />

      {/* System Stats (for background animation) */}
      {!settings.disable_animations && (
        <div className="fixed top-20 right-4 z-header">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white/70 text-sm font-medium">
                {stats.fps.toFixed(1)} FPS
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;