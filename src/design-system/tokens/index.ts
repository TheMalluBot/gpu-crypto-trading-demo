// Phase 2 Week 6 Design System Agent - Comprehensive Design Token System
// Complete token hierarchy: Primitive → Semantic → Component

// ===== PRIMITIVE TOKENS =====
// Base values that form the foundation of the design system

export const primitiveTokens = {
  // Color Primitives - Complete color scales
  color: {
    white: '#ffffff',
    black: '#000000',

    // Gray scale (neutral colors)
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },

    // Blue (primary brand color)
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },

    // Green (success/buy)
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },

    // Red (danger/sell)
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },

    // Yellow (warning)
    yellow: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },

    // Purple (accent)
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764',
    },
  },

  // Spacing Primitives - 4px base scale
  space: {
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    7: '1.75rem', // 28px
    8: '2rem', // 32px
    9: '2.25rem', // 36px
    10: '2.5rem', // 40px
    11: '2.75rem', // 44px
    12: '3rem', // 48px
    14: '3.5rem', // 56px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    28: '7rem', // 112px
    32: '8rem', // 128px
    36: '9rem', // 144px
    40: '10rem', // 160px
    44: '11rem', // 176px
    48: '12rem', // 192px
    52: '13rem', // 208px
    56: '14rem', // 224px
    60: '15rem', // 240px
    64: '16rem', // 256px
    72: '18rem', // 288px
    80: '20rem', // 320px
    96: '24rem', // 384px
  },

  // Typography Primitives
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
    '8xl': '6rem', // 96px
    '9xl': '8rem', // 128px
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  fontFamily: {
    sans: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'sans-serif',
    ],
    mono: [
      'JetBrains Mono',
      'SF Mono',
      'Monaco',
      'Cascadia Code',
      'Roboto Mono',
      'Consolas',
      'Courier New',
      'monospace',
    ],
    display: ['Inter Display', 'Inter', 'system-ui', 'sans-serif'],
  },

  // Border Radius Primitives
  borderRadius: {
    none: '0',
    sm: '0.125rem', // 2px
    base: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Shadow Primitives
  boxShadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  // Z-Index Primitives
  zIndex: {
    hide: '-1',
    auto: 'auto',
    base: '0',
    docked: '10',
    dropdown: '1000',
    sticky: '1100',
    banner: '1200',
    overlay: '1300',
    modal: '1400',
    popover: '1500',
    skipLink: '1600',
    toast: '1700',
    tooltip: '1800',
  },

  // Animation Primitives
  transitionDuration: {
    none: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
    slowest: '1000ms',
  },

  transitionTimingFunction: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Breakpoint Primitives
  breakpoint: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// ===== SEMANTIC TOKENS =====
// Contextual tokens that reference primitive tokens

export const semanticTokens = {
  color: {
    // Background colors
    background: {
      primary: primitiveTokens.color.white,
      secondary: primitiveTokens.color.gray[50],
      tertiary: primitiveTokens.color.gray[100],
      inverse: primitiveTokens.color.gray[900],
      overlay: 'rgba(0, 0, 0, 0.5)',
      success: primitiveTokens.color.green[50],
      warning: primitiveTokens.color.yellow[50],
      danger: primitiveTokens.color.red[50],
      info: primitiveTokens.color.blue[50],
    },

    // Text colors
    text: {
      primary: primitiveTokens.color.gray[900],
      secondary: primitiveTokens.color.gray[700],
      tertiary: primitiveTokens.color.gray[500],
      inverse: primitiveTokens.color.white,
      disabled: primitiveTokens.color.gray[400],
      success: primitiveTokens.color.green[700],
      warning: primitiveTokens.color.yellow[700],
      danger: primitiveTokens.color.red[700],
      info: primitiveTokens.color.blue[700],
      link: primitiveTokens.color.blue[600],
      linkHover: primitiveTokens.color.blue[700],
    },

    // Border colors
    border: {
      primary: primitiveTokens.color.gray[200],
      secondary: primitiveTokens.color.gray[300],
      tertiary: primitiveTokens.color.gray[400],
      inverse: primitiveTokens.color.gray[700],
      focus: primitiveTokens.color.blue[500],
      success: primitiveTokens.color.green[300],
      warning: primitiveTokens.color.yellow[300],
      danger: primitiveTokens.color.red[300],
      info: primitiveTokens.color.blue[300],
    },

    // Interactive colors
    interactive: {
      primary: primitiveTokens.color.blue[600],
      primaryHover: primitiveTokens.color.blue[700],
      primaryActive: primitiveTokens.color.blue[800],
      primaryDisabled: primitiveTokens.color.gray[300],

      secondary: primitiveTokens.color.gray[100],
      secondaryHover: primitiveTokens.color.gray[200],
      secondaryActive: primitiveTokens.color.gray[300],

      success: primitiveTokens.color.green[600],
      successHover: primitiveTokens.color.green[700],

      warning: primitiveTokens.color.yellow[600],
      warningHover: primitiveTokens.color.yellow[700],

      danger: primitiveTokens.color.red[600],
      dangerHover: primitiveTokens.color.red[700],
    },

    // Trading-specific colors
    trading: {
      buy: primitiveTokens.color.green[600],
      buyHover: primitiveTokens.color.green[700],
      buyLight: primitiveTokens.color.green[50],

      sell: primitiveTokens.color.red[600],
      sellHover: primitiveTokens.color.red[700],
      sellLight: primitiveTokens.color.red[50],

      paperTrading: primitiveTokens.color.yellow[600],
      paperTradingBg: primitiveTokens.color.yellow[50],
      paperTradingBorder: primitiveTokens.color.yellow[300],

      profit: primitiveTokens.color.green[600],
      loss: primitiveTokens.color.red[600],
      neutral: primitiveTokens.color.gray[500],
    },
  },

  // Spacing semantic tokens
  spacing: {
    component: {
      xs: primitiveTokens.space[1],
      sm: primitiveTokens.space[2],
      md: primitiveTokens.space[4],
      lg: primitiveTokens.space[6],
      xl: primitiveTokens.space[8],
    },
    layout: {
      xs: primitiveTokens.space[4],
      sm: primitiveTokens.space[6],
      md: primitiveTokens.space[8],
      lg: primitiveTokens.space[12],
      xl: primitiveTokens.space[16],
    },
  },
} as const;

// ===== COMPONENT TOKENS =====
// Component-specific tokens that reference semantic tokens

export const componentTokens = {
  button: {
    primary: {
      background: semanticTokens.color.interactive.primary,
      backgroundHover: semanticTokens.color.interactive.primaryHover,
      backgroundActive: semanticTokens.color.interactive.primaryActive,
      backgroundDisabled: semanticTokens.color.interactive.primaryDisabled,
      text: semanticTokens.color.text.inverse,
      textDisabled: semanticTokens.color.text.disabled,
      border: semanticTokens.color.interactive.primary,
      borderHover: semanticTokens.color.interactive.primaryHover,
      borderRadius: primitiveTokens.borderRadius.md,
      paddingX: primitiveTokens.space[4],
      paddingY: primitiveTokens.space[3],
      fontSize: primitiveTokens.fontSize.base,
      fontWeight: primitiveTokens.fontWeight.medium,
      minHeight: primitiveTokens.space[11], // 44px for accessibility
    },

    secondary: {
      background: semanticTokens.color.interactive.secondary,
      backgroundHover: semanticTokens.color.interactive.secondaryHover,
      backgroundActive: semanticTokens.color.interactive.secondaryActive,
      text: semanticTokens.color.text.primary,
      border: semanticTokens.color.border.primary,
      borderHover: semanticTokens.color.border.secondary,
    },

    success: {
      background: semanticTokens.color.interactive.success,
      backgroundHover: semanticTokens.color.interactive.successHover,
      text: semanticTokens.color.text.inverse,
      border: semanticTokens.color.interactive.success,
    },

    danger: {
      background: semanticTokens.color.interactive.danger,
      backgroundHover: semanticTokens.color.interactive.dangerHover,
      text: semanticTokens.color.text.inverse,
      border: semanticTokens.color.interactive.danger,
    },

    ghost: {
      background: 'transparent',
      backgroundHover: semanticTokens.color.background.secondary,
      text: semanticTokens.color.text.primary,
      border: 'transparent',
      borderHover: semanticTokens.color.border.primary,
    },
  },

  input: {
    background: semanticTokens.color.background.primary,
    backgroundDisabled: semanticTokens.color.background.secondary,
    text: semanticTokens.color.text.primary,
    textDisabled: semanticTokens.color.text.disabled,
    placeholder: semanticTokens.color.text.tertiary,
    border: semanticTokens.color.border.primary,
    borderHover: semanticTokens.color.border.secondary,
    borderFocus: semanticTokens.color.border.focus,
    borderError: semanticTokens.color.border.danger,
    borderRadius: primitiveTokens.borderRadius.md,
    paddingX: primitiveTokens.space[3],
    paddingY: primitiveTokens.space[3],
    fontSize: primitiveTokens.fontSize.base,
    minHeight: primitiveTokens.space[11], // 44px for accessibility
  },

  card: {
    background: semanticTokens.color.background.primary,
    border: semanticTokens.color.border.primary,
    borderRadius: primitiveTokens.borderRadius.lg,
    padding: primitiveTokens.space[6],
    shadow: primitiveTokens.boxShadow.md,
  },

  modal: {
    background: semanticTokens.color.background.primary,
    overlay: semanticTokens.color.background.overlay,
    border: semanticTokens.color.border.primary,
    borderRadius: primitiveTokens.borderRadius.xl,
    padding: primitiveTokens.space[6],
    shadow: primitiveTokens.boxShadow.xl,
    maxWidth: primitiveTokens.space[96], // 384px
  },

  tradingPanel: {
    background: semanticTokens.color.background.primary,
    border: semanticTokens.color.border.primary,
    borderRadius: primitiveTokens.borderRadius.lg,
    padding: primitiveTokens.space[6],
    shadow: primitiveTokens.boxShadow.md,
    buyButton: {
      background: semanticTokens.color.trading.buy,
      backgroundHover: semanticTokens.color.trading.buyHover,
      text: semanticTokens.color.text.inverse,
    },
    sellButton: {
      background: semanticTokens.color.trading.sell,
      backgroundHover: semanticTokens.color.trading.sellHover,
      text: semanticTokens.color.text.inverse,
    },
    paperTradingBanner: {
      background: semanticTokens.color.trading.paperTradingBg,
      border: semanticTokens.color.trading.paperTradingBorder,
      text: semanticTokens.color.trading.paperTrading,
    },
  },
} as const;

// ===== THEME VARIANTS =====
// Different themes using the same token structure

export const darkTheme = {
  color: {
    background: {
      primary: primitiveTokens.color.gray[900],
      secondary: primitiveTokens.color.gray[800],
      tertiary: primitiveTokens.color.gray[700],
      inverse: primitiveTokens.color.white,
    },
    text: {
      primary: primitiveTokens.color.white,
      secondary: primitiveTokens.color.gray[300],
      tertiary: primitiveTokens.color.gray[400],
      inverse: primitiveTokens.color.gray[900],
    },
    border: {
      primary: primitiveTokens.color.gray[700],
      secondary: primitiveTokens.color.gray[600],
      tertiary: primitiveTokens.color.gray[500],
    },
  },
} as const;

export const highContrastTheme = {
  color: {
    text: {
      primary: primitiveTokens.color.black,
      secondary: primitiveTokens.color.gray[800],
    },
    border: {
      primary: primitiveTokens.color.gray[600],
      secondary: primitiveTokens.color.gray[700],
    },
  },
} as const;

// Export all tokens
export const designTokens = {
  primitive: primitiveTokens,
  semantic: semanticTokens,
  component: componentTokens,
  themes: {
    light: semanticTokens, // Default theme
    dark: darkTheme,
    highContrast: highContrastTheme,
  },
} as const;

// Type definitions for TypeScript
export type PrimitiveTokens = typeof primitiveTokens;
export type SemanticTokens = typeof semanticTokens;
export type ComponentTokens = typeof componentTokens;
export type DesignTokens = typeof designTokens;
