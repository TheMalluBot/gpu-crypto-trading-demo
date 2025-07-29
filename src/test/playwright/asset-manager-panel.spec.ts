import { test, expect, Page, Locator } from '@playwright/test';
import { TestHelpers } from '../../tests/playwright/utils/test-helpers';

/**
 * AssetManagerPanel UI Testing Suite
 * Tests modal functionality, responsiveness, and user interactions
 */

class AssetManagerPanelPage {
  private page: Page;
  private helpers: TestHelpers;

  // Selectors
  private readonly assetManagerButton = '[data-testid="asset-manager-button"], button:has-text("Asset Management")';
  private readonly modal = '[data-testid="asset-manager-modal"]';
  private readonly modalOverlay = '.fixed.inset-0.bg-black\\/50';
  private readonly closeButton = 'button:has-text("✕")';
  private readonly healthScore = '[data-testid="portfolio-health-score"]';
  private readonly tabButtons = '.flex.border-b button';
  private readonly overviewTab = 'button:has-text("Overview")';
  private readonly allocationsTab = 'button:has-text("Allocations")';
  private readonly profitTab = 'button:has-text("Profit Management")';
  private readonly rebalanceTab = 'button:has-text("Rebalancing")';

  constructor(page: Page) {
    this.page = page;
    this.helpers = new TestHelpers(page);
  }

  async openAssetManager() {
    await this.page.locator(this.assetManagerButton).click();
    await this.page.waitForSelector(this.modal, { timeout: 5000 });
  }

  async closeAssetManager() {
    await this.page.locator(this.closeButton).click();
    await this.page.waitForSelector(this.modal, { state: 'hidden', timeout: 5000 });
  }

  async switchToTab(tabName: string) {
    await this.page.locator(`button:has-text("${tabName}")`).click();
    await this.page.waitForTimeout(500); // Allow tab transition
  }

  async getModalElement(): Promise<Locator> {
    return this.page.locator(this.modal);
  }

  async isModalVisible(): Promise<boolean> {
    return await this.page.locator(this.modal).isVisible();
  }
}

test.describe('AssetManagerPanel Modal Tests', () => {
  let assetManagerPage: AssetManagerPanelPage;

  test.beforeEach(async ({ page }) => {
    assetManagerPage = new AssetManagerPanelPage(page);
    const helpers = new TestHelpers(page);
    
    // Navigate to the app and wait for it to load
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should open and close asset manager modal', async () => {
    // Test opening modal
    await assetManagerPage.openAssetManager();
    expect(await assetManagerPage.isModalVisible()).toBe(true);

    // Test closing modal
    await assetManagerPage.closeAssetManager();
    expect(await assetManagerPage.isModalVisible()).toBe(false);
  });

  test('should close modal when clicking overlay', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    // Click on the overlay (backdrop)
    await page.locator(assetManagerPage['modalOverlay']).click();
    
    // Modal should close
    expect(await assetManagerPage.isModalVisible()).toBe(false);
  });

  test('should display portfolio health score', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    // Check for portfolio health score
    const healthElement = page.locator('.text-white\\/60:has-text("Portfolio Health:")').locator('+ span');
    await expect(healthElement).toBeVisible();
    
    // Health score should be a percentage
    const healthText = await healthElement.textContent();
    expect(healthText).toMatch(/\d+%/);
  });

  test('should switch between tabs correctly', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    const tabs = ['Overview', 'Allocations', 'Profit Management', 'Rebalancing'];
    
    for (const tab of tabs) {
      await assetManagerPage.switchToTab(tab);
      
      // Check that the tab is active
      const tabButton = page.locator(`button:has-text("${tab}")`);
      await expect(tabButton).toHaveClass(/text-blue-400/);
      
      // Verify tab content is visible
      await expect(page.locator('.flex-1.overflow-y-auto')).toBeVisible();
    }
  });

  test('should display asset allocation chart in Allocations tab', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    await assetManagerPage.switchToTab('Allocations');
    
    // Check for pie chart container
    await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 10000 });
    
    // Check for allocation table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Asset Class")')).toBeVisible();
  });

  test('should display profit zones in Profit Management tab', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    await assetManagerPage.switchToTab('Profit Management');
    
    // Check for profit zones
    await expect(page.locator('h3:has-text("Profit Zones")')).toBeVisible();
    
    // Should show profit levels
    await expect(page.locator('text=% Profit')).toBeVisible();
  });

  test('should display rebalancing status in Rebalancing tab', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    await assetManagerPage.switchToTab('Rebalancing');
    
    // Check for rebalancing status
    await expect(page.locator('h3:has-text("Rebalancing Status")')).toBeVisible();
    
    // Should show frequency and last rebalance
    await expect(page.locator('text=Frequency')).toBeVisible();
    await expect(page.locator('text=Since Last Rebalance')).toBeVisible();
  });
});

test.describe('AssetManagerPanel Responsiveness Tests', () => {
  let assetManagerPage: AssetManagerPanelPage;

  test.beforeEach(async ({ page }) => {
    assetManagerPage = new AssetManagerPanelPage(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await assetManagerPage.openAssetManager();
    const modal = await assetManagerPage.getModalElement();
    
    // Modal should fit within viewport
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(375);
    
    // Check that content is scrollable
    await expect(modal.locator('.overflow-y-auto')).toBeVisible();
    
    // Test tab navigation on mobile
    await assetManagerPage.switchToTab('Allocations');
    await expect(page.locator('button:has-text("Allocations")')).toHaveClass(/text-blue-400/);
  });

  test('should be responsive on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await assetManagerPage.openAssetManager();
    const modal = await assetManagerPage.getModalElement();
    
    // Modal should utilize available space appropriately
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(768);
    expect(modalBox?.width).toBeGreaterThan(375);
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await assetManagerPage.openAssetManager();
    const modal = await assetManagerPage.getModalElement();
    
    // Modal should have maximum width constraint
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(1600); // Based on max-w-7xl
    
    // Grid layouts should be visible at desktop size
    await assetManagerPage.switchToTab('Overview');
    await expect(page.locator('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4')).toBeVisible();
  });

  test('should handle viewport size changes gracefully', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    // Start with desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    // Switch to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Modal should still be functional
    expect(await assetManagerPage.isModalVisible()).toBe(true);
    
    // Tabs should still work
    await assetManagerPage.switchToTab('Allocations');
    await expect(page.locator('button:has-text("Allocations")')).toHaveClass(/text-blue-400/);
  });
});

