// Playwright Configuration for Crypto Trading Platform
// AGENT-TRADER-PRO Security-First Testing Configuration

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test configuration
  testDir: './tests/playwright',
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 5 * 1000, // 5 seconds for assertions
  },

  // Parallel execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Test reporting
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  // Global test configuration
  use: {
    // Base URL for trading application
    baseURL: 'http://localhost:3000',

    // Tracing for debugging
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Security headers verification
    extraHTTPHeaders: {
      Accept: 'application/json',
    },

    // Ignore HTTPS errors for development
    ignoreHTTPSErrors: true,
  },

  // Browser and device projects
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Tablet devices
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'tablet-firefox',
      use: {
        ...devices['iPad Pro'],
        browserName: 'firefox',
      },
    },

    // Mobile devices
    {
      name: 'mobile-chrome',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 5'] },
    },

    // High DPI displays
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 2,
      },
    },

    // Performance testing
    {
      name: 'performance-audit',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-gpu-benchmarking',
            '--enable-gpu-service-logging',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
          ],
        },
      },
    },

    // Accessibility testing
    {
      name: 'accessibility-audit',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark', // Test dark theme accessibility
      },
    },

    // Security testing
    {
      name: 'security-audit',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Forwarded-Proto': 'https',
          'X-Real-IP': '127.0.0.1',
        },
      },
    },
  ],

  // Development server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for server startup
  },

  // Test output directories
  outputDir: 'test-results/',

  // Global setup and teardown
  globalSetup: require.resolve('./tests/playwright/global-setup.ts'),
  globalTeardown: require.resolve('./tests/playwright/global-teardown.ts'),
});
