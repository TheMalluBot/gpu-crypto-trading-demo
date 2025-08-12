import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Theme, themes, defaultTheme, getTheme, applyTheme } from '../utils/themes';

interface ThemeContextType {
  currentTheme: Theme;
  themeId: string;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeId] = useState<string>(defaultTheme);
  const [currentTheme] = useState<Theme>(() => getTheme(themeId));

  const setTheme = (_newThemeId: string) => {
    // Only one theme available, no need to change
    return;
  };

  const toggleTheme = () => {
    // Only one theme available, no toggle needed
    return;
  };

  const availableThemes = Object.values(themes);
  const isDark = true; // Professional theme is dark

  // Apply theme to DOM when it changes
  useEffect(() => {
    applyTheme(currentTheme);

    // Add transition class for smooth theme changes
    document.documentElement.classList.add('animate-theme-transition');

    // Remove transition class after animation completes
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('animate-theme-transition');
    }, 300);

    return () => clearTimeout(timer);
  }, [currentTheme]);

  // No need to listen for system theme changes with single theme

  // Apply initial theme on mount
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  const contextValue: ThemeContextType = {
    currentTheme,
    themeId,
    setTheme,
    availableThemes,
    isDark,
    toggleTheme,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
