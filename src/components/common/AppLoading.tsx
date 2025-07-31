import React from 'react';
import { motion } from 'framer-motion';

export const AppLoading: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-[9999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-purple-500/30 rounded-full border-t-purple-500 mx-auto mb-4"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 w-16 h-16 bg-purple-500/20 rounded-full blur-xl mx-auto"
          />
        </div>

        <motion.h1
          className="text-2xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          GPU Crypto Trading Demo
        </motion.h1>

        <motion.p
          className="text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Initializing trading platform...
        </motion.p>

        <motion.div
          className="mt-4 flex justify-center space-x-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-purple-500 rounded-full"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};
