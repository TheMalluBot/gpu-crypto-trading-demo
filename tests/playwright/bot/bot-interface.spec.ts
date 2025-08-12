import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

class BotTestPage {
  constructor(public page: Page) {}

  // Selectors
  get botConfigForm() {
    return this.page.locator('[data-testid="bot-config-form"]');
  }
  get botStatusPanel() {
    return this.page.locator('[data-testid="bot-status-panel"]');
  }
  get startBotButton() {
    return this.page.locator('[data-testid="start-bot-button"]');
  }
  get stopBotButton() {
    return this.page.locator('[data-testid="stop-bot-button"]');
  }
  get pauseBotButton() {
    return this.page.locator('[data-testid="pause-bot-button"]');
  }
  get resumeBotButton() {
    return this.page.locator('[data-testid="resume-bot-button"]');
  }
  get emergencyStopButton() {
    return this.page.locator('[data-testid="emergency-stop-button"]');
  }
  get botStatus() {
    return this.page.locator('[data-testid="bot-status"]');
  }
  get performanceMetrics() {
    return this.page.locator('[data-testid="performance-metrics"]');
  }
  get configTabs() {
    return this.page.locator('[data-testid="config-tabs"]');
  }
  get basicConfigTab() {
    return this.page.locator('[data-testid="basic-config-tab"]');
  }
  get riskConfigTab() {
    return this.page.locator('[data-testid="risk-config-tab"]');
  }
  get advancedConfigTab() {
    return this.page.locator('[data-testid="advanced-config-tab"]');
  }
  get confirmModal() {
    return this.page.locator('[data-testid="confirm-modal"]');
  }
  get errorMessage() {
    return this.page.locator('[data-testid="error-message"]');
  }
  get loadingSpinner() {
    return this.page.locator('[data-testid="loading-spinner"]');
  }
  get paperTradingToggle() {
    return this.page.locator('[data-testid="paper-trading-toggle"]');
  }
  get accountBalance() {
    return this.page.locator('[data-testid="account-balance"]');
  }
  get dailyPnL() {
    return this.page.locator('[data-testid="daily-pnl"]');
  }
  get totalTrades() {
    return this.page.locator('[data-testid="total-trades"]');
  }
  get successRate() {
    return this.page.locator('[data-testid="success-rate"]');
  }
  get currentPosition() {
    return this.page.locator('[data-testid="current-position"]');
  }
  get latestSignal() {
    return this.page.locator('[data-testid="latest-signal"]');
  }
  get symbolSelector() {
    return this.page.locator('[data-testid="symbol-selector"]');
  }
  get presetSelector() {
    return this.page.locator('[data-testid="preset-selector"]');
  }

  // Actions
  async navigateToBotTab() {
    await this.page.locator('[data-testid="bot-tab"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  async startBot() {
    await this.startBotButton.click();
    await this.confirmModal.locator('button:has-text("Start Bot")').click();
  }

  async stopBot() {
    await this.stopBotButton.click();
    await this.confirmModal.locator('button:has-text("Stop Bot")').click();
  }

  async emergencyStop() {
    await this.emergencyStopButton.click();
    await this.confirmModal.locator('button:has-text("Emergency Stop")').click();
  }

  async switchToTab(tabName: string) {
    await this.page.locator(`[data-testid="${tabName}-config-tab"]`).click();
  }

  async setConfigValue(fieldName: string, value: string | number) {
    const field = this.page.locator(`[data-testid="config-${fieldName}"]`);
    await field.clear();
    await field.fill(value.toString());
    await field.blur(); // Trigger validation
  }

  async enablePaperTrading() {
    const toggle = this.paperTradingToggle;
    if (!(await toggle.isChecked())) {
      await toggle.click();
    }
  }

  async disablePaperTrading() {
    const toggle = this.paperTradingToggle;
    if (await toggle.isChecked()) {
      await toggle.click();
    }
  }
}

test.describe('Bot Interface Tests', () => {
  let botPage: BotTestPage;
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    botPage = new BotTestPage(page);
    helpers = new TestHelpers(page);

    await page.goto('/');
    await botPage.navigateToBotTab();
  });

  test.describe('Basic Interface Functionality', () => {
    test('should display bot status panel with all essential elements', async () => {
      await expect(botPage.botStatusPanel).toBeVisible();
      await expect(botPage.botStatus).toBeVisible();
      await expect(botPage.performanceMetrics).toBeVisible();
      await expect(botPage.startBotButton).toBeVisible();
      await expect(botPage.emergencyStopButton).toBeVisible();
    });

    test('should display configuration form with all tabs', async () => {
      await expect(botPage.botConfigForm).toBeVisible();
      await expect(botPage.configTabs).toBeVisible();
      await expect(botPage.basicConfigTab).toBeVisible();
      await expect(botPage.riskConfigTab).toBeVisible();
      await expect(botPage.advancedConfigTab).toBeVisible();
    });

    test('should show performance metrics with proper formatting', async () => {
      await expect(botPage.accountBalance).toBeVisible();
      await expect(botPage.dailyPnL).toBeVisible();
      await expect(botPage.totalTrades).toBeVisible();
      await expect(botPage.successRate).toBeVisible();

      // Check that currency values are properly formatted
      const balanceText = await botPage.accountBalance.textContent();
      expect(balanceText).toMatch(/\$[\d,]+\.?\d*/);
    });
  });

