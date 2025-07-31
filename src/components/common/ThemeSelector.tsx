import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { themes } from '../../utils/themes';

interface ThemeSelectorProps {
  className?: string;
  showLabels?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = '',
  showLabels = true,
}) => {
  const { themeId, setTheme, currentTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (newThemeId: string) => {
    setTheme(newThemeId);
    setIsOpen(false);
  };

  const getThemePreview = (theme: any) => {
    const colors = theme.colors;
    return (
      <div className="flex space-x-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: `rgb(${colors.primary[500]})`,
            border: `1px solid rgba(var(--color-border-primary), 0.3)`,
          }}
        />
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: `rgb(${colors.secondary[500]})`,
            border: `1px solid rgba(var(--color-border-primary), 0.3)`,
          }}
        />
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: `rgb(${colors.accent[500]})`,
            border: `1px solid rgba(var(--color-border-primary), 0.3)`,
          }}
        />
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors duration-200"
        style={{
          backgroundColor: `rgba(var(--color-surface-100), 0.1)`,
          border: `1px solid rgba(var(--color-border-primary), 0.2)`,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = `rgba(var(--color-surface-200), 0.2)`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = `rgba(var(--color-surface-100), 0.1)`;
        }}
      >
        <div className="flex items-center space-x-3">
          {getThemePreview(currentTheme)}
          {showLabels && (
            <div className="text-left">
              <div
                className="text-sm font-medium"
                style={{ color: `rgb(var(--color-text-primary))` }}
              >
                {currentTheme.name}
              </div>
              <div className="text-xs" style={{ color: `rgb(var(--color-text-secondary))` }}>
                {currentTheme.description}
              </div>
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: `rgb(var(--color-text-secondary))` }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg z-dropdown"
          style={{
            backgroundColor: `rgba(var(--color-surface-50), 0.95)`,
            border: `1px solid rgba(var(--color-border-primary), 0.2)`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="py-2">
            {Object.values(themes).map(theme => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className="w-full px-4 py-3 text-left transition-colors duration-200"
                style={{
                  backgroundColor:
                    themeId === theme.id ? `rgba(var(--color-primary-100), 0.2)` : 'transparent',
                }}
                onMouseEnter={e => {
                  if (themeId !== theme.id) {
                    e.currentTarget.style.backgroundColor = `rgba(var(--color-surface-100), 0.1)`;
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor =
                    themeId === theme.id ? `rgba(var(--color-primary-100), 0.2)` : 'transparent';
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getThemePreview(theme)}
                    <div>
                      <div
                        className="text-sm font-medium"
                        style={{ color: `rgb(var(--color-text-primary))` }}
                      >
                        {theme.name}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: `rgb(var(--color-text-secondary))` }}
                      >
                        {theme.description}
                      </div>
                    </div>
                  </div>
                  {themeId === theme.id && (
                    <svg
                      className="w-4 h-4"
                      style={{ color: `rgb(var(--color-primary-500))` }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const QuickThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: `rgba(var(--color-surface-100), 0.1)`,
        border: `1px solid rgba(var(--color-border-primary), 0.2)`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = `rgba(var(--color-surface-200), 0.2)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = `rgba(var(--color-surface-100), 0.1)`;
      }}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? (
        <svg
          className="w-5 h-5"
          style={{ color: `rgb(var(--color-text-primary))` }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          style={{ color: `rgb(var(--color-text-primary))` }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
};
