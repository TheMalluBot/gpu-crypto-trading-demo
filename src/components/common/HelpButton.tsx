import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { Modal } from './Modal';

interface HelpContent {
  title: string;
  sections: {
    title: string;
    content: string[];
  }[];
}

interface HelpButtonProps {
  helpContent: HelpContent;
  className?: string;
}

const HelpButton: React.FC<HelpButtonProps> = ({ helpContent, className = '' }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setIsHelpOpen(true)}
        className={`p-2 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 hover:text-blue-300 transition-all duration-200 touch-target ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Show help information"
        title="Show help information"
      >
        <HelpCircle className="w-5 h-5" />
      </motion.button>

      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        maxWidth="2xl"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">{helpContent.title}</h2>
            <button
              onClick={() => setIsHelpOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close help"
            >
              <X className="w-6 h-6 text-white/70" />
            </button>
          </div>

          <div className="space-y-6">
            {helpContent.sections.map((section, index) => (
              <div key={index} className="space-y-3">
                <h3 className="text-lg font-semibold text-white/90">{section.title}</h3>
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-white/90 mb-2">Quick Tips:</h4>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• Use keyboard shortcuts for faster navigation</li>
                  <li>• Set stop-loss and take-profit levels for risk management</li>
                  <li>• Monitor your positions regularly</li>
                  <li>• Start with smaller amounts when testing strategies</li>
                </ul>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white/90 mb-2">Need More Help?</h4>
                <p className="text-sm text-white/70">
                  Check the documentation or contact support for advanced features and troubleshooting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default HelpButton;