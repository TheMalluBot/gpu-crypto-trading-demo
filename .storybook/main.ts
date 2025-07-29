// Phase 2 Week 6 Design System Agent - Storybook Configuration
import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../src/design-system/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    '@storybook/addon-toolbars',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
    '@storybook/addon-a11y',
    '@storybook/addon-design-tokens'
  ],
  
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  
  features: {
    buildStoriesJson: true,
    interactionsDebugger: true
  },
  
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation'
  },
  
  viteFinal: async (config, { configType }) => {
    return mergeConfig(config, {
      // Customize Vite config for Storybook
      define: {
        global: 'globalThis',
      },
      resolve: {
        alias: {
          '@': '/src',
          '@design-system': '/src/design-system'
        }
      },
      optimizeDeps: {
        include: ['@storybook/addon-docs']
      }
    })
  },
  
  // Static files
  staticDirs: ['../public'],
  
  // Build configuration
  core: {
    disableTelemetry: true
  }
}

export default config