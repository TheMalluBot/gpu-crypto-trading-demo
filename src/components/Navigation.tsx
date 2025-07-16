import React from 'react';
import { motion } from 'framer-motion';
import { Settings, TrendingUp, BarChart3, Bot, User } from 'lucide-react';

interface NavigationProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentRoute, onRouteChange }) => {
  const routes = [
    { path: '/trade', label: 'Trade', icon: TrendingUp },
    { path: '/bot', label: 'Bot', icon: Bot },
    { path: '/dashboard', label: 'Dashboard', icon: User },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-navigation">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl rounded-full border border-white/20 p-2"
      >
        <div className="flex items-center space-x-2">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = currentRoute === route.path;
            
            return (
              <motion.button
                key={route.path}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onRouteChange(route.path)}
                className={`relative px-4 py-2 rounded-full transition-all ${
                  isActive 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{route.label}</span>
                </div>
                
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-blue-500 rounded-full -z-10"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Navigation;