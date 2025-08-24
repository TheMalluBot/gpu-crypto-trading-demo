import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxToasts = 5 
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Limit number of toasts
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts);
      }
      return updated;
    });

    // Auto-remove toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-400" />,
    error: <AlertCircle className="h-5 w-5 text-red-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
    info: <Info className="h-5 w-5 text-blue-400" />,
  };

  const backgrounds = {
    success: 'bg-green-950/90 border-green-800/50',
    error: 'bg-red-950/90 border-red-800/50',
    warning: 'bg-yellow-950/90 border-yellow-800/50',
    info: 'bg-blue-950/90 border-blue-800/50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.5 }}
      transition={{ duration: 0.2 }}
      className={`
        pointer-events-auto
        min-w-[300px] max-w-[400px]
        ${backgrounds[toast.type]}
        border backdrop-blur-md rounded-lg shadow-lg
        p-4 flex gap-3
      `}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white">
          {toast.title}
        </h4>
        {toast.description && (
          <p className="text-xs text-gray-400 mt-1">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-xs text-blue-400 hover:text-blue-300 mt-2 font-medium"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

// Convenience hook for common toast patterns
export const useToastActions = () => {
  const { addToast } = useToast();

  return {
    success: (title: string, description?: string) => 
      addToast({ type: 'success', title, description }),
    
    error: (title: string, description?: string) => 
      addToast({ type: 'error', title, description, duration: 8000 }),
    
    warning: (title: string, description?: string) => 
      addToast({ type: 'warning', title, description }),
    
    info: (title: string, description?: string) => 
      addToast({ type: 'info', title, description }),
    
    promise: async <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      const loadingToast = {
        type: 'info' as const,
        title: messages.loading,
        duration: 0, // Don't auto-dismiss
      };
      
      addToast(loadingToast);
      
      try {
        const result = await promise;
        addToast({
          type: 'success',
          title: typeof messages.success === 'function' 
            ? messages.success(result) 
            : messages.success,
        });
        return result;
      } catch (error) {
        addToast({
          type: 'error',
          title: typeof messages.error === 'function' 
            ? messages.error(error) 
            : messages.error,
        });
        throw error;
      }
    },
  };
};