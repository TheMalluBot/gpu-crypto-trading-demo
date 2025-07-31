import React from 'react';
import { X, GraduationCap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  onStartTour: () => void;
  onRemindLater: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
  isVisible,
  onDismiss,
  onStartTour,
  onRemindLater,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
          className="relative mb-4"
        >
          <div className="glass-morphic rounded-lg p-4 border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <GraduationCap className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">New to Trading Bot?</h3>
                  <p className="text-white/70 text-sm">
                    Take a quick 2-minute tour to learn the basics of paper trading and bot
                    configuration.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={onStartTour}
                  className="inline-flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Start Tour
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  onClick={onRemindLater}
                  className="px-3 py-2 text-white/60 hover:text-white text-sm transition-colors"
                >
                  Later
                </button>

                <button
                  onClick={onDismiss}
                  className="p-1 text-white/40 hover:text-white transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
