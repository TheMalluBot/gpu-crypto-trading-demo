import { test, expect, Page, Locator } from '@playwright/test';
import { TestHelpers } from '../../tests/playwright/utils/test-helpers';

/**
 * AutomationConfigPanel UI Testing Suite
 * Tests modal behavior, form interactions, and configuration management
 */

class AutomationConfigPanelPage {
  private page: Page;
  private helpers: TestHelpers;

  // Selectors
  private readonly configButton = '[data-testid="automation-config-button"], button:has-text("Automation Config")';
  private readonly modal = '[data-testid="automation-config-modal"], .fixed.inset-0.bg-black\\/50';
  private readonly modalContent = '.glass-morphic, .glass-card';
  private readonly closeButton = 'button:has-text("Cancel"), button[aria-label="Close"]';
  private readonly saveButton = 'button:has-text("Save Configuration")';
  private readonly tabButtons = '.flex.border-b button';
  private readonly generalTab = 'button:has-text("General")';
  private readonly profitTab = 'button:has-text("Profit Management")';
  private readonly rebalanceTab = 'button:has-text("Rebalancing")';
  private readonly riskTab = 'button:has-text("Risk Controls")';

  constructor(page: Page) {
    this.page = page;
    this.helpers = new TestHelpers(page);
  }

  async openConfigPanel() {
    await this.page.locator(this.configButton).click();
    await this.page.waitForSelector(this.modal, { timeout: 5000 });
  }

  async closeConfigPanel() {
    await this.page.locator(this.closeButton).click();
    await this.page.waitForSelector(this.modal, { state: 'hidden', timeout: 5000 });
  }

  async saveConfiguration() {
    await this.page.locator(this.saveButton).click();
    await this.page.waitForSelector(this.modal, { state: 'hidden', timeout: 5000 });
  }

  async switchToTab(tabName: string) {
    await this.page.locator(`button:has-text("${tabName}")`).click();
    await this.page.waitForTimeout(500); // Allow tab transition
  }

  async toggleSwitch(switchSelector: string) {
    await this.page.locator(switchSelector).click();
    await this.page.waitForTimeout(300); // Allow animation
  }

  async adjustSlider(sliderSelector: string, value: string) {
    await this.page.locator(sliderSelector).fill(value);
    await this.page.waitForTimeout(300);
  }

  async isModalVisible(): Promise<boolean> {
    return await this.page.locator(this.modal).isVisible();
  }

  async getModalElement(): Promise<Locator> {
    return this.page.locator(this.modal);
  }
}

test.describe('AutomationConfigPanel Modal Tests', () => {
  let configPage: AutomationConfigPanelPage;

  test.beforeEach(async ({ page }) => {
    configPage = new AutomationConfigPanelPage(page);
    const helpers = new TestHelpers(page);
    
    // Navigate to the app and wait for it to load
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should open and close automation config modal', async () => {
    // Test opening modal
    await configPage.openConfigPanel();
    expect(await configPage.isModalVisible()).toBe(true);

    // Test closing modal with cancel button
    await configPage.closeConfigPanel();
    expect(await configPage.isModalVisible()).toBe(false);
  });

  test('should close modal when clicking outside', async ({ page }) => {
    await configPage.openConfigPanel();
    
    // Click outside the modal content
    await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });
    
    // Modal should close
    await page.waitForTimeout(1000);
    expect(await configPage.isModalVisible()).toBe(false);
  });

  test('should display all configuration tabs', async ({ page }) => {
    await configPage.openConfigPanel();
    
    const expectedTabs = ['General', 'Profit Management', 'Rebalancing', 'Risk Controls'];
    
    for (const tab of expectedTabs) {
      const tabButton = page.locator(`button:has-text("${tab}")`);
      await expect(tabButton).toBeVisible();
    }
  });

  test('should switch between tabs correctly', async ({ page }) => {
    await configPage.openConfigPanel();
    
    const tabs = ['General', 'Profit Management', 'Rebalancing', 'Risk Controls'];
    
    for (const tab of tabs) {
      await configPage.switchToTab(tab);
      
      // Check that the tab is active (has blue color)
      const tabButton = page.locator(`button:has-text("${tab}")`);
      await expect(tabButton).toHaveClass(/text-blue-400/);
      
      // Verify corresponding content is visible
      await expect(page.locator('.space-y-6')).toBeVisible();
    }
  });

  test('should save configuration and close modal', async ({ page }) => {
    await configPage.openConfigPanel();
    
    // Make some changes
    await configPage.switchToTab('General');
    
    // Find and toggle the master enable switch
    const enableSwitch = page.locator('button:has-text("Enable Automation")').locator('+ button');
    if (await enableSwitch.isVisible()) {
      await enableSwitch.click();
    }
    
    // Save configuration
    await configPage.saveConfiguration();
    
    // Modal should close
    expect(await configPage.isModalVisible()).toBe(false);
  });
});