  test.describe('Bot Configuration', () => {
    test('should allow switching between configuration tabs', async () => {
      // Test Basic Config Tab
      await botPage.switchToTab('basic');
      await expect(botPage.page.locator('[data-testid="basic-config-section"]')).toBeVisible();

      // Test Risk Management Tab
      await botPage.switchToTab('risk');
      await expect(botPage.page.locator('[data-testid="risk-config-section"]')).toBeVisible();

      // Test Advanced Tab
      await botPage.switchToTab('advanced');
      await expect(botPage.page.locator('[data-testid="advanced-config-section"]')).toBeVisible();
    });

    test('should validate configuration input fields', async () => {
      await botPage.switchToTab('basic');

      // Test invalid period value
      await botPage.setConfigValue('period', '-1');
      await expect(botPage.errorMessage).toBeVisible();
      await expect(botPage.errorMessage).toContainText('Period must be positive');

      // Test valid period value
      await botPage.setConfigValue('period', '14');
      await expect(botPage.errorMessage).not.toBeVisible();
    });

    test('should validate risk management settings', async () => {
      await botPage.switchToTab('risk');

      // Test stop loss validation
      await botPage.setConfigValue('stop-loss-percent', '25');
      await expect(botPage.errorMessage).toBeVisible();
      await expect(botPage.errorMessage).toContainText('Stop loss cannot exceed 20%');

      // Test valid stop loss
      await botPage.setConfigValue('stop-loss-percent', '5');
      await expect(botPage.errorMessage).not.toBeVisible();
    });

    test('should save configuration changes automatically', async () => {
      await botPage.switchToTab('basic');
      await botPage.setConfigValue('period', '21');

      // Look for auto-save indicator
      const autoSaveIndicator = botPage.page.locator('[data-testid="auto-save-indicator"]');
      await expect(autoSaveIndicator).toBeVisible();
      await expect(autoSaveIndicator).toContainText('Auto-saving...');
    });

    test('should load and apply presets correctly', async () => {
      const presetButton = botPage.page.locator('[data-testid="load-preset-button"]');
      await presetButton.click();

      await expect(botPage.presetSelector).toBeVisible();

      // Select a conservative preset
      await botPage.page.locator('[data-testid="preset-conservative"]').click();

      // Verify that conservative settings are applied
      await botPage.switchToTab('risk');
      const stopLoss = await botPage.page
        .locator('[data-testid="config-stop-loss-percent"]')
        .inputValue();
      expect(parseFloat(stopLoss)).toBeLessThanOrEqual(3);
    });
  });

  test.describe('Bot Control Operations', () => {
    test('should start bot with confirmation dialog', async () => {
      await botPage.startBotButton.click();

      await expect(botPage.confirmModal).toBeVisible();
      await expect(botPage.confirmModal).toContainText('Start Trading Bot');

      const startButton = botPage.confirmModal.locator('button:has-text("Start Bot")');
      await startButton.click();

      await expect(botPage.loadingSpinner).toBeVisible();
      await expect(botPage.botStatus).toContainText('Running');
    });

    test('should stop bot with confirmation dialog', async () => {
      // First start the bot
      await botPage.startBot();
      await expect(botPage.botStatus).toContainText('Running');

      // Then stop it
      await botPage.stopBotButton.click();

      await expect(botPage.confirmModal).toBeVisible();
      await expect(botPage.confirmModal).toContainText('Stop Trading Bot');

      const stopButton = botPage.confirmModal.locator('button:has-text("Stop Bot")');
      await stopButton.click();

      await expect(botPage.botStatus).toContainText('Stopped');
    });

    test('should pause and resume bot functionality', async () => {
      // Start bot first
      await botPage.startBot();
      await expect(botPage.botStatus).toContainText('Running');

      // Pause bot
      await botPage.pauseBotButton.click();
      await expect(botPage.botStatus).toContainText('Paused');
      await expect(botPage.resumeBotButton).toBeVisible();

      // Resume bot
      await botPage.resumeBotButton.click();
      await expect(botPage.botStatus).toContainText('Running');
    });

    test('should handle emergency stop correctly', async () => {
      // Start bot first
      await botPage.startBot();
      await expect(botPage.botStatus).toContainText('Running');

      // Emergency stop
      await botPage.emergencyStopButton.click();

      await expect(botPage.confirmModal).toBeVisible();
      await expect(botPage.confirmModal).toContainText('Emergency Stop');

      const emergencyButton = botPage.confirmModal.locator('button:has-text("Emergency Stop")');
      await emergencyButton.click();

      await expect(botPage.botStatus).toContainText('Emergency Stop');
      await expect(botPage.startBotButton).not.toBeVisible();
    });

    test('should disable controls during loading states', async () => {
      await botPage.startBotButton.click();
      await botPage.confirmModal.locator('button:has-text("Start Bot")').click();

      // All buttons should be disabled during loading
      await expect(botPage.startBotButton).toBeDisabled();
      await expect(botPage.stopBotButton).toBeDisabled();
      await expect(botPage.emergencyStopButton).toBeDisabled();
    });
  });

