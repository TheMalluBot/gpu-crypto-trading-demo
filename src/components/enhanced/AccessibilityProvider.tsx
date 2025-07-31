// Phase 2 Week 4 UI/UX Designer - Accessibility Provider
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  focusVisible: boolean;
  screenReaderAnnouncements: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: (key: keyof AccessibilitySettings, value: boolean) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  setFocusTo: (elementId: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reducedMotion: false,
    highContrast: false,
    focusVisible: true,
    screenReaderAnnouncements: true,
    keyboardNavigation: true,
  });

  // Detect user preferences on mount
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;

    setSettings(prev => ({
      ...prev,
      reducedMotion,
      highContrast,
    }));

    // Listen for preference changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;

    if (settings.reducedMotion) {
      root.style.setProperty('--duration-fast', '0ms');
      root.style.setProperty('--duration-normal', '0ms');
      root.style.setProperty('--duration-slow', '0ms');
    } else {
      root.style.removeProperty('--duration-fast');
      root.style.removeProperty('--duration-normal');
      root.style.removeProperty('--duration-slow');
    }

    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (settings.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }
  }, [settings]);

  // Keyboard navigation handler
  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip to main content on Alt+M
      if (event.altKey && event.key === 'm') {
        event.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          announceToScreenReader('Skipped to main content');
        }
      }

      // Skip to trading panel on Alt+T
      if (event.altKey && event.key === 't') {
        event.preventDefault();
        const tradingPanel = document.querySelector(
          '[data-testid="enhanced-trade-panel"]'
        ) as HTMLElement;
        if (tradingPanel) {
          tradingPanel.focus();
          announceToScreenReader('Skipped to trading panel');
        }
      }

      // Escape key handling for modals and dropdowns
      if (event.key === 'Escape') {
        const activeModal = document.querySelector(
          '[role="dialog"][aria-modal="true"]'
        ) as HTMLElement;
        if (activeModal) {
          const closeButton = activeModal.querySelector(
            '[aria-label*="close"], [aria-label*="Close"]'
          ) as HTMLElement;
          if (closeButton) {
            closeButton.click();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation]);

  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.screenReaderAnnouncements) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove the announcement after a delay to clean up DOM
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  };

  const setFocusTo = (elementId: string) => {
    const element = document.getElementById(elementId) as HTMLElement;
    if (element) {
      element.focus();
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    announceToScreenReader,
    setFocusTo,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}

      {/* Skip Links */}
      <div className="skip-links">
        <a
          href="#main-content"
          className="skip-link"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFocusTo('main-content');
            }
          }}
        >
          Skip to main content
        </a>
        <a
          href="#trading-panel"
          className="skip-link"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              const tradingPanel = document.querySelector(
                '[data-testid="enhanced-trade-panel"]'
              ) as HTMLElement;
              if (tradingPanel) {
                tradingPanel.focus();
              }
            }
          }}
        >
          Skip to trading panel
        </a>
      </div>

      {/* Live Region for Screen Reader Announcements */}
      <div id="sr-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Assertive Live Region for Important Announcements */}
      <div
        id="sr-live-region-assertive"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
}

// HOC for adding accessibility features to components
export function withAccessibility<T extends object>(Component: React.ComponentType<T>) {
  return function AccessibleComponent(props: T) {
    const accessibility = useAccessibility();

    return <Component {...props} accessibility={accessibility} />;
  };
}

// Hook for managing focus
export function useFocusManagement() {
  const { setFocusTo } = useAccessibility();

  const manageFocus = (elementId: string, delay = 0) => {
    if (delay > 0) {
      setTimeout(() => setFocusTo(elementId), delay);
    } else {
      setFocusTo(elementId);
    }
  };

  const trapFocus = (containerElement: HTMLElement) => {
    const focusableElements = containerElement.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    ) as NodeListOf<HTMLElement>;

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableElement) {
            e.preventDefault();
            lastFocusableElement.focus();
          }
        } else {
          if (document.activeElement === lastFocusableElement) {
            e.preventDefault();
            firstFocusableElement.focus();
          }
        }
      }
    };

    containerElement.addEventListener('keydown', handleKeyDown);

    // Focus first element
    if (firstFocusableElement) {
      firstFocusableElement.focus();
    }

    return () => {
      containerElement.removeEventListener('keydown', handleKeyDown);
    };
  };

  return { manageFocus, trapFocus };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const handler = handlers[key];

      if (handler && typeof handler === 'function') {
        event.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