test.describe('AutomationConfigPanel Form Interactions', () => {
  let configPage: AutomationConfigPanelPage;

  test.beforeEach(async ({ page }) => {
    configPage = new AutomationConfigPanelPage(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should handle toggle switches in General tab', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('General');
    
    // Find automation enable switch
    const switchButton = page.locator('.w-14.h-7.rounded-full').first();
    
    if (await switchButton.isVisible()) {
      const initialState = await switchButton.getAttribute('class');
      
      // Toggle the switch
      await switchButton.click();
      await page.waitForTimeout(500);
      
      // Check that state changed
      const newState = await switchButton.getAttribute('class');
      expect(newState).not.toBe(initialState);
    }
  });

  test('should handle range sliders in General tab', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('General');
    
    // Find monitoring interval slider
    const slider = page.locator('input[type="range"]').first();
    
    if (await slider.isVisible()) {
      // Set slider to a specific value
      await slider.fill('60000'); // 60 seconds
      
      // Check that the display value updates
      const displayValue = page.locator('text=/\\d+s/').first();
      await expect(displayValue).toContainText('60s');
    }
  });

  test('should handle profit management settings', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('Profit Management');
    
    // Check profit taking toggle
    const profitToggle = page.locator('button:has-text("Auto Profit Taking")').locator('+ button');
    
    if (await profitToggle.isVisible()) {
      await profitToggle.click();
      await page.waitForTimeout(300);
      
      // Verify toggle state changed
      const toggleClass = await profitToggle.getAttribute('class');
      expect(toggleClass).toContain('bg-green-500');
    }
    
    // Check profit threshold slider
    const thresholdSlider = page.locator('input[type="range"]').first();
    
    if (await thresholdSlider.isVisible()) {
      await thresholdSlider.fill('15');
      
      // Check display updates
      const thresholdDisplay = page.locator('text=/\\d+%/').first();
      await expect(thresholdDisplay).toContainText('15%');
    }
  });

  test('should display profit zones configuration', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('Profit Management');
    
    // Check for profit zones grid
    await expect(page.locator('text=Profit Zones')).toBeVisible();
    
    // Should show profit levels
    await expect(page.locator('text=10%')).toBeVisible();
    await expect(page.locator('text=20%')).toBeVisible();
    await expect(page.locator('text=50%')).toBeVisible();
  });

  test('should handle rebalancing settings', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('Rebalancing');
    
    // Check auto rebalancing toggle
    const rebalanceToggle = page.locator('button:has-text("Auto Rebalancing")').locator('+ button');
    
    if (await rebalanceToggle.isVisible()) {
      await rebalanceToggle.click();
      await page.waitForTimeout(300);
      
      // Verify blue color for rebalancing
      const toggleClass = await rebalanceToggle.getAttribute('class');
      expect(toggleClass).toContain('bg-blue-500');
    }
    
    // Check rebalance threshold slider
    const thresholdSlider = page.locator('input[type="range"]').first();
    
    if (await thresholdSlider.isVisible()) {
      await thresholdSlider.fill('5');
      
      // Check display updates
      const display = page.locator('text=/\\d+%/').first();
      await expect(display).toContainText('5%');
    }
  });

  test('should display target allocations', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('Rebalancing');
    
    // Check for target allocations display
    await expect(page.locator('text=Target Allocations')).toBeVisible();
    
    // Should show allocation percentages
    await expect(page.locator('text=60%')).toBeVisible(); // Large Cap
    await expect(page.locator('text=30%')).toBeVisible(); // Mid Cap
    await expect(page.locator('text=10%')).toBeVisible(); // Speculative
  });

  test('should handle risk control settings', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('Risk Controls');
    
    // Check emergency controls
    await expect(page.locator('text=Emergency Controls')).toBeVisible();
    await expect(page.locator('text=Flash Crash Protection')).toBeVisible();
    await expect(page.locator('text=High Volatility Scaling')).toBeVisible();
    
    // Check risk threshold sliders
    const sliders = page.locator('input[type="range"]');
    const sliderCount = await sliders.count();
    
    expect(sliderCount).toBeGreaterThan(0);
  });
});

test.describe('AutomationConfigPanel Responsiveness Tests', () => {
  let configPage: AutomationConfigPanelPage;

  test.beforeEach(async ({ page }) => {
    configPage = new AutomationConfigPanelPage(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await configPage.openConfigPanel();
    const modal = await configPage.getModalElement();
    
    // Modal should fit within viewport
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(375);
    
    // Tabs should stack or scroll horizontally
    const tabContainer = page.locator('.flex.border-b');
    await expect(tabContainer).toBeVisible();
    
    // Form elements should be touch-friendly
    const switches = page.locator('.w-14.h-7');
    if (await switches.count() > 0) {
      const switchBox = await switches.first().boundingBox();
      expect(switchBox?.height).toBeGreaterThanOrEqual(28); // 7 * 4 = 28px minimum
    }
  });

  test('should be responsive on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await configPage.openConfigPanel();
    const modal = await configPage.getModalElement();
    
    // Modal should utilize available space
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(768);
    expect(modalBox?.width).toBeGreaterThan(375);
    
    // Grid layouts should adapt
    await configPage.switchToTab('Risk Controls');
    const gridElements = page.locator('.grid.grid-cols-1.sm\\:grid-cols-2');
    await expect(gridElements.first()).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await configPage.openConfigPanel();
    const modal = await configPage.getModalElement();
    
    // Modal should have reasonable maximum width
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(1200); // Based on max-w-4xl
    
    // All tabs should be visible without scrolling
    const tabContainer = page.locator('.flex.border-b');
    const containerBox = await tabContainer.boundingBox();
    expect(containerBox?.width).toBeGreaterThan(600);
  });

  test('should handle orientation changes on mobile', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await configPage.openConfigPanel();
    
    expect(await configPage.isModalVisible()).toBe(true);
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(1000);
    
    // Modal should still be functional
    expect(await configPage.isModalVisible()).toBe(true);
    
    // Tab switching should still work
    await configPage.switchToTab('Profit Management');
    const activeTab = page.locator('button:has-text("Profit Management")');
    await expect(activeTab).toHaveClass(/text-blue-400/);
  });
});

