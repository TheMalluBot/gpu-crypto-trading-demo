// Cryptocurrency Trading Platform - Critical UI Workflow Tests
// AGENT-TRADER-PRO Security-First Testing Suite

import { test, expect, Page } from '@playwright/test';

// Test configuration for crypto trading application
test.describe('Crypto Trading Platform - Critical Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to trading application
    await page.goto('http://localhost:3000');

    // Wait for application to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });

    // Verify paper trading mode is enabled (security requirement)
    await expect(page.locator('[data-testid="paper-trading-indicator"]')).toBeVisible();
  });

  test.describe('🔐 Security & Safety Validation', () => {
    test('should verify live trading is permanently disabled', async ({ page }) => {
      // Check for live trading disabled indicator
      const liveTradeDisabled = page.locator('[data-testid="live-trading-disabled"]');
      await expect(liveTradeDisabled).toBeVisible();
      await expect(liveTradeDisabled).toContainText('PAPER TRADING ONLY');

      // Verify no live trading buttons exist
      const liveTradeButtons = page.locator('[data-testid*="live-trade"]');
      await expect(liveTradeButtons).toHaveCount(0);
    });

    test('should display emergency stop button prominently', async ({ page }) => {
      const emergencyStop = page.locator('[data-testid="emergency-stop-button"]');
      await expect(emergencyStop).toBeVisible();
      await expect(emergencyStop).toHaveCSS('background-color', 'rgb(239, 68, 68)'); // red color

      // Test emergency stop functionality
      await emergencyStop.click();
      await expect(page.locator('[data-testid="emergency-stop-confirmation"]')).toBeVisible();
    });

    test('should validate API credential security warnings', async ({ page }) => {
      // Navigate to settings
      await page.click('[data-testid="settings-tab"]');

      // Check security warnings are displayed
      const securityWarning = page.locator('[data-testid="api-security-warning"]');
      await expect(securityWarning).toBeVisible();
      await expect(securityWarning).toContainText('TESTNET ONLY');

      // Verify credential input validation
      const apiKeyInput = page.locator('[data-testid="api-key-input"]');
      await apiKeyInput.fill('invalid_key');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    });
  });

  test.describe('📊 Trading Dashboard Functionality', () => {
    test('should load dashboard with all critical components', async ({ page }) => {
      // Verify main dashboard elements
      await expect(page.locator('[data-testid="price-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="order-book"]')).toBeVisible();
      await expect(page.locator('[data-testid="trade-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="portfolio-summary"]')).toBeVisible();

      // Check GPU acceleration indicator
      await expect(page.locator('[data-testid="gpu-status"]')).toBeVisible();
    });

    test('should handle strategy preset selection', async ({ page }) => {
      // Test strategy preset dropdown
      await page.click('[data-testid="strategy-preset-selector"]');

      const strategies = [
        'Conservative (2-5% monthly)',
        'Balanced (5-12% monthly)',
        'Aggressive (10-25% monthly)',
        'Swing (8-15% monthly)',
        'Range (4-8% monthly)',
      ];

      for (const strategy of strategies) {
        await expect(page.locator(`text=${strategy}`)).toBeVisible();
      }

      // Select conservative strategy
      await page.click('text=Conservative (2-5% monthly)');
      await expect(page.locator('[data-testid="selected-strategy"]')).toContainText('Conservative');
    });

    test('should validate order form with proper risk checks', async ({ page }) => {
      // Navigate to trading panel
      await page.click('[data-testid="trading-panel"]');

      // Test order form validation
      const symbolInput = page.locator('[data-testid="symbol-input"]');
      const quantityInput = page.locator('[data-testid="quantity-input"]');
      const priceInput = page.locator('[data-testid="price-input"]');

      // Test invalid symbol
      await symbolInput.fill('INVALID');
      await expect(page.locator('[data-testid="symbol-error"]')).toBeVisible();

      // Test valid inputs
      await symbolInput.fill('BTCUSDT');
      await quantityInput.fill('0.001');
      await priceInput.fill('45000');

      // Verify risk assessment is shown
      await expect(page.locator('[data-testid="risk-assessment"]')).toBeVisible();
      await expect(page.locator('[data-testid="position-size-warning"]')).toBeVisible();
    });
  });

  test.describe('⚡ Performance & GPU Integration', () => {
    test('should render particle system at 60fps', async ({ page }) => {
      // Navigate to analysis tab for GPU rendering
      await page.click('[data-testid="analysis-tab"]');

      // Wait for particle system to initialize
      await page.waitForSelector('[data-testid="particle-canvas"]');

      // Monitor frame rate for 3 seconds
      const frameRateData = await page.evaluate(() => {
        return new Promise(resolve => {
          let frameCount = 0;
          const startTime = performance.now();

          function countFrames() {
            frameCount++;
            if (performance.now() - startTime < 3000) {
              requestAnimationFrame(countFrames);
            } else {
              const fps = frameCount / 3;
              resolve(fps);
            }
          }

          requestAnimationFrame(countFrames);
        });
      });

      expect(frameRateData).toBeGreaterThan(55); // Allow some tolerance for 60fps
    });

    test('should load market data within performance targets', async ({ page }) => {
      // Measure initial load time
      const startTime = Date.now();

      // Wait for market data to load
      await page.waitForSelector('[data-testid="market-data-loaded"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Under 3 second target

      // Verify API response times
      const apiResponseTime = await page.locator('[data-testid="api-latency"]').textContent();
      const latency = parseInt(apiResponseTime?.replace('ms', '') || '0');
      expect(latency).toBeLessThan(100); // Under 100ms target
    });
  });

  test.describe('♿ Accessibility Compliance', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation through main elements
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'dashboard-tab');

      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'settings-tab');

      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'analysis-tab');

      // Test Enter key activation
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="analysis-panel"]')).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check critical ARIA attributes
      await expect(page.locator('[data-testid="emergency-stop-button"]')).toHaveAttribute(
        'aria-label',
        'Emergency stop all trading operations'
      );

      await expect(page.locator('[data-testid="price-chart"]')).toHaveAttribute('role', 'img');

      await expect(page.locator('[data-testid="order-book"]')).toHaveAttribute('role', 'table');

      // Verify screen reader announcements
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeVisible();
    });

    test('should maintain color contrast standards', async ({ page }) => {
      // Test critical UI elements for contrast
      const emergencyButton = page.locator('[data-testid="emergency-stop-button"]');
      const buttonStyles = await emergencyButton.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
        };
      });

      // Emergency button should have high contrast (red background, white text)
      expect(buttonStyles.backgroundColor).toBe('rgb(239, 68, 68)');
      expect(buttonStyles.color).toBe('rgb(255, 255, 255)');
    });
  });

  test.describe('📱 Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      await expect(mobileMenu).toBeVisible();

      // Test drawer navigation
      await mobileMenu.click();
      await expect(page.locator('[data-testid="mobile-navigation-drawer"]')).toBeVisible();

      // Verify critical elements are still accessible
      await expect(page.locator('[data-testid="emergency-stop-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="paper-trading-indicator"]')).toBeVisible();
    });

    test('should handle tablet viewport efficiently', async ({ page }) => {
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Verify layout adaptation
      const tradingPanel = page.locator('[data-testid="trading-panel"]');
      const chartPanel = page.locator('[data-testid="chart-panel"]');

      // Should stack vertically on tablet
      const tradingPanelBox = await tradingPanel.boundingBox();
      const chartPanelBox = await chartPanel.boundingBox();

      expect(tradingPanelBox?.y).toBeGreaterThan(chartPanelBox?.y || 0);
    });
  });

  test.describe('🚨 Error Handling & Recovery', () => {
    test('should handle API connection failures gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      // Trigger API call
      await page.click('[data-testid="refresh-data-button"]');

      // Verify error handling
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Test retry mechanism
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-button"]');

      // Should recover successfully
      await page.waitForSelector('[data-testid="market-data-loaded"]');
    });

    test('should display appropriate warnings for invalid operations', async ({ page }) => {
      // Test invalid trading operations
      await page.click('[data-testid="trading-panel"]');

      // Try to submit empty order
      await page.click('[data-testid="submit-order-button"]');

      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
      await expect(page.locator('text=Symbol is required')).toBeVisible();
      await expect(page.locator('text=Quantity is required')).toBeVisible();
    });
  });
});

// Performance monitoring test
test.describe('📊 Performance Monitoring', () => {
  test('should meet Web Vitals performance targets', async ({ page }) => {
    // Start performance monitoring
    await page.goto('http://localhost:3000');

    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          const vitals = {
            LCP: 0,
            FID: 0,
            CLS: 0,
          };

          entries.forEach(entry => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.FID = entry.processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              vitals.CLS += entry.value;
            }
          });

          setTimeout(() => resolve(vitals), 5000);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      });
    });

    // Verify performance targets
    expect(metrics.LCP).toBeLessThan(2500); // LCP under 2.5s
    expect(metrics.FID).toBeLessThan(100); // FID under 100ms
    expect(metrics.CLS).toBeLessThan(0.1); // CLS under 0.1
  });
});