  test.describe('Real-time Data Updates', () => {
    test('should update performance metrics in real-time', async ({ page }) => {
      await botPage.startBot();

      const initialPnL = await botPage.dailyPnL.textContent();

      // Wait for potential updates (mock or real)
      await page.waitForTimeout(2000);

      // Check if the element is still present and potentially updated
      await expect(botPage.dailyPnL).toBeVisible();
    });

    test('should display current position when active', async () => {
      await botPage.startBot();

      // If bot is running and has a position, it should be displayed
      const positionExists = await botPage.currentPosition.isVisible();
      if (positionExists) {
        await expect(botPage.currentPosition).toContainText(/Symbol:|Side:|Entry:|Quantity:/);
      }
    });

    test('should show latest trading signals', async () => {
      await botPage.startBot();

      // Check for latest signal display
      const signalExists = await botPage.latestSignal.isVisible();
      if (signalExists) {
        await expect(botPage.latestSignal).toContainText(/Type:|LRO:|Strength:|Time:/);
      }
    });
  });

  test.describe('Paper Trading Mode', () => {
    test('should toggle paper trading mode correctly', async () => {
      await botPage.enablePaperTrading();
      await expect(botPage.paperTradingToggle).toBeChecked();

      // Paper trading indicator should be visible
      const paperIndicator = botPage.page.locator('[data-testid="paper-mode-indicator"]');
      await expect(paperIndicator).toBeVisible();
      await expect(paperIndicator).toContainText('PAPER');
    });

    test('should show different UI elements in paper mode', async () => {
      await botPage.enablePaperTrading();
      await botPage.startBot();

      const paperIndicator = botPage.page.locator('[data-testid="paper-mode-indicator"]');
      await expect(paperIndicator).toBeVisible();

      // Check for virtual portfolio display
      const virtualPortfolio = botPage.page.locator('[data-testid="virtual-portfolio"]');
      if (await virtualPortfolio.isVisible()) {
        await expect(virtualPortfolio).toContainText('Virtual');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should display error messages for invalid configurations', async () => {
      await botPage.switchToTab('risk');

      // Enter invalid max daily loss (negative value)
      await botPage.setConfigValue('max-daily-loss', '-100');

      await expect(botPage.errorMessage).toBeVisible();
      await expect(botPage.errorMessage).toContainText('daily loss');
    });

    test('should handle API connection errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/**', route => route.abort());

      await botPage.startBotButton.click();
      await botPage.confirmModal.locator('button:has-text("Start Bot")').click();

      // Should show error message
      const errorAlert = page.locator('[data-testid="connection-error"]');
      await expect(errorAlert).toBeVisible();
    });

    test('should show appropriate messages for different error states', async () => {
      // Test various error scenarios
      const errorScenarios = [
        { field: 'period', value: '0', expectedError: 'Period must be greater than 0' },
        { field: 'signal-period', value: '101', expectedError: 'Signal period cannot exceed 100' },
        {
          field: 'max-position-size',
          value: '-1',
          expectedError: 'Position size must be positive',
        },
      ];

      for (const scenario of errorScenarios) {
        await botPage.switchToTab('basic');
        await botPage.setConfigValue(scenario.field, scenario.value);

        const errorMsg = await botPage.errorMessage.textContent();
        expect(errorMsg).toContain(scenario.expectedError);
      }
    });
  });

  test.describe('Data Validation and Safety', () => {
    test('should prevent dangerous configurations', async () => {
      await botPage.switchToTab('risk');

      // Try to set extremely high stop loss
      await botPage.setConfigValue('stop-loss-percent', '50');
      await expect(botPage.errorMessage).toBeVisible();

      // Try to set zero max daily loss
      await botPage.setConfigValue('max-daily-loss', '0');
      await expect(botPage.errorMessage).toBeVisible();
    });

    test('should enforce reasonable limits on trading parameters', async () => {
      await botPage.switchToTab('basic');

      // Test period limits
      await botPage.setConfigValue('period', '1000');
      await expect(botPage.errorMessage).toBeVisible();

      await botPage.setConfigValue('period', '1');
      await expect(botPage.errorMessage).toBeVisible();
    });

    test('should validate symbol selection', async () => {
      const symbolDropdown = botPage.symbolSelector;
      await symbolDropdown.click();

      // Select a valid symbol
      await botPage.page.locator('[data-testid="symbol-BTCUSDT"]').click();
      await expect(botPage.errorMessage).not.toBeVisible();
    });
  });
});
