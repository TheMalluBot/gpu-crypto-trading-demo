// Phase 2 Week 6 Design System Agent - Storybook Preview Configuration
import type { Preview } from '@storybook/react'
import '../src/styles/index.css'
import '../src/styles/design-tokens.css'
import '../src/styles/enhanced-components.css'
import '../src/styles/accessibility.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
      expanded: true,
      sort: 'requiredFirst'
    },
    
    docs: {
      toc: true,
      source: {
        type: 'dynamic',
        language: 'tsx'
      }
    },
    
    // Viewport addon configuration
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        desktopLarge: {
          name: 'Desktop Large',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
        desktopXL: {
          name: 'Desktop XL',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
      },
      defaultViewport: 'desktop',
    },
    
    // Background addon configuration
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1f2937',
        },
        {
          name: 'gray',
          value: '#f3f4f6',
        },
        {
          name: 'paper-trading',
          value: '#fffbeb',
        },
      ],
    },
    
    // Accessibility addon configuration
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'focus-order-semantics',
            enabled: true,
          },
          {
            id: 'keyboard',
            enabled: true,
          },
        ],
      },
      options: {
        checks: { 'color-contrast': { options: { noScroll: true } } },
        restoreScroll: true,
      },
    },
    
    // Layout configuration
    layout: 'padded',
    
    // Options addon configuration
    options: {
      storySort: {
        order: [
          'Design System',
          [
            'Introduction',
            'Design Tokens',
            ['Colors', 'Typography', 'Spacing', 'Shadows'],
            'Components',
            [
              'Button',
              'Input', 
              'Card',
              'Modal',
              'Trading Panel'
            ],
            'Patterns',
            'Templates'
          ],
          'Components',
          'Pages'
        ],
      },
    },
  },
  
  // Global decorators
  decorators: [
    (Story) => (
      <div className="font-sans antialiased">
        <Story />
      </div>
    ),
  ],
  
  // Global types for toolbar controls
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', left: '🌞' },
          { value: 'dark', title: 'Dark', left: '🌚' },
          { value: 'high-contrast', title: 'High Contrast', left: '🔆' },
        ],
        dynamicTitle: true,
      },
    },
    
    locale: {
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English', right: '🇺🇸' },
          { value: 'es', title: 'Español', right: '🇪🇸' },
          { value: 'fr', title: 'Français', right: '🇫🇷' },
          { value: 'de', title: 'Deutsch', right: '🇩🇪' },
          { value: 'ja', title: '日本語', right: '🇯🇵' },
        ],
        dynamicTitle: true,
      },
    },
    
    density: {
      description: 'Component density',
      defaultValue: 'normal',
      toolbar: {
        title: 'Density',
        icon: 'component',
        items: [
          { value: 'compact', title: 'Compact' },
          { value: 'normal', title: 'Normal' },
          { value: 'comfortable', title: 'Comfortable' },
        ],
        dynamicTitle: true,
      },
    },
  },
  
  // Tags configuration
  tags: ['autodocs']
}

export default preview