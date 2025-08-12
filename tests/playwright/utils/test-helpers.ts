import { Page, expect, Locator } from '@playwright/test';

/**
 * Common test utilities for cryptocurrency trading app
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to a specific route and wait for it to load
   */
  async navigateToRoute(route: string) {
    await this.page.goto(`http://localhost:1420${route}`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('#main-content');
  }

  /**
   * Wait for the app to be fully loaded
   */
  async waitForAppLoad() {
    // Wait for main content
    await this.page.waitForSelector('#main-content', { timeout: 30000 });

    // Wait for navigation to be visible
    await this.page.waitForSelector('nav', { timeout: 10000 });

    // Wait for any loading spinners to disappear
    await this.page.waitForFunction(
      () => {
        const loadingElements = document.querySelectorAll('[data-testid="loading"], .animate-spin');
        return loadingElements.length === 0;
      },
      { timeout: 15000 }
    );
  }

  /**
   * Check if paper trading mode is enabled
   */
  async ensurePaperTradingMode() {
    await this.navigateToRoute('/trade');

    // Look for paper trading indicator
    const paperTradingIndicator = this.page.locator('text=Paper Trading');
    if (await paperTradingIndicator.isVisible()) {
      return true;
    }

    // If not visible, we might need to enable it
    console.warn('Paper trading mode not clearly indicated');
    return false;
  }

  /**
   * Fill form field with validation
   */
  async fillFieldSafely(selector: string, value: string) {
    const field = this.page.locator(selector);
    await field.waitFor();
    await field.clear();
    await field.fill(value);

    // Verify the value was set
    await expect(field).toHaveValue(value);
  }

  /**
   * Click button and wait for action to complete
   */
  async clickButtonSafely(selector: string, waitForResponse = true) {
    const button = this.page.locator(selector);
    await button.waitFor();
    await expect(button).toBeEnabled();

    if (waitForResponse) {
      // Wait for any network requests to complete
      await Promise.all([this.page.waitForLoadState('networkidle'), button.click()]);
    } else {
      await button.click();
    }
  }

  /**
   * Check for accessibility violations
   */
  async checkAccessibility() {
    // This will be implemented with axe-core
    const { injectAxe, checkA11y } = await import('@axe-core/playwright');

    await injectAxe(this.page);
    await checkA11y(this.page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  }

  /**
   * Take screenshot with descriptive name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait for notification to appear and disappear
   */
  async waitForNotification(expectedText?: string) {
    const notification = this.page.locator(
      '[role="alert"], .notification, [data-testid="notification"]'
    );
    await notification.waitFor({ timeout: 10000 });

    if (expectedText) {
      await expect(notification).toContainText(expectedText);
    }

    // Wait for notification to disappear (most notifications auto-dismiss)
    await notification.waitFor({ state: 'hidden', timeout: 15000 });
  }

  /**
   * Check responsive design at different viewport sizes
   */
  async testResponsiveness() {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(1000); // Allow layout to settle

      // Take screenshot for visual comparison
      await this.takeScreenshot(`responsive-${viewport.name}`);

      // Check that main content is visible and properly sized
      const mainContent = this.page.locator('#main-content');
      await expect(mainContent).toBeVisible();

      // Check navigation is accessible
      const nav = this.page.locator('nav');
      await expect(nav).toBeVisible();
    }
  }

  /**
   * Simulate network conditions
   */
  async simulateSlowNetwork() {
    await this.page.route('**/*', route => {
      // Add delay to simulate slow network
      setTimeout(() => route.continue(), 1000);
    });
  }

  /**
   * Check for JavaScript errors
   */
  async checkForJSErrors() {
    const errors: string[] = [];

    this.page.on('pageerror', error => {
      errors.push(error.message);
    });

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    return errors;
  }

  /**
   * Verify security headers and HTTPS
   */
  async checkSecurityHeaders() {
    const response = await this.page.goto('http://localhost:1420');

    if (response) {
      const headers = response.headers();

      // Check for important security headers
      const securityHeaders = ['x-frame-options', 'x-content-type-options', 'x-xss-protection'];

      const missingHeaders = securityHeaders.filter(header => !headers[header]);

      if (missingHeaders.length > 0) {
        console.warn('Missing security headers:', missingHeaders);
      }
    }
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation() {
    // Start from the beginning of the page
    await this.page.keyboard.press('Tab');

    // Get all focusable elements
    const focusableElements = await this.page
      .locator(
        '[tabindex]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
      )
      .all();

    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      const activeElement = this.page.locator(':focus');
      await expect(activeElement).toBeVisible();
      await this.page.keyboard.press('Tab');
    }
  }

  /**
   * Check color contrast ratios
   */
  async checkColorContrast() {
    const contrastResults = await this.page.evaluate(() => {
      // This is a simplified contrast check
      // In production, you'd use a more comprehensive tool
      const elements = document.querySelectorAll('*');
      const issues: any[] = [];

      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;

        // Skip elements without visible text
        if (!el.textContent?.trim() || bgColor === 'rgba(0, 0, 0, 0)') return;

        // This is a basic implementation - you'd want to use a proper contrast calculation
        if (bgColor === textColor) {
          issues.push({
            element: el.tagName,
            background: bgColor,
            color: textColor,
          });
        }
      });

      return issues;
    });

    return contrastResults;
  }

  /**
   * Test theme switching functionality
   */
  async testThemeSwitch() {
    // Look for theme selector
    const themeSelector = this.page.locator(
      '[data-testid="theme-selector"], .theme-selector, button:has-text("Theme")'
    );

    if (await themeSelector.isVisible()) {
      const initialTheme = await this.page.evaluate(() => document.documentElement.className);

      await themeSelector.click();
      await this.page.waitForTimeout(1000); // Allow theme transition

      const newTheme = await this.page.evaluate(() => document.documentElement.className);

      // Verify theme actually changed
      expect(newTheme).not.toBe(initialTheme);

      return true;
    }

    return false;
  }

  /**
   * Check performance metrics
   */
  async checkPerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint:
          performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')
            ?.startTime || 0,
        firstContentfulPaint:
          performance
            .getEntriesByType('paint')
            .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      };
    });

    // Basic performance assertions
    expect(metrics.loadTime).toBeLessThan(5000); // Less than 5 seconds
    expect(metrics.domContentLoaded).toBeLessThan(3000); // Less than 3 seconds

    return metrics;
  }
}