test.describe('AssetManagerPanel Z-Index and Overlay Tests', () => {
  let assetManagerPage: AssetManagerPanelPage;

  test.beforeEach(async ({ page }) => {
    assetManagerPage = new AssetManagerPanelPage(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should have correct z-index hierarchy', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    // Modal should have z-modal class
    const modal = page.locator(assetManagerPage['modalOverlay']);
    await expect(modal).toHaveClass(/z-modal/);
    
    // Check computed z-index value
    const zIndex = await modal.evaluate(el => window.getComputedStyle(el).zIndex);
    expect(parseInt(zIndex)).toBeGreaterThanOrEqual(1000);
  });

  test('should block interactions with background elements', async ({ page }) => {
    // Add a button behind the modal
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'background-button';
      button.textContent = 'Background Button';
      button.style.position = 'fixed';
      button.style.top = '50%';
      button.style.left = '50%';
      button.style.zIndex = '500';
      document.body.appendChild(button);
    });
    
    await assetManagerPage.openAssetManager();
    
    // Try to click the background button - should not work
    const backgroundButton = page.locator('#background-button');
    await expect(backgroundButton).not.toBeVisible();
  });

  test('should handle multiple modals correctly', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    // Try to open automation config panel from within asset manager
    const automationButton = page.locator('button:has-text("Automation"), [data-testid="automation-config"]');
    
    if (await automationButton.isVisible()) {
      await automationButton.click();
      
      // Both modals should be visible with correct stacking
      expect(await assetManagerPage.isModalVisible()).toBe(true);
      
      // The newer modal should be on top
      const automationModal = page.locator('[data-testid="automation-config-modal"]');
      if (await automationModal.isVisible()) {
        const automationZIndex = await automationModal.evaluate(el => 
          window.getComputedStyle(el).zIndex
        );
        const assetManagerZIndex = await (await assetManagerPage.getModalElement()).evaluate(el => 
          window.getComputedStyle(el).zIndex
        );
        
        expect(parseInt(automationZIndex)).toBeGreaterThanOrEqual(parseInt(assetManagerZIndex));
      }
    }
  });
});

test.describe('AssetManagerPanel Accessibility Tests', () => {
  let assetManagerPage: AssetManagerPanelPage;

  test.beforeEach(async ({ page }) => {
    assetManagerPage = new AssetManagerPanelPage(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should meet accessibility standards', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    const helpers = new TestHelpers(page);
    await helpers.checkAccessibility();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    // Focus should be trapped within modal
    await page.keyboard.press('Tab');
    
    // Check that focus moves through modal elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test escape key to close modal
    await page.keyboard.press('Escape');
    expect(await assetManagerPage.isModalVisible()).toBe(false);
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    // Modal should have role="dialog"
    const modal = await assetManagerPage.getModalElement();
    await expect(modal).toHaveAttribute('role', 'dialog');
    
    // Tabs should have proper ARIA attributes
    const tabButtons = page.locator('[role="tab"], button[aria-selected]');
    const tabCount = await tabButtons.count();
    
    if (tabCount > 0) {
      // At least one tab should be selected
      const selectedTab = tabButtons.filter({ hasAttribute: 'aria-selected' }).first();
      await expect(selectedTab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    const helpers = new TestHelpers(page);
    const contrastIssues = await helpers.checkColorContrast();
    
    // Should have minimal contrast issues
    expect(contrastIssues.length).toBeLessThan(5);
  });
});

test.describe('AssetManagerPanel Performance Tests', () => {
  let assetManagerPage: AssetManagerPanelPage;

  test.beforeEach(async ({ page }) => {
    assetManagerPage = new AssetManagerPanelPage(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should render modal quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await assetManagerPage.openAssetManager();
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Modal should render within 2 seconds
    expect(renderTime).toBeLessThan(2000);
  });

  test('should handle rapid tab switching', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    
    const tabs = ['Overview', 'Allocations', 'Profit Management', 'Rebalancing'];
    
    // Rapidly switch between tabs
    for (let i = 0; i < 3; i++) {
      for (const tab of tabs) {
        await assetManagerPage.switchToTab(tab);
        await page.waitForTimeout(100); // Brief pause
      }
    }
    
    // Should still be responsive
    expect(await assetManagerPage.isModalVisible()).toBe(true);
    
    // Final tab should be active
    const lastTab = page.locator('button:has-text("Rebalancing")');
    await expect(lastTab).toHaveClass(/text-blue-400/);
  });

  test('should handle chart rendering performance', async ({ page }) => {
    await assetManagerPage.openAssetManager();
    await assetManagerPage.switchToTab('Allocations');
    
    // Wait for charts to load
    await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 10000 });
    
    // Check that charts don't cause layout thrashing
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        layoutShifts: performance.getEntriesByType('layout-shift').length,
        reflows: (performance as any).measureUserAgentSpecificMetric?.('reflows') || 0
      };
    });
    
    // Should have minimal layout shifts
    expect(performanceMetrics.layoutShifts).toBeLessThan(5);
  });
});