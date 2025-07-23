import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, TrendingUp, BarChart3, Bot, User, GraduationCap } from 'lucide-react';


const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routes = [
    { path: '/trade', label: 'Trade', icon: TrendingUp },
    { path: '/bot', label: 'Bot', icon: Bot },
    { path: '/tutorial', label: 'Tutorial', icon: GraduationCap },
    { path: '/dashboard', label: 'Dashboard', icon: User },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-navigation" role="navigation" aria-label="Main navigation">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphic rounded-full p-2"
      >
        <ul className="flex items-center space-x-2" role="list">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = location.pathname === route.path;
            
            return (
              <li key={route.path} role="listitem">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate(route.path)}
                  aria-label={`Navigate to ${route.label}`}
                  aria-current={isActive ? 'page' : undefined}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(route.path);
                    }
                  }}
                  className="relative px-4 py-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 touch-target shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                  style={{
                    backgroundColor: isActive ? `rgb(var(--color-primary-500))` : 'transparent',
                    color: isActive ? `rgb(var(--color-text-inverse))` : `rgb(var(--color-text-secondary))`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = `rgb(var(--color-text-primary))`;
                      e.currentTarget.style.backgroundColor = `rgba(var(--color-surface-100), 0.1)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = `rgb(var(--color-text-secondary))`;
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{route.label}</span>
                </div>
                
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-full -z-10"
                    style={{ backgroundColor: `rgb(var(--color-primary-500))` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </nav>
  );
};

export default Navigation;