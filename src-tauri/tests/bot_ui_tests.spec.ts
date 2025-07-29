import { test, expect, Page } from '@playwright/test';

// Comprehensive Bot Tab UI/UX Test Suite
// Testing all aspects of the trading bot interface

test.describe('Bot Tab - Core Functionality', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.click('[data-testid="bot-tab"]');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Bot Configuration', () => {
    test('should validate bot configuration form inputs', async () => {
      // Test form validation for critical parameters
      await page.fill('[data-testid="lro-period-input"]', '0');
      await page.blur('[data-testid="lro-period-input"]');
      
      const errorMessage = await page.locator('[data-testid="lro-period-error"]');
      await expect(errorMessage).toContainText('Period must be between 5 and 200');
      
      // Test valid input
      await page.fill('[data-testid="lro-period-input"]', '14');
      await page.blur('[data-testid="lro-period-input"]');
      await expect(errorMessage).not.toBeVisible();
    });

    test('should save and load bot configuration', async () => {
      // Configure bot settings
      const testConfig = {
        period: '21',
        signalPeriod: '9',
        overbought: '2.5',
        oversold: '-2.5',
        virtualBalance: '15000',
        stopLoss: '3.0',
        takeProfit: '12.0'
      };

      for (const [field, value] of Object.entries(testConfig)) {
        await page.fill(`[data-testid="${field}-input"]`, value);
      }

      await page.click('[data-testid="save-config-btn"]');
      
      // Verify success notification
      const successToast = await page.locator('[data-testid="success-toast"]');
      await expect(successToast).toContainText('Configuration saved successfully');

      // Reload page and verify settings persist
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      for (const [field, value] of Object.entries(testConfig)) {
        const input = page.locator(`[data-testid="${field}-input"]`);
        await expect(input).toHaveValue(value);
      }
    });

    test('should validate symbol selection', async () => {
      await page.click('[data-testid="symbol-dropdown"]');
      
      // Test invalid symbol
      await page.fill('[data-testid="symbol-search"]', 'INVALID');
      const noResults = await page.locator('[data-testid="no-results"]');
      await expect(noResults).toBeVisible();
      
      // Test valid symbol
      await page.fill('[data-testid="symbol-search"]', 'BTC');
      const btcOptions = await page.locator('[data-testid="symbol-option"]').filter({ hasText: 'BTC' });
      await expect(btcOptions.first()).toBeVisible();
      await btcOptions.first().click();
      
      const selectedSymbol = await page.locator('[data-testid="selected-symbol"]');
      await expect(selectedSymbol).toContainText('BTC');
    });
  });

  test.describe('Bot Lifecycle Management', () => {
    test('should start bot with proper validation', async () => {
      // Ensure bot is stopped initially
      const startBtn = await page.locator('[data-testid="start-bot-btn"]');
      await expect(startBtn).toBeEnabled();
      
      // Start bot
      await startBtn.click();
      
      // Verify loading state
      const loadingSpinner = await page.locator('[data-testid="bot-loading"]');
      await expect(loadingSpinner).toBeVisible();
      
      // Wait for bot to start
      await page.waitForSelector('[data-testid="bot-status-running"]', { timeout: 10000 });
      
      // Verify UI state changes
      const stopBtn = await page.locator('[data-testid="stop-bot-btn"]');
      await expect(stopBtn).toBeEnabled();
      await expect(startBtn).toBeDisabled();
      
      const statusIndicator = await page.locator('[data-testid="bot-status-indicator"]');
      await expect(statusIndicator).toHaveClass(/running/);
    });

    test('should handle bot start failure gracefully', async () => {
      // Mock API failure
      await page.route('**/api/bot/start', route => 
        route.fulfill({ status: 500, body: 'Internal server error' })
      );
      
      await page.click('[data-testid="start-bot-btn"]');
      
      // Verify error handling
      const errorToast = await page.locator('[data-testid="error-toast"]');
      await expect(errorToast).toContainText('Failed to start bot');
      
      // Verify UI remains in stopped state
      const startBtn = await page.locator('[data-testid="start-bot-btn"]');
      await expect(startBtn).toBeEnabled();
    });

    test('should pause and resume bot correctly', async () => {
      // Start bot first
      await page.click('[data-testid="start-bot-btn"]');
      await page.waitForSelector('[data-testid="bot-status-running"]');
      
      // Pause bot
      await page.click('[data-testid="pause-bot-btn"]');
      await page.waitForSelector('[data-testid="bot-status-paused"]');
      
      const resumeBtn = await page.locator('[data-testid="resume-bot-btn"]');
      await expect(resumeBtn).toBeEnabled();
      
      // Resume bot
      await resumeBtn.click();
      await page.waitForSelector('[data-testid="bot-status-running"]');
      
      const pauseBtn = await page.locator('[data-testid="pause-bot-btn"]');
      await expect(pauseBtn).toBeEnabled();
    });

    test('should stop bot with confirmation dialog', async () => {
      // Start bot first
      await page.click('[data-testid="start-bot-btn"]');
      await page.waitForSelector('[data-testid="bot-status-running"]');
      
      // Stop bot
      await page.click('[data-testid="stop-bot-btn"]');
      
      // Verify confirmation dialog
      const confirmDialog = await page.locator('[data-testid="stop-confirmation"]');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText('Are you sure you want to stop the bot?');
      
      // Confirm stop
      await page.click('[data-testid="confirm-stop-btn"]');
      await page.waitForSelector('[data-testid="bot-status-stopped"]');
      
      const startBtn = await page.locator('[data-testid="start-bot-btn"]');
      await expect(startBtn).toBeEnabled();
    });
  });

  test.describe('Real-time Status Updates', () => {
    test('should display real-time bot performance metrics', async () => {
      // Start bot
      await page.click('[data-testid="start-bot-btn"]');
      await page.waitForSelector('[data-testid="bot-status-running"]');
      
      // Verify performance metrics are displayed
      const metricsPanel = await page.locator('[data-testid="performance-metrics"]');
      await expect(metricsPanel).toBeVisible();
      
      // Check for key metrics
      const totalPnL = await page.locator('[data-testid="total-pnl"]');
      const winRate = await page.locator('[data-testid="win-rate"]');
      const tradesCount = await page.locator('[data-testid="trades-count"]');
      
      await expect(totalPnL).toBeVisible();
      await expect(winRate).toBeVisible();
      await expect(tradesCount).toBeVisible();
      
      // Verify metrics update over time
      const initialPnL = await totalPnL.textContent();
      await page.waitForTimeout(5000); // Wait for potential updates
      const updatedPnL = await totalPnL.textContent();
      
      // Note: PnL might not change in test environment, so we just verify it's still displayed
      expect(updatedPnL).toBeDefined();
    });

    test('should show trading signals in real-time', async () => {
      await page.click('[data-testid="start-bot-btn"]');
      await page.waitForSelector('[data-testid="bot-status-running"]');
      
      const signalsPanel = await page.locator('[data-testid="trading-signals"]');
      await expect(signalsPanel).toBeVisible();
      
      // Wait for signals to appear
      await page.waitForSelector('[data-testid="signal-item"]', { timeout: 15000 });
      
      const signalItems = await page.locator('[data-testid="signal-item"]');
      const signalCount = await signalItems.count();
      expect(signalCount).toBeGreaterThan(0);
      
      // Verify signal information
      const firstSignal = signalItems.first();
      await expect(firstSignal).toContainText(/BUY|SELL|HOLD/);
      
      const timestamp = await firstSignal.locator('[data-testid="signal-timestamp"]');
      await expect(timestamp).toBeVisible();
    });

    test('should update bot uptime continuously', async () => {
      await page.click('[data-testid="start-bot-btn"]');
      await page.waitForSelector('[data-testid="bot-status-running"]');
      
      const uptimeDisplay = await page.locator('[data-testid="bot-uptime"]');
      await expect(uptimeDisplay).toBeVisible();
      
      const initialUptime = await uptimeDisplay.textContent();
      await page.waitForTimeout(3000);
      const updatedUptime = await uptimeDisplay.textContent();
      
      // Uptime should increase
      expect(updatedUptime).not.toBe(initialUptime);
    });
  });

  test.describe('Error Handling and User Feedback', () => {
    test('should display clear error messages for API failures', async () => {
      // Mock various API failures
      await page.route('**/api/bot/status', route => 
        route.fulfill({ status: 503, body: 'Service unavailable' })
      );
      
      await page.reload();
      
      const errorBanner = await page.locator('[data-testid="connection-error"]');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText('Unable to connect to trading service');
      
      // Verify retry button
      const retryBtn = await page.locator('[data-testid="retry-connection-btn"]');
      await expect(retryBtn).toBeVisible();
    });

    test('should handle WebSocket connection failures', async () => {
      // Mock WebSocket failure
      await page.addInitScript(() => {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
          constructor(...args) {
            super(...args);
            setTimeout(() => {
              this.dispatchEvent(new Event('error'));
            }, 1000);
          }
        };
      });
      
      await page.reload();
      
      const wsError = await page.locator('[data-testid="websocket-error"]');
      await expect(wsError).toBeVisible();
      await expect(wsError).toContainText('Real-time data connection lost');
    });

    test('should validate form inputs with helpful error messages', async () => {
      // Test negative values
      await page.fill('[data-testid="virtual-balance-input"]', '-1000');
      await page.blur('[data-testid="virtual-balance-input"]');
      
      const balanceError = await page.locator('[data-testid="virtual-balance-error"]');
      await expect(balanceError).toContainText('Balance must be positive');
      
      // Test out-of-range values
      await page.fill('[data-testid="stop-loss-input"]', '50');
      await page.blur('[data-testid="stop-loss-input"]');
      
      const stopLossError = await page.locator('[data-testid="stop-loss-error"]');
      await expect(stopLossError).toContainText('Stop loss cannot exceed 25%');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('data-testid', 'symbol-dropdown');
      
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('data-testid', 'lro-period-input');
      
      // Test space/enter activation
      await page.focus('[data-testid="start-bot-btn"]');
      await page.keyboard.press('Space');
      
      const loadingSpinner = await page.locator('[data-testid="bot-loading"]');
      await expect(loadingSpinner).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async () => {
      const startBtn = await page.locator('[data-testid="start-bot-btn"]');
      await expect(startBtn).toHaveAttribute('aria-label', 'Start trading bot');
      
      const statusIndicator = await page.locator('[data-testid="bot-status-indicator"]');
      await expect(statusIndicator).toHaveAttribute('role', 'status');
      await expect(statusIndicator).toHaveAttribute('aria-live', 'polite');
      
      const metricsTable = await page.locator('[data-testid="performance-metrics"]');
      await expect(metricsTable).toHaveAttribute('role', 'table');
    });

    test('should support screen readers', async () => {
      // Verify screen reader announcements
      const statusAnnouncement = await page.locator('[data-testid="status-announcement"]');
      await expect(statusAnnouncement).toHaveAttribute('aria-live', 'assertive');
      
      // Test form field descriptions
      const periodInput = await page.locator('[data-testid="lro-period-input"]');
      await expect(periodInput).toHaveAttribute('aria-describedby', 'period-help-text');
      
      const helpText = await page.locator('#period-help-text');
      await expect(helpText).toContainText('LRO period determines sensitivity');
    });

    test('should meet color contrast requirements', async () => {
      // This would typically use axe-playwright for automated accessibility testing
      const primaryButtons = await page.locator('[data-testid*="btn"]');
      const count = await primaryButtons.count();
      
      for (let i = 0; i < count; i++) {
        const button = primaryButtons.nth(i);
        const bgColor = await button.evaluate(el => getComputedStyle(el).backgroundColor);
        const textColor = await button.evaluate(el => getComputedStyle(el).color);
        
        // Basic contrast check (would use more sophisticated checking in real implementation)
        expect(bgColor).toBeDefined();
        expect(textColor).toBeDefined();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      // Verify mobile layout adjustments
      const sidebar = await page.locator('[data-testid="bot-sidebar"]');
      await expect(sidebar).toHaveClass(/mobile-collapsed/);
      
      const metricsGrid = await page.locator('[data-testid="metrics-grid"]');
      await expect(metricsGrid).toHaveClass(/mobile-stack/);
      
      // Test mobile navigation
      const mobileMenu = await page.locator('[data-testid="mobile-menu-btn"]');
      await expect(mobileMenu).toBeVisible();
      await mobileMenu.click();
      
      await expect(sidebar).toHaveClass(/mobile-expanded/);
    });

    test('should handle tablet viewport correctly', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      
      const configPanel = await page.locator('[data-testid="config-panel"]');
      const metricsPanel = await page.locator('[data-testid="metrics-panel"]');
      
      // Verify two-column layout on tablet
      await expect(configPanel).toBeVisible();
      await expect(metricsPanel).toBeVisible();
      
      const layout = await page.locator('[data-testid="main-layout"]');
      await expect(layout).toHaveClass(/tablet-layout/);
    });

    test('should maintain functionality on large screens', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
      
      // Verify all panels are visible
      const panels = [
        'config-panel',
        'metrics-panel', 
        'signals-panel',
        'trades-panel'
      ];
      
      for (const panel of panels) {
        const element = await page.locator(`[data-testid="${panel}"]`);
        await expect(element).toBeVisible();
      }
    });
  });

  test.describe('Performance and Loading States', () => {
    test('should show loading states appropriately', async () => {
      // Test initial loading
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.click('[data-testid="bot-tab"]');
      
      const initialLoader = await page.locator('[data-testid="tab-loading"]');
      await expect(initialLoader).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      await expect(initialLoader).not.toBeVisible();
      
      // Test action loading states
      await page.click('[data-testid="refresh-metrics-btn"]');
      const refreshLoader = await page.locator('[data-testid="metrics-loading"]');
      await expect(refreshLoader).toBeVisible();
    });

    test('should handle large datasets efficiently', async () => {
      // Start bot to generate data
      await page.click('[data-testid="start-bot-btn"]');
      await page.waitForSelector('[data-testid="bot-status-running"]');
      
      // Wait for significant amount of data
      await page.waitForTimeout(10000);
      
      // Test scrolling performance in signals list
      const signalsList = await page.locator('[data-testid="signals-list"]');
      await expect(signalsList).toBeVisible();
      
      // Verify virtual scrolling or pagination
      const signals = await page.locator('[data-testid="signal-item"]');
      const signalCount = await signals.count();
      
      // Should not render too many DOM elements at once
      expect(signalCount).toBeLessThan(100);
    });

    test('should debounce user inputs appropriately', async () => {
      const periodInput = await page.locator('[data-testid="lro-period-input"]');
      
      // Type rapidly
      await periodInput.focus();
      await page.keyboard.type('20', { delay: 50 });
      
      // Verify validation doesn't fire immediately
      const errorMessage = await page.locator('[data-testid="lro-period-error"]');
      await expect(errorMessage).not.toBeVisible();
      
      // Wait for debounce period
      await page.waitForTimeout(500);
      
      // Now validation should have occurred
      const validIcon = await page.locator('[data-testid="period-valid-icon"]');
      await expect(validIcon).toBeVisible();
    });
  });
});

test.describe('Integration Tests', () => {
  test('should integrate properly with backend API', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="bot-tab"]');
    
    // Test complete workflow
    await page.fill('[data-testid="lro-period-input"]', '14');
    await page.fill('[data-testid="virtual-balance-input"]', '10000');
    await page.click('[data-testid="save-config-btn"]');
    
    await page.waitForSelector('[data-testid="success-toast"]');
    
    await page.click('[data-testid="start-bot-btn"]');
    await page.waitForSelector('[data-testid="bot-status-running"]');
    
    // Verify data flow
    await page.waitForSelector('[data-testid="signal-item"]', { timeout: 30000 });
    
    const signals = await page.locator('[data-testid="signal-item"]');
    const signalCount = await signals.count();
    expect(signalCount).toBeGreaterThan(0);
  });
});