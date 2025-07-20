export interface ThemeColors {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  accent: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  surface: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: {
    primary: string;
    secondary: string;
  };
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    gradient: string;
  };
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

// Professional Trading Theme
const professionalTheme: Theme = {
  id: 'professional',
  name: 'Professional',
  description: 'Clean, modern theme optimized for professional trading',
  colors: {
    primary: {
      50: '240 249 255',    // sky-50
      100: '224 242 254',   // sky-100
      200: '186 230 253',   // sky-200
      300: '125 211 252',   // sky-300
      400: '56 189 248',    // sky-400
      500: '14 165 233',    // sky-500
      600: '2 132 199',     // sky-600
      700: '3 105 161',     // sky-700
      800: '7 89 133',      // sky-800
      900: '12 74 110',     // sky-900
      950: '8 47 73',       // sky-950
    },
    secondary: {
      50: '249 250 251',    // gray-50
      100: '243 244 246',   // gray-100
      200: '229 231 235',   // gray-200
      300: '209 213 219',   // gray-300
      400: '156 163 175',   // gray-400
      500: '107 114 128',   // gray-500
      600: '75 85 99',      // gray-600
      700: '55 65 81',      // gray-700
      800: '31 41 55',      // gray-800
      900: '17 24 39',      // gray-900
      950: '3 7 18',        // gray-950
    },
    accent: {
      50: '240 253 244',    // green-50
      100: '220 252 231',   // green-100
      200: '187 247 208',   // green-200
      300: '134 239 172',   // green-300
      400: '74 222 128',    // green-400
      500: '34 197 94',     // green-500
      600: '22 163 74',     // green-600
      700: '21 128 61',     // green-700
      800: '22 101 52',     // green-800
      900: '20 83 45',      // green-900
      950: '5 46 22',       // green-950
    },
    surface: {
      50: '255 255 255',    // white
      100: '249 250 251',   // gray-50
      200: '243 244 246',   // gray-100
      300: '229 231 235',   // gray-200
      400: '209 213 219',   // gray-300
      500: '156 163 175',   // gray-400
      600: '107 114 128',   // gray-500
      700: '75 85 99',      // gray-600
      800: '55 65 81',      // gray-700
      900: '31 41 55',      // gray-800
      950: '17 24 39',      // gray-900
    },
    text: {
      primary: '255 255 255',     // white
      secondary: '209 213 219',   // gray-300
      tertiary: '156 163 175',    // gray-400
      inverse: '17 24 39',        // gray-900
    },
    border: {
      primary: '75 85 99',        // gray-600
      secondary: '55 65 81',      // gray-700
    },
    background: {
      primary: '17 24 39',        // gray-900
      secondary: '31 41 55',      // gray-800
      tertiary: '55 65 81',       // gray-700
      gradient: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)'
    }
  }
};


export const themes: Record<string, Theme> = {
  'professional': professionalTheme,
};

export const defaultTheme = 'professional';

export const getTheme = (themeId: string): Theme => {
  return themes[themeId] || themes[defaultTheme];
};

export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  
  // Set data attribute for theme
  root.setAttribute('data-theme', theme.id);
  
  // Apply CSS custom properties
  const colors = theme.colors;
  
  // Primary colors
  Object.entries(colors.primary).forEach(([key, value]) => {
    root.style.setProperty(`--color-primary-${key}`, value);
  });
  
  // Secondary colors
  Object.entries(colors.secondary).forEach(([key, value]) => {
    root.style.setProperty(`--color-secondary-${key}`, value);
  });
  
  // Accent colors
  Object.entries(colors.accent).forEach(([key, value]) => {
    root.style.setProperty(`--color-accent-${key}`, value);
  });
  
  // Surface colors
  Object.entries(colors.surface).forEach(([key, value]) => {
    root.style.setProperty(`--color-surface-${key}`, value);
  });
  
  // Text colors
  Object.entries(colors.text).forEach(([key, value]) => {
    root.style.setProperty(`--color-text-${key}`, value);
  });
  
  // Border colors
  Object.entries(colors.border).forEach(([key, value]) => {
    root.style.setProperty(`--color-border-${key}`, value);
  });
  
  // Background colors and gradient
  root.style.setProperty('--bg-primary', colors.background.primary);
  root.style.setProperty('--bg-secondary', colors.background.secondary);
  root.style.setProperty('--bg-tertiary', colors.background.tertiary);
  root.style.setProperty('--bg-gradient', colors.background.gradient);
};