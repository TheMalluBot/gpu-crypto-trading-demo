import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-xs sm:max-w-sm',
    md: 'max-w-sm sm:max-w-md',
    lg: 'max-w-md sm:max-w-lg',
    xl: 'max-w-lg sm:max-w-xl',
    '2xl': 'max-w-xl sm:max-w-2xl',
    '3xl': 'max-w-2xl sm:max-w-3xl',
    '4xl': 'max-w-3xl sm:max-w-4xl lg:max-w-5xl',
    '5xl': 'max-w-4xl sm:max-w-5xl',
    '6xl': 'max-w-5xl sm:max-w-6xl',
    '7xl': 'max-w-6xl sm:max-w-7xl',
  };

  if (!isOpen) return null;

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 1000 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`glass-morphic p-4 sm:p-6 w-full ${maxWidthClasses[maxWidth]}`}
        onClick={e => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>
        )}
        {children}
      </motion.div>
    </motion.div>
  );

  return createPortal(modalContent, document.body);
};
