import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Cryptocurrency Trading App tests...');

  // Launch browser to warm up and check if app is accessible
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the app and wait for it to load
    await page.goto('http://localhost:1420', { waitUntil: 'networkidle' });

    // Wait for the app to be ready - look for main content
    await page.waitForSelector('#main-content', { timeout: 30000 });

    console.log('✅ App is accessible and ready for testing');

    // Perform any global authentication or setup here if needed
    // For this app, we'll set up paper trading mode by default
    await page.goto('http://localhost:1420/settings');

    // Wait for settings page to load
    await page.waitForSelector('text=Trading Settings', { timeout: 10000 });

    console.log('✅ Settings page accessible');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;
