import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Square, X } from 'lucide-react';
import { isTauriApp } from '../utils/tauri';

const TitleBar: React.FC = () => {
  const isInTauri = isTauriApp();

  const handleMinimize = async () => {
    if (isInTauri) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().minimize();
    }
  };

  const handleMaximize = async () => {
    if (isInTauri) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().toggleMaximize();
    }
  };

  const handleClose = async () => {
    if (isInTauri) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().close();
    } else {
      window.close();
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 h-8 bg-black/20 backdrop-blur-sm z-titlebar flex items-center justify-between px-4"
      data-tauri-drag-region
    >
      {/* App Title */}
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
        <span className="text-white/80 text-sm font-medium">GPU CPU Demo</span>
      </div>

      {/* Traffic Light Buttons */}
      <div className="flex items-center space-x-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleMinimize}
          className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center hover:bg-yellow-400 transition-colors focus-enhanced"
          aria-label="Minimize window"
        >
          <Minus className="w-3 h-3 text-yellow-900" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleMaximize}
          className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-400 transition-colors focus-enhanced"
          aria-label="Maximize window"
        >
          <Square className="w-3 h-3 text-green-900" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleClose}
          className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400 transition-colors focus-enhanced"
          aria-label="Close window"
        >
          <X className="w-3 h-3 text-red-900" />
        </motion.button>
      </div>
    </div>
  );
};

export default TitleBar;
