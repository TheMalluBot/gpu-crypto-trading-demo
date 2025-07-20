import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, BookOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Modal } from './Modal';
import { HELP_CONTENT } from '../../utils/helpContent';

const FloatingHelpButton: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const location = useLocation();
  
  const getCurrentHelpContent = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return HELP_CONTENT.dashboard;
      case '/trade':
        return HELP_CONTENT.trading;
      case '/bot':
        return HELP_CONTENT.bot;
      case '/settings':
        return HELP_CONTENT.settings;
      default:
        return {
          title: "General Help",
          sections: [
            {
              title: "Navigation",
              content: [
                "Use the bottom navigation bar to switch between different sections of the app.",
                "Dashboard: View your trading overview and performance metrics",
                "Trade: Execute manual trades and monitor market data",
                "Bot: Configure and run automated trading strategies",
                "Analytics: View detailed performance charts and statistics",
                "Settings: Configure app preferences and API connections"
              ]
            },
            {
              title: "Getting Started",
              content: [
                "1. Start by configuring your API keys in the Settings panel",
                "2. Explore the Dashboard to understand your current portfolio",
                "3. Use the Trade panel to execute your first manual trade",
                "4. Once comfortable, configure and test the trading bot",
                "5. Monitor your performance in the Analytics section"
              ]
            }
          ]
        };
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-20 right-4 z-floating p-3 rounded-full bg-blue-500/80 hover:bg-blue-500 backdrop-blur-xl border border-blue-400/50 text-white shadow-lg hover:shadow-xl transition-all duration-200 touch-target"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
        aria-label="Open help"
        title="Need help? Click for guidance"
      >
        <HelpCircle className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {isHelpOpen && (
          <Modal
            isOpen={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
            maxWidth="2xl"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-8 h-8 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">{getCurrentHelpContent().title}</h2>
                </div>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors touch-target"
                  aria-label="Close help"
                >
                  <X className="w-6 h-6 text-white/70" />
                </button>
              </div>

              <div className="space-y-6">
                {getCurrentHelpContent().sections.map((section, index) => (
                  <div key={index} className="space-y-3">
                    <h3 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">
                      {section.title}
                    </h3>
                    <div className="space-y-2">
                      {section.content.map((paragraph, pIndex) => (
                        <p key={pIndex} className="text-white/70 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-white/90 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Quick Tips
                    </h4>
                    <ul className="text-sm text-white/70 space-y-2">
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        Always test with small amounts first
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        Set stop-loss orders for risk management
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        Monitor bot performance regularly
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        Keep API keys secure
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-white/90 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      Need More Help?
                    </h4>
                    <div className="text-sm text-white/70 space-y-2">
                      <p>Each page has a help button (?) in the top-right corner for specific guidance.</p>
                      <p>Check the documentation or contact support for advanced features.</p>
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-blue-300 text-xs">
                          <strong>Tip:</strong> This help panel adapts to show relevant information based on the current page.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingHelpButton;