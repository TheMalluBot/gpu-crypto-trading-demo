import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  // Clean up any global resources, test data, or connections
  // For this app, we don't need extensive cleanup as it's primarily client-side

  console.log('✅ Global teardown completed');
}

export default globalTeardown;