test.describe('AutomationConfigPanel Accessibility Tests', () => {
  let configPage: AutomationConfigPanelPage;

  test.beforeEach(async ({ page }) => {
    configPage = new AutomationConfigPanelPage(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should meet accessibility standards', async ({ page }) => {
    await configPage.openConfigPanel();
    
    const helpers = new TestHelpers(page);
    await helpers.checkAccessibility();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await configPage.openConfigPanel();
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test arrow key navigation for tabs
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    // Test Enter to activate tab
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Test Escape to close modal
    await page.keyboard.press('Escape');
    expect(await configPage.isModalVisible()).toBe(false);
  });

  test('should have proper form labels and descriptions', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('General');
    
    // Check for form labels
    const labels = page.locator('label');
    const labelCount = await labels.count();
    expect(labelCount).toBeGreaterThan(0);
    
    // Check for descriptions
    const descriptions = page.locator('.text-sm.text-white\\/60');
    const descriptionCount = await descriptions.count();
    expect(descriptionCount).toBeGreaterThan(0);
  });

  test('should have accessible sliders', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('General');
    
    const sliders = page.locator('input[type="range"]');
    const sliderCount = await sliders.count();
    
    if (sliderCount > 0) {
      const firstSlider = sliders.first();
      
      // Should have min, max, and step attributes
      await expect(firstSlider).toHaveAttribute('min');
      await expect(firstSlider).toHaveAttribute('max');
      await expect(firstSlider).toHaveAttribute('step');
    }
  });

  test('should have accessible switches with proper states', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('General');
    
    const switches = page.locator('.w-14.h-7.rounded-full');
    const switchCount = await switches.count();
    
    if (switchCount > 0) {
      const firstSwitch = switches.first();
      
      // Should be keyboard accessible
      await firstSwitch.focus();
      await expect(firstSwitch).toBeFocused();
      
      // Should respond to Space key
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
    }
  });
});

test.describe('AutomationConfigPanel Performance Tests', () => {
  let configPage: AutomationConfigPanelPage;

  test.beforeEach(async ({ page }) => {
    configPage = new AutomationConfigPanelPage(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should render modal quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await configPage.openConfigPanel();
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Modal should render within 1.5 seconds
    expect(renderTime).toBeLessThan(1500);
  });

  test('should handle rapid form interactions', async ({ page }) => {
    await configPage.openConfigPanel();
    
    // Rapidly switch tabs and interact with controls
    const tabs = ['General', 'Profit Management', 'Rebalancing', 'Risk Controls'];
    
    for (let i = 0; i < 3; i++) {
      for (const tab of tabs) {
        await configPage.switchToTab(tab);
        
        // Try to interact with first available control
        const switches = page.locator('.w-14.h-7.rounded-full');
        if (await switches.count() > 0) {
          await switches.first().click();
        }
        
        const sliders = page.locator('input[type="range"]');
        if (await sliders.count() > 0) {
          await sliders.first().fill('10');
        }
        
        await page.waitForTimeout(50); // Brief pause
      }
    }
    
    // Modal should still be responsive
    expect(await configPage.isModalVisible()).toBe(true);
  });

  test('should handle form validation without lag', async ({ page }) => {
    await configPage.openConfigPanel();
    await configPage.switchToTab('General');
    
    // Find a slider and rapidly change values
    const slider = page.locator('input[type="range"]').first();
    
    if (await slider.isVisible()) {
      const values = ['5000', '60000', '120000', '300000'];
      
      const startTime = Date.now();
      
      for (const value of values) {
        await slider.fill(value);
        await page.waitForTimeout(100);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All interactions should complete quickly
      expect(totalTime).toBeLessThan(2000);
    }
  });

  test('should maintain smooth animations', async ({ page }) => {
    await configPage.openConfigPanel();
    
    // Test switch animations
    const switches = page.locator('.w-14.h-7.rounded-full');
    const switchCount = await switches.count();
    
    if (switchCount > 0) {
      const firstSwitch = switches.first();
      
      // Toggle multiple times rapidly
      for (let i = 0; i < 5; i++) {
        await firstSwitch.click();
        await page.waitForTimeout(200); // Allow animation
      }
      
      // Switch should still be responsive
      await expect(firstSwitch).toBeVisible();
    }
  });
});