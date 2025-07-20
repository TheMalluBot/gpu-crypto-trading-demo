import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ConfigurationSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

const ConfigurationSection: React.FC<ConfigurationSectionProps> = ({
  title,
  description,
  icon: Icon,
  iconColor,
  children,
  collapsible = false,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="mb-8">
      <div 
        className={`flex items-center space-x-3 mb-4 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <Icon className={`w-6 h-6 ${iconColor}`} />
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white">{title}</h4>
          <p className="text-sm text-white/60 mt-1">{description}</p>
        </div>
        {collapsible && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-white/40"
          >
            ▼
          </motion.div>
        )}
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConfigurationSection;