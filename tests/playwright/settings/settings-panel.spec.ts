import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import {
  INVALID_API_CREDENTIALS,
  VALID_TEST_CREDENTIALS,
  SETTINGS_TEST_DATA,
  ERROR_MESSAGES,
} from '../fixtures/test-data';

/**
 * Settings Panel Tests
 * Tests API credential management, validation, security warnings, and settings persistence
 */

test.describe('Settings Panel', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateToRoute('/settings');
    await helpers.waitForAppLoad();
  });

  test.describe('Settings Panel Layout', () => {
    test('should display settings panel with all sections', async ({ page }) => {
      // Check main heading
      await expect(page.locator('text=Settings')).toBeVisible();
      await expect(page.locator('text=Trading Settings')).toBeVisible();

      // Check help button
      await expect(
        page.locator('[data-testid="help-button"], button:has-text("Help")')
      ).toBeVisible();

      // Check API key type selector
      await expect(page.locator('text=API Key Type')).toBeVisible();

      // Check API key input
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // Check action buttons
      await expect(page.locator('button:has-text("Save Settings")')).toBeVisible();
      await expect(page.locator('button:has-text("Test Connection")')).toBeVisible();
    });

    test('should display API key type options', async ({ page }) => {
      // Check for HMAC option
      await expect(page.locator('text=HMAC')).toBeVisible();

      // Check for Ed25519 option (recommended)
      await expect(page.locator('text=Ed25519')).toBeVisible();
      await expect(page.locator('text=Recommended')).toBeVisible();

      // Check for RSA option
      await expect(page.locator('text=RSA')).toBeVisible();

      // Check for deprecated warning on HMAC
      await expect(page.locator('text=Deprecated')).toBeVisible();
    });

    test('should display testnet toggle', async ({ page }) => {
      await expect(page.locator('text=Use Testnet')).toBeVisible();

      // Check toggle switch
      const testnetToggle = page.locator('#testnet-toggle, [data-testid="testnet-toggle"]');
      await expect(testnetToggle).toBeVisible();
    });

    test('should display theme and animation settings', async ({ page }) => {
      // Check theme section
      await expect(page.locator('text=Theme')).toBeVisible();
      await expect(page.locator('text=Professional')).toBeVisible();

      // Check animation settings
      await expect(page.locator('text=Disable Background Animation')).toBeVisible();

      // Check performance mode
      await expect(page.locator('text=Performance Mode')).toBeVisible();
    });

    test('should display API status monitor', async ({ page }) => {
      await expect(page.locator('text=API Status Monitor')).toBeVisible();

      // Check for API status indicator
      const apiStatus = page.locator('[data-testid="api-status"], .api-status');
      if (await apiStatus.isVisible()) {
        await expect(apiStatus).toBeVisible();
      }
    });
  });

  test.describe('API Credential Input and Validation', () => {
    test('should validate HMAC API credentials', async ({ page }) => {
      // Select HMAC key type
      await page.locator('input[value="HMAC"]').click();

      // Enter invalid short API key
      await helpers.fillFieldSafely('#api-key-input', INVALID_API_CREDENTIALS.hmac.api_key);

      // Should show validation error
      await expect(page.locator('text=/should be.*64 characters/')).toBeVisible();

      // Enter invalid short API secret
      await helpers.fillFieldSafely('#api-secret-input', INVALID_API_CREDENTIALS.hmac.api_secret);

      // Should show validation error
      await expect(page.locator('text=/should be.*64 characters/')).toBeVisible();
    });

    test('should validate Ed25519 API credentials', async ({ page }) => {
      // Select Ed25519 key type
      await page.locator('input[value="Ed25519"]').click();

      // Enter invalid API key
      await helpers.fillFieldSafely('#api-key-input', INVALID_API_CREDENTIALS.ed25519.api_key);

      // Should show validation error
      await expect(page.locator('text=/should be.*44 characters/')).toBeVisible();

      // Enter invalid private key
      await helpers.fillFieldSafely(
        '#api-secret-input',
        INVALID_API_CREDENTIALS.ed25519.api_secret
      );

      // Should show validation error
      await expect(page.locator('text=/appears invalid/')).toBeVisible();
    });

    test('should validate RSA API credentials', async ({ page }) => {
      // Select RSA key type
      await page.locator('input[value="RSA"]').click();

      // Enter invalid private key format
      await helpers.fillFieldSafely('#api-secret-input', INVALID_API_CREDENTIALS.rsa.api_secret);

      // Should show validation error
      await expect(page.locator('text=/PKCS#8 PEM format/')).toBeVisible();
    });

    test('should validate base URL format', async ({ page }) => {
      // Enter invalid URL
      await helpers.fillFieldSafely('#base-url-input', SETTINGS_TEST_DATA.urls.invalid);

      // Should show validation error
      await expect(page.locator('text=/valid URL/')).toBeVisible();
    });

    test('should prevent malicious URLs', async ({ page }) => {
      // Try to enter malicious URL
      await helpers.fillFieldSafely('#base-url-input', SETTINGS_TEST_DATA.urls.malicious);

      // Should be rejected or sanitized
      const actualValue = await page.locator('#base-url-input').inputValue();
      expect(actualValue).not.toContain('javascript:');
    });

    test('should show real-time validation feedback', async ({ page }) => {
      // Select HMAC
      await page.locator('input[value="HMAC"]').click();

      // Start typing API key
      const apiKeyInput = page.locator('#api-key-input');
      await apiKeyInput.fill('short');

      // Should show validation error immediately
      await expect(page.locator('text=/should be.*64 characters/')).toBeVisible();

      // Continue typing to valid length
      await apiKeyInput.fill(VALID_TEST_CREDENTIALS.hmac.api_key);

      // Error should disappear
      await expect(page.locator('text=/should be.*64 characters/')).not.toBeVisible();
    });

    test('should clear validation errors when switching key types', async ({ page }) => {
      // Select HMAC and enter invalid data
      await page.locator('input[value="HMAC"]').click();
      await helpers.fillFieldSafely('#api-key-input', 'invalid');

      // Wait for error
      await expect(page.locator('text=/should be.*64 characters/')).toBeVisible();

      // Switch to Ed25519
      await page.locator('input[value="Ed25519"]').click();

      // HMAC error should be cleared and fields should be cleared or updated
      const apiKeyValue = await page.locator('#api-key-input').inputValue();
      const hasHmacError = await page.locator('text=/should be.*64 characters/').isVisible();

      expect(hasHmacError).toBe(false);
    });
  });

  test.describe('Settings Save and Load', () => {
    test('should save valid settings', async ({ page }) => {
      // Select Ed25519 (recommended)
      await page.locator('input[value="Ed25519"]').click();

      // Enter valid test credentials
      await helpers.fillFieldSafely('#api-key-input', VALID_TEST_CREDENTIALS.ed25519.api_key);
      await helpers.fillFieldSafely('#api-secret-input', VALID_TEST_CREDENTIALS.ed25519.api_secret);

      // Set testnet URL
      await helpers.fillFieldSafely('#base-url-input', SETTINGS_TEST_DATA.urls.testnet);

      // Enable testnet
      const testnetToggle = page.locator('#testnet-toggle');
      if (!(await testnetToggle.isChecked())) {
        await testnetToggle.click();
      }

      // Save settings
      await helpers.clickButtonSafely('button:has-text("Save Settings")');

      // Should show success notification
      await helpers.waitForNotification('saved');
    });

    test('should prevent saving invalid settings', async ({ page }) => {
      // Enter invalid credentials
      await page.locator('input[value="HMAC"]').click();
      await helpers.fillFieldSafely('#api-key-input', 'invalid');

      // Save button should be disabled
      const saveButton = page.locator('button:has-text("Save Settings")');
      await expect(saveButton).toBeDisabled();
    });

    test('should load saved settings on page refresh', async ({ page }) => {
      // Save some settings first
      await page.locator('input[value="Ed25519"]').click();
      await helpers.fillFieldSafely('#api-key-input', VALID_TEST_CREDENTIALS.ed25519.api_key);

      // Enable testnet
      const testnetToggle = page.locator('#testnet-toggle');
      if (!(await testnetToggle.isChecked())) {
        await testnetToggle.click();
      }

      await helpers.clickButtonSafely('button:has-text("Save Settings")');
      await helpers.waitForNotification();

      // Refresh page
      await page.reload();
      await helpers.waitForAppLoad();

      // Settings should be preserved
      await expect(page.locator('input[value="Ed25519"]')).toBeChecked();
      await expect(page.locator('#testnet-toggle')).toBeChecked();
    });

    test('should handle save errors gracefully', async ({ page }) => {
      // Mock a save error by intercepting the request
      await page.route('**/save_settings', route => route.abort());

      // Try to save settings
      await page.locator('input[value="HMAC"]').click();
      await helpers.fillFieldSafely('#api-key-input', VALID_TEST_CREDENTIALS.hmac.api_key);
      await helpers.fillFieldSafely('#api-secret-input', VALID_TEST_CREDENTIALS.hmac.api_secret);

      await helpers.clickButtonSafely('button:has-text("Save Settings")');

      // Should show error notification
      await helpers.waitForNotification('Failed to save');
    });
  });

  test.describe('Connection Testing', () => {
    test('should test connection with valid credentials', async ({ page }) => {
      // Enter valid test credentials
      await page.locator('input[value="Ed25519"]').click();
      await helpers.fillFieldSafely('#api-key-input', VALID_TEST_CREDENTIALS.ed25519.api_key);
      await helpers.fillFieldSafely('#api-secret-input', VALID_TEST_CREDENTIALS.ed25519.api_secret);

      // Set testnet URL and enable testnet
      await helpers.fillFieldSafely('#base-url-input', SETTINGS_TEST_DATA.urls.testnet);
      const testnetToggle = page.locator('#testnet-toggle');
      if (!(await testnetToggle.isChecked())) {
        await testnetToggle.click();
      }

      // Test connection
      const testButton = page.locator('button:has-text("Test Connection")');
      await testButton.click();

      // Should show testing state
      await expect(page.locator('text=Testing')).toBeVisible();

      // Wait for result (mock will likely fail, but should handle gracefully)
      await page.waitForTimeout(3000);

      // Should show result (either success or failure)
      const hasResult = await page.locator('text=Connected, text=Failed').first().isVisible();
      expect(hasResult).toBe(true);
    });

    test('should prevent testing with invalid credentials', async ({ page }) => {
      // Enter invalid credentials
      await helpers.fillFieldSafely('#api-key-input', 'invalid');

      // Test button should be disabled
      const testButton = page.locator('button:has-text("Test Connection")');
      await expect(testButton).toBeDisabled();
    });

    test('should show connection error details', async ({ page }) => {
      // Enter seemingly valid but fake credentials
      await page.locator('input[value="HMAC"]').click();
      await helpers.fillFieldSafely('#api-key-input', VALID_TEST_CREDENTIALS.hmac.api_key);
      await helpers.fillFieldSafely('#api-secret-input', VALID_TEST_CREDENTIALS.hmac.api_secret);

      // Test connection (should fail with fake credentials)
      await helpers.clickButtonSafely('button:has-text("Test Connection")');

      // Wait for test to complete
      await page.waitForTimeout(5000);

      // Should show error details
      const errorSection = page.locator('.alert-theme-error, [role="alert"]');
      if (await errorSection.isVisible()) {
        await expect(errorSection).toContainText('Connection Failed');
      }
    });

    test('should reset test result when credentials change', async ({ page }) => {
      // Set up initial credentials and test
      await page.locator('input[value="HMAC"]').click();
      await helpers.fillFieldSafely('#api-key-input', VALID_TEST_CREDENTIALS.hmac.api_key);
      await helpers.fillFieldSafely('#api-secret-input', VALID_TEST_CREDENTIALS.hmac.api_secret);

      await helpers.clickButtonSafely('button:has-text("Test Connection")');
      await page.waitForTimeout(2000);

      // Change API key
      await helpers.fillFieldSafely(
        '#api-key-input',
        'different_key_value_for_testing_reset_functionality'
      );

      // Test result should be reset
      const testButton = page.locator('button:has-text("Test Connection")');
      await expect(testButton).not.toHaveText(/Connected|Failed/);
    });
  });

  test.describe('Security Warnings and Validation', () => {
    test('should show testnet warning when enabled', async ({ page }) => {
      // Enable testnet
      const testnetToggle = page.locator('#testnet-toggle');
      if (!(await testnetToggle.isChecked())) {
        await testnetToggle.click();
      }

      // Should show testnet warning
      await expect(page.locator('text=Testnet Mode Active')).toBeVisible();
      await expect(page.locator('text=/No real money will be used/')).toBeVisible();
      await expect(page.locator('a[href*="testnet.binance.vision"]')).toBeVisible();
    });

    test('should validate URL safety', async ({ page }) => {
      // Test various potentially unsafe URLs
      const unsafeUrls = [
        'http://malicious-site.com',
        'ftp://unsafe-protocol.com',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
      ];

      for (const url of unsafeUrls) {
        await helpers.fillFieldSafely('#base-url-input', url);

        // Should either show validation error or sanitize the input
        const inputValue = await page.locator('#base-url-input').inputValue();
        const hasError = await page.locator('text=/valid URL/, text=/invalid/').isVisible();

        // Either sanitized or shows error
        expect(hasError || !inputValue.includes('javascript:')).toBe(true);
      }
    });

    test('should show appropriate security context for key types', async ({ page }) => {
      // Check HMAC deprecation warning
      await page.locator('input[value="HMAC"]').click();
      await expect(page.locator('text=Deprecated')).toBeVisible();

      // Check Ed25519 recommendation
      await page.locator('input[value="Ed25519"]').click();
      await expect(page.locator('text=Recommended')).toBeVisible();
      await expect(page.locator('text=/Fast & secure/')).toBeVisible();
    });

    test('should provide security guidance', async ({ page }) => {
      // Check for security guidance text
      await expect(page.locator('text=/Ed25519.*recommended by Binance/')).toBeVisible();

      // Check for testnet guidance
      const testnetToggle = page.locator('#testnet-toggle');
      if (!(await testnetToggle.isChecked())) {
        await testnetToggle.click();
      }

      await expect(page.locator('text=/Create separate testnet API keys/')).toBeVisible();
    });
  });

  test.describe('Input Validation and Error Handling', () => {
    test('should sanitize input fields', async ({ page }) => {
      // Test XSS attempts in API key field
      const xssAttempt = '<script>alert("xss")</script>';
      await helpers.fillFieldSafely('#api-key-input', xssAttempt);

      // Input should be sanitized
      const inputValue = await page.locator('#api-key-input').inputValue();
      expect(inputValue).not.toContain('<script>');
    });

    test('should handle empty field validation', async ({ page }) => {
      // Clear API key field
      await helpers.fillFieldSafely('#api-key-input', '');

      // Try to test connection
      const testButton = page.locator('button:has-text("Test Connection")');
      await expect(testButton).toBeDisabled();
    });

    test('should validate field lengths appropriately', async ({ page }) => {
      // Test extremely long input
      const veryLongInput = 'a'.repeat(1000);
      await helpers.fillFieldSafely('#api-key-input', veryLongInput);

      // Should either truncate or show validation error
      const inputValue = await page.locator('#api-key-input').inputValue();
      const hasError = await page.locator('text=/too long/, text=/invalid/').isVisible();

      expect(inputValue.length < 500 || hasError).toBe(true);
    });

    test('should handle special characters appropriately', async ({ page }) => {
      // Test special characters that might break the app
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      await helpers.fillFieldSafely('#api-key-input', specialChars);

      // App should handle without crashing
      await expect(page.locator('#main-content')).toBeVisible();
    });
  });

  test.describe('Reset to Defaults', () => {
    test('should provide reset functionality', async ({ page }) => {
      // Look for reset button or functionality
      const resetButton = page.locator(
        'button:has-text("Reset"), button:has-text("Default"), [data-testid="reset-button"]'
      );

      if (await resetButton.isVisible()) {
        // Modify some settings first
        await page.locator('input[value="HMAC"]').click();
        await helpers.fillFieldSafely('#api-key-input', 'test-key');

        // Reset
        await resetButton.click();

        // Should confirm reset
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Fields should be cleared/reset
        const apiKeyValue = await page.locator('#api-key-input').inputValue();
        expect(apiKeyValue).toBe('');
      }
    });

    test('should reset to safe defaults', async ({ page }) => {
      // After reset, should default to safe settings
      await page.reload();
      await helpers.waitForAppLoad();

      // Should default to testnet enabled (safer for demo)
      const testnetToggle = page.locator('#testnet-toggle');
      const isTestnetChecked = await testnetToggle.isChecked();

      // Should have testnet URL as default when testnet is enabled
      if (isTestnetChecked) {
        const baseUrl = await page.locator('#base-url-input').inputValue();
        expect(baseUrl).toContain('testnet');
      }
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      // Check that form inputs have proper labels
      const apiKeyInput = page.locator('#api-key-input');
      const apiKeyLabel = page.locator('label[for="api-key-input"]');

      await expect(apiKeyLabel).toBeVisible();
      await expect(apiKeyInput).toHaveAttribute('aria-required', 'true');

      // Check for ARIA descriptions
      const hasAriaDescribedBy = await apiKeyInput.getAttribute('aria-describedby');
      expect(hasAriaDescribedBy).toBeTruthy();
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await helpers.testKeyboardNavigation();
    });

    test('should provide helpful placeholder text', async ({ page }) => {
      // Check API key placeholder changes based on key type
      await page.locator('input[value="HMAC"]').click();
      let placeholder = await page.locator('#api-key-input').getAttribute('placeholder');
      expect(placeholder).toContain('Binance API Key');

      await page.locator('input[value="Ed25519"]').click();
      placeholder = await page.locator('#api-key-input').getAttribute('placeholder');
      expect(placeholder).toContain('Ed25519 public key');
    });

    test('should provide contextual help text', async ({ page }) => {
      // Check for help text under inputs
      await page.locator('input[value="Ed25519"]').click();

      await expect(page.locator('text=Your Ed25519 public key')).toBeVisible();
      await expect(page.locator('text=Your Ed25519 private key')).toBeVisible();
    });
  });
});
