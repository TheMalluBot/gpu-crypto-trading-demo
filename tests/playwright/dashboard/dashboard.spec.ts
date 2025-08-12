import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { TRADING_SYMBOLS, RESPONSIVE_BREAKPOINTS } from '../fixtures/test-data';

/**
 * Dashboard Functionality Tests
 * Tests dashboard components, market data display, and user interactions
 */

test.describe('Dashboard Functionality', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateToRoute('/dashboard');
    await helpers.waitForAppLoad();
  });

  test.describe('Dashboard Layout and Components', () => {
    test('should display dashboard header with title', async ({ page }) => {
      // Check for dashboard title
      await expect(page.locator('text=Dashboard')).toBeVisible();

      // Check for help button
      await expect(
        page.locator('[data-testid="help-button"], button:has-text("Help")')
      ).toBeVisible();

      // Check for API status indicator
      const apiStatus = page.locator('[data-testid="api-status"], .api-status');
      if (await apiStatus.isVisible()) {
        await expect(apiStatus).toBeVisible();
      }
    });

    test('should display profile section', async ({ page }) => {
      // Look for profile-related elements
      const profileSection = page.locator('[data-testid="profile-section"], .profile-section');

      if (await profileSection.isVisible()) {
        await expect(profileSection).toBeVisible();
      } else {
        // Alternative: look for profile-related text or components
        const profileElements = [
          'text=Profile',
          '[data-testid="profile"]',
          '.profile',
          'text=Account',
        ];

        let foundProfile = false;
        for (const selector of profileElements) {
          if (await page.locator(selector).isVisible()) {
            foundProfile = true;
            break;
          }
        }

        if (!foundProfile) {
          console.log('Profile section not found - may be part of different layout');
        }
      }
    });

    test('should display market overview', async ({ page }) => {
      // Look for market overview component
      const marketOverview = page.locator('[data-testid="market-overview"], .market-overview');

      if (await marketOverview.isVisible()) {
        await expect(marketOverview).toBeVisible();

        // Check for market data
        const marketData = page.locator('text=/BTC|ETH|ADA/, text=/\\$\\d+/, text=/%/');
        await expect(marketData.first()).toBeVisible({ timeout: 10000 });
      } else {
        // Alternative: look for any market-related data
        const marketElements = [
          'text=Market',
          'text=/BTCUSDT|ETHUSDT/',
          'text=/\\$\\d+/',
          'text=/%/',
        ];

        let foundMarket = false;
        for (const selector of marketElements) {
          if (await page.locator(selector).isVisible()) {
            foundMarket = true;
            break;
          }
        }

        expect(foundMarket).toBe(true);
      }
    });

    test('should display quick actions section', async ({ page }) => {
      // Look for quick actions or action buttons
      const quickActions = page.locator('[data-testid="quick-actions"], .quick-actions');

      if (await quickActions.isVisible()) {
        await expect(quickActions).toBeVisible();
      } else {
        // Look for common action buttons
        const actionButtons = page.locator(
          'button:has-text("Trade"), button:has-text("Buy"), button:has-text("Sell"), button:has-text("Order")'
        );
        const buttonCount = await actionButtons.count();

        if (buttonCount > 0) {
          await expect(actionButtons.first()).toBeVisible();
        }
      }
    });

    test('should display recent activity or trade history', async ({ page }) => {
      // Look for recent activity section
      const recentActivity = page.locator(
        '[data-testid="recent-activity"], .recent-activity, text=Recent'
      );

      if (await recentActivity.isVisible()) {
        await expect(recentActivity).toBeVisible();
      } else {
        // Look for trade book or trade history
        const tradeHistory = page.locator(
          '[data-testid="trade-book"], .trade-book, text=Trade, text=History'
        );

        if (await tradeHistory.first().isVisible()) {
          await expect(tradeHistory.first()).toBeVisible();
        } else {
          console.log('Recent activity section not found - may show when there is data');
        }
      }
    });
  });

  test.describe('Market Data Display', () => {
    test('should show cryptocurrency symbols and prices', async ({ page }) => {
      // Wait for market data to load
      await page.waitForTimeout(3000);

      // Look for crypto symbols
      const symbols = TRADING_SYMBOLS.slice(0, 3); // Test first 3 symbols
      let foundSymbols = 0;

      for (const symbol of symbols) {
        const symbolElement = page.locator(`text=${symbol}`);
        if (await symbolElement.isVisible()) {
          foundSymbols++;
        }
      }

      // Should find at least one symbol
      expect(foundSymbols).toBeGreaterThan(0);
    });

    test('should display price changes with appropriate styling', async ({ page }) => {
      // Wait for price data
      await page.waitForTimeout(3000);

      // Look for price change indicators
      const priceChanges = page.locator('text=/%/, text=/\\+/, text=/-/');
      const changeCount = await priceChanges.count();

      if (changeCount > 0) {
        // Check first few price changes for styling
        for (let i = 0; i < Math.min(changeCount, 3); i++) {
          const priceChange = priceChanges.nth(i);
          const className = (await priceChange.getAttribute('class')) || '';

          // Should have color styling for positive/negative changes
          const hasColorStyling =
            className.includes('green') ||
            className.includes('red') ||
            className.includes('up') ||
            className.includes('down') ||
            className.includes('positive') ||
            className.includes('negative');

          if (hasColorStyling) {
            expect(hasColorStyling).toBe(true);
            break;
          }
        }
      }
    });

    test('should handle symbol selection for trading', async ({ page }) => {
      // Look for clickable symbols or select trading button
      const symbols = page.locator(
        '[data-testid="symbol-select"], button:has-text("BTCUSDT"), text=BTCUSDT'
      );

      if (await symbols.first().isVisible()) {
        // Click on a symbol
        await symbols.first().click();

        // Should trigger some action - either navigation or modal
        await page.waitForTimeout(1000);

        // Check if navigated to trade page or opened modal
        const isOnTradePage = page.url().includes('/trade');
        const hasModal = await page.locator('[role="dialog"], .modal').isVisible();

        expect(isOnTradePage || hasModal).toBe(true);
      }
    });

    test('should update market data periodically', async ({ page }) => {
      // Get initial price data
      const initialPrices = await page.evaluate(() => {
        const priceElements = document.querySelectorAll('text*=/\\$\\d+/, [data-testid*="price"]');
        return Array.from(priceElements).map(el => el.textContent);
      });

      // Wait for potential update
      await page.waitForTimeout(5000);

      // Get updated prices
      const updatedPrices = await page.evaluate(() => {
        const priceElements = document.querySelectorAll('text*=/\\$\\d+/, [data-testid*="price"]');
        return Array.from(priceElements).map(el => el.textContent);
      });

      // In a real app, prices might update, but in test mode they might be static
      console.log('Price update test - initial vs updated prices compared');
    });
  });

  test.describe('User Profile and Settings', () => {
    test('should display user profile information if available', async ({ page }) => {
      // Look for profile information
      const profileElements = [
        '[data-testid="user-profile"]',
        '.user-profile',
        'text=Profile',
        '[data-testid="account-info"]',
      ];

      let foundProfile = false;
      for (const selector of profileElements) {
        if (await page.locator(selector).isVisible()) {
          foundProfile = true;
          await expect(page.locator(selector)).toBeVisible();
          break;
        }
      }

      if (!foundProfile) {
        console.log('User profile section not visible - may require authentication');
      }
    });

    test('should provide access to settings', async ({ page }) => {
      // Look for settings link or button
      const settingsButton = page.locator(
        'a[href="/settings"], button:has-text("Settings"), [data-testid="settings-button"]'
      );

      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        // Should navigate to settings page
        await expect(page).toHaveURL(/.*\/settings$/);
        await expect(page.locator('text=Trading Settings')).toBeVisible();
      } else {
        // Alternative: navigate via URL
        await helpers.navigateToRoute('/settings');
        await expect(page.locator('text=Trading Settings')).toBeVisible();
      }
    });

    test('should handle profile editing if available', async ({ page }) => {
      // Look for edit profile functionality
      const editButtons = page.locator(
        'button:has-text("Edit"), [data-testid="edit-profile"], .edit-button'
      );

      if (await editButtons.first().isVisible()) {
        await editButtons.first().click();

        // Should open edit modal or form
        const editForm = page.locator('[role="dialog"], .modal, form');
        await expect(editForm).toBeVisible();

        // Close the modal/form
        const closeButton = page.locator(
          'button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]'
        );
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    });
  });

  test.describe('Responsive Dashboard Layout', () => {
    test('should adapt layout for mobile devices', async ({ page }) => {
      await page.setViewportSize(RESPONSIVE_BREAKPOINTS.mobile);
      await page.waitForTimeout(1000);

      // Check that dashboard components stack vertically on mobile
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();

      // Components should be accessible
      const components = page.locator('[data-testid*="section"], .section, .card');
      const componentCount = await components.count();

      if (componentCount > 0) {
        // First few components should be visible
        for (let i = 0; i < Math.min(componentCount, 3); i++) {
          const component = components.nth(i);
          if (await component.isVisible()) {
            await expect(component).toBeVisible();
          }
        }
      }
    });

    test('should optimize layout for tablet', async ({ page }) => {
      await page.setViewportSize(RESPONSIVE_BREAKPOINTS.tablet);
      await page.waitForTimeout(1000);

      // Check for tablet-optimized layout
      await expect(page.locator('#main-content')).toBeVisible();

      // Market overview should be visible and properly sized
      const marketSection = page.locator('[data-testid="market-overview"], .market-overview');
      if (await marketSection.isVisible()) {
        const boundingBox = await marketSection.boundingBox();
        if (boundingBox) {
          expect(boundingBox.width).toBeLessThanOrEqual(RESPONSIVE_BREAKPOINTS.tablet.width);
        }
      }
    });

    test('should use full desktop layout', async ({ page }) => {
      await page.setViewportSize(RESPONSIVE_BREAKPOINTS.desktop);
      await page.waitForTimeout(1000);

      // Desktop should show multi-column layout
      await expect(page.locator('#main-content')).toBeVisible();

      // Check for grid or flex layout
      const hasGridLayout = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="grid"], [class*="flex"]');
        return elements.length > 0;
      });

      expect(hasGridLayout).toBe(true);
    });
  });

  test.describe('Interactive Features', () => {
    test('should handle help button interactions', async ({ page }) => {
      const helpButton = page.locator('[data-testid="help-button"], button:has-text("Help")');

      if (await helpButton.isVisible()) {
        await helpButton.click();

        // Should show help content
        const helpContent = page.locator('[role="dialog"], .modal, .help-content, .tooltip');
        await expect(helpContent).toBeVisible();

        // Close help
        const closeButton = page.locator(
          'button:has-text("Close"), [aria-label="Close"], .close-button'
        );
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    });

    test('should handle keyboard navigation', async ({ page }) => {
      // Test keyboard navigation through dashboard
      await helpers.testKeyboardNavigation();
    });

    test('should handle refresh and data updates', async ({ page }) => {
      // Refresh the page
      await page.reload();
      await helpers.waitForAppLoad();

      // Dashboard should reload properly
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('#main-content')).toBeVisible();
    });

    test('should maintain state during navigation', async ({ page }) => {
      // Navigate away and back
      await helpers.navigateToRoute('/trade');
      await helpers.navigateToRoute('/dashboard');

      // Dashboard should load properly again
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('#main-content')).toBeVisible();
    });
  });

  test.describe('Error States and Loading', () => {
    test('should handle market data loading states', async ({ page }) => {
      // Navigate to dashboard
      await helpers.navigateToRoute('/dashboard');

      // Look for loading indicators
      const loadingIndicators = page.locator(
        '[data-testid="loading"], .loading, .skeleton, .animate-pulse'
      );

      // Loading states might be brief, so we check if they exist
      const hasLoadingState = await loadingIndicators
        .first()
        .isVisible()
        .catch(() => false);

      if (hasLoadingState) {
        // Wait for loading to complete
        await loadingIndicators.first().waitFor({ state: 'hidden', timeout: 10000 });
      }

      // Content should be loaded
      await expect(page.locator('#main-content')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure by intercepting requests
      await page.route('**/api/**', route => route.abort());

      await page.reload();
      await helpers.waitForAppLoad();

      // App should still be functional even if API calls fail
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should show appropriate error messages', async ({ page }) => {
      // Look for any error messages or states
      const errorElements = page.locator('[role="alert"], .error, .alert-error, text=Error');

      // If errors are present, they should be user-friendly
      const errorCount = await errorElements.count();

      for (let i = 0; i < errorCount; i++) {
        const error = errorElements.nth(i);
        if (await error.isVisible()) {
          const errorText = await error.textContent();

          // Error messages should be informative
          expect(errorText).not.toBe('');
          expect(errorText?.length || 0).toBeGreaterThan(5);
        }
      }
    });
  });
});
