import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      default:
        return <CheckCircle className="w-6 h-6 text-blue-400" />;
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500';
      default:
        return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="p-6"
      >
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">{getIcon()}</div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-sm text-white/80 mb-6">{message}</p>
          </div>
        </div>

        <div className="flex space-x-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyles()}`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </motion.div>
    </Modal>
  );
};
