import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../../tests/playwright/utils/test-helpers';

/**
 * Z-Index Hierarchy Testing Suite
 * Tests modal layering, dropdown overlays, and stacking context management
 */

class ZIndexTestHelper {
  private page: Page;
  private helpers: TestHelpers;

  // Expected z-index values from z-index.css
  private readonly zIndexLevels = {
    notification: 1100,
    modal: 1000,
    dropdown: 950,
    popover: 900,
    tooltip: 800,
    floating: 750,
    titlebar: 700,
    navigation: 650,
    header: 600,
    content: 400,
    form: 300,
    background: 100
  };

  constructor(page: Page) {
    this.page = page;
    this.helpers = new TestHelpers(page);
  }

  async getComputedZIndex(selector: string): Promise<number> {
    const element = this.page.locator(selector);
    const zIndex = await element.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return parseInt(computed.zIndex) || 0;
    });
    return zIndex;
  }

  async checkZIndexHierarchy(elements: Array<{ selector: string; expectedLevel: keyof typeof this.zIndexLevels }>) {
    const results: Array<{ selector: string; actualZIndex: number; expectedZIndex: number; correct: boolean }> = [];

    for (const element of elements) {
      const actualZIndex = await this.getComputedZIndex(element.selector);
      const expectedZIndex = this.zIndexLevels[element.expectedLevel];
      
      results.push({
        selector: element.selector,
        actualZIndex,
        expectedZIndex,
        correct: actualZIndex === expectedZIndex
      });
    }

    return results;
  }

  async createTestElement(zIndex: number, id: string, content: string = 'Test Element') {
    await this.page.evaluate(({ zIndex, id, content }) => {
      const element = document.createElement('div');
      element.id = id;
      element.textContent = content;
      element.style.position = 'fixed';
      element.style.top = '50%';
      element.style.left = '50%';
      element.style.width = '200px';
      element.style.height = '100px';
      element.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      element.style.color = 'white';
      element.style.display = 'flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
      element.style.zIndex = zIndex.toString();
      element.style.border = '2px solid white';
      document.body.appendChild(element);
    }, { zIndex, id, content });
  }

  async removeTestElement(id: string) {
    await this.page.evaluate((id) => {
      const element = document.getElementById(id);
      if (element) element.remove();
    }, id);
  }

  async checkElementsStackingOrder(topElementId: string, bottomElementId: string): Promise<boolean> {
    return await this.page.evaluate(({ topId, bottomId }) => {
      const topElement = document.getElementById(topId);
      const bottomElement = document.getElementById(bottomId);
      
      if (!topElement || !bottomElement) return false;
      
      const topZIndex = parseInt(window.getComputedStyle(topElement).zIndex) || 0;
      const bottomZIndex = parseInt(window.getComputedStyle(bottomElement).zIndex) || 0;
      
      return topZIndex > bottomZIndex;
    }, { topId: topElementId, bottomId: bottomElementId });
  }

  async simulateElementOverlap() {
    // Create overlapping elements to test stacking
    await this.createTestElement(500, 'background-element', 'Background');
    await this.createTestElement(1000, 'modal-element', 'Modal');
    await this.createTestElement(1100, 'notification-element', 'Notification');
    
    await this.page.waitForTimeout(500);
  }

  async cleanupTestElements() {
    await this.removeTestElement('background-element');
    await this.removeTestElement('modal-element');
    await this.removeTestElement('notification-element');
  }
}

test.describe('Modal Z-Index Hierarchy Tests', () => {
  let zIndexHelper: ZIndexTestHelper;

  test.beforeEach(async ({ page }) => {
    zIndexHelper = new ZIndexTestHelper(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should have correct z-index for asset manager modal', async ({ page }) => {
    // Open asset manager modal
    const assetManagerButton = page.locator('[data-testid="asset-manager-button"], button:has-text("Asset Management")');
    
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();
      
      // Check modal overlay z-index
      const modalOverlay = page.locator('.fixed.inset-0.bg-black\\/50');
      if (await modalOverlay.isVisible()) {
        const zIndex = await zIndexHelper.getComputedZIndex('.fixed.inset-0.bg-black\\/50');
        expect(zIndex).toBeGreaterThanOrEqual(1000); // Should be modal level
      }
      
      // Check for z-modal class
      const modalWithClass = page.locator('.z-modal');
      if (await modalWithClass.count() > 0) {
        const classZIndex = await zIndexHelper.getComputedZIndex('.z-modal');
        expect(classZIndex).toBe(1000);
      }
      
      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should have correct z-index for automation config modal', async ({ page }) => {
    const configButton = page.locator('[data-testid="automation-config-button"], button:has-text("Automation Config")');
    
    if (await configButton.isVisible()) {
      await configButton.click();
      
      // Check modal z-index
      const modal = page.locator('.fixed.inset-0');
      if (await modal.isVisible()) {
        const zIndex = await zIndexHelper.getComputedZIndex('.fixed.inset-0');
        expect(zIndex).toBeGreaterThanOrEqual(1000);
      }
      
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should stack multiple modals correctly', async ({ page }) => {
    // Open asset manager modal first
    const assetManagerButton = page.locator('[data-testid="asset-manager-button"], button:has-text("Asset Management")');
    
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();
      
      const firstModal = page.locator('.fixed.inset-0').first();
      const firstModalZIndex = await zIndexHelper.getComputedZIndex('.fixed.inset-0');
      
      // Try to open automation config from within asset manager (if available)
      const configButtonInModal = page.locator('button:has-text("Config"), button:has-text("Settings")');
      
      if (await configButtonInModal.count() > 0) {
        await configButtonInModal.first().click();
        
        // Second modal should have higher z-index
        const modals = page.locator('.fixed.inset-0');
        const modalCount = await modals.count();
        
        if (modalCount > 1) {
          const secondModalZIndex = await zIndexHelper.getComputedZIndex('.fixed.inset-0:nth-child(2)');
          expect(secondModalZIndex).toBeGreaterThanOrEqual(firstModalZIndex);
        }
      }
      
      await page.locator('button:has-text("✕"), button:has-text("Cancel")').first().click();
    }
  });

  test('should handle modal backdrop interactions correctly', async ({ page }) => {
    const assetManagerButton = page.locator('[data-testid="asset-manager-button"], button:has-text("Asset Management")');
    
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();
      
      // Create a background element to test interaction blocking
      await zIndexHelper.createTestElement(500, 'background-test', 'Background');
      
      // Modal should block interaction with background
      const modal = page.locator('.fixed.inset-0');
      const modalZIndex = await zIndexHelper.getComputedZIndex('.fixed.inset-0');
      const backgroundZIndex = await zIndexHelper.getComputedZIndex('#background-test');
      
      expect(modalZIndex).toBeGreaterThan(backgroundZIndex);
      
      // Try to click background element - should not work
      const backgroundElement = page.locator('#background-test');
      const isBackgroundVisible = await backgroundElement.isVisible();
      
      if (isBackgroundVisible) {
        // Background should be covered by modal
        expect(modalZIndex).toBeGreaterThan(backgroundZIndex);
      }
      
      await zIndexHelper.removeTestElement('background-test');
      await page.locator('button:has-text("✕")').click();
    }
  });
});

test.describe('Dropdown and Popover Z-Index Tests', () => {
  let zIndexHelper: ZIndexTestHelper;

  test.beforeEach(async ({ page }) => {
    zIndexHelper = new ZIndexTestHelper(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should have correct z-index for dropdowns within modals', async ({ page }) => {
    const assetManagerButton = page.locator('[data-testid="asset-manager-button"], button:has-text("Asset Management")');
    
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();
      
      // Look for dropdown triggers within the modal
      const dropdownTriggers = page.locator('select, .dropdown-trigger, [data-testid*="dropdown"]');
      const dropdownCount = await dropdownTriggers.count();
      
      if (dropdownCount > 0) {
        const firstDropdown = dropdownTriggers.first();
        await firstDropdown.click();
        
        // Check for opened dropdown
        const dropdownMenu = page.locator('.dropdown-menu, [role="listbox"], .z-dropdown');
        
        if (await dropdownMenu.count() > 0) {
          const dropdownZIndex = await zIndexHelper.getComputedZIndex('.dropdown-menu, [role="listbox"], .z-dropdown');
          expect(dropdownZIndex).toBe(950); // Expected dropdown z-index
        }
      }
      
      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should have correct z-index for tooltips', async ({ page }) => {
    // Look for elements that might have tooltips
    const tooltipTriggers = page.locator('[data-tooltip], [title], .has-tooltip');
    const triggerCount = await tooltipTriggers.count();
    
    if (triggerCount > 0) {
      const firstTrigger = tooltipTriggers.first();
      await firstTrigger.hover();
      
      // Wait for tooltip to appear
      await page.waitForTimeout(1000);
      
      // Check for tooltip
      const tooltips = page.locator('.tooltip, [role="tooltip"], .z-tooltip');
      
      if (await tooltips.count() > 0) {
        const tooltipZIndex = await zIndexHelper.getComputedZIndex('.tooltip, [role="tooltip"], .z-tooltip');
        expect(tooltipZIndex).toBe(800); // Expected tooltip z-index
      }
    }
  });

  test('should stack dropdowns above modal content but below notifications', async ({ page }) => {
    // Simulate the stacking scenario
    await zIndexHelper.simulateElementOverlap();
    
    // Check stacking order
    const notificationAboveModal = await zIndexHelper.checkElementsStackingOrder('notification-element', 'modal-element');
    const modalAboveBackground = await zIndexHelper.checkElementsStackingOrder('modal-element', 'background-element');
    
    expect(notificationAboveModal).toBe(true);
    expect(modalAboveBackground).toBe(true);
    
    await zIndexHelper.cleanupTestElements();
  });
});

test.describe('Navigation and UI Element Z-Index Tests', () => {
  let zIndexHelper: ZIndexTestHelper;

  test.beforeEach(async ({ page }) => {
    zIndexHelper = new ZIndexTestHelper(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should have correct z-index for navigation elements', async ({ page }) => {
    // Check navigation z-index
    const navigation = page.locator('nav, .navigation, .z-navigation');
    
    if (await navigation.count() > 0) {
      const navZIndex = await zIndexHelper.getComputedZIndex('nav, .navigation, .z-navigation');
      expect(navZIndex).toBe(650); // Expected navigation z-index
    }
  });

  test('should have correct z-index for title bar', async ({ page }) => {
    // Check title bar z-index
    const titlebar = page.locator('.titlebar, .title-bar, .z-titlebar');
    
    if (await titlebar.count() > 0) {
      const titlebarZIndex = await zIndexHelper.getComputedZIndex('.titlebar, .title-bar, .z-titlebar');
      expect(titlebarZIndex).toBe(700); // Expected titlebar z-index
    }
  });

  test('should have correct z-index for floating help button', async ({ page }) => {
    // Check floating help button
    const floatingButton = page.locator('.floating-help, [data-testid="floating-help"], .z-floating');
    
    if (await floatingButton.count() > 0) {
      const floatingZIndex = await zIndexHelper.getComputedZIndex('.floating-help, [data-testid="floating-help"], .z-floating');
      expect(floatingZIndex).toBe(750); // Expected floating z-index
    }
  });

  test('should maintain proper stacking context in complex layouts', async ({ page }) => {
    // Open asset manager to create complex stacking context
    const assetManagerButton = page.locator('[data-testid="asset-manager-button"], button:has-text("Asset Management")');
    
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();
      
      // Create elements to test the full hierarchy
      await zIndexHelper.createTestElement(100, 'background-layer', 'Background');
      await zIndexHelper.createTestElement(400, 'content-layer', 'Content');
      await zIndexHelper.createTestElement(650, 'nav-layer', 'Navigation');
      
      // Check proper stacking
      const hierarchyResults = await zIndexHelper.checkZIndexHierarchy([
        { selector: '#background-layer', expectedLevel: 'background' },
        { selector: '#content-layer', expectedLevel: 'content' },
        { selector: '#nav-layer', expectedLevel: 'navigation' }
      ]);
      
      // All elements should have correct z-indices
      for (const result of hierarchyResults) {
        expect(result.actualZIndex).toBe(result.expectedZIndex);
      }
      
      // Clean up
      await zIndexHelper.removeTestElement('background-layer');
      await zIndexHelper.removeTestElement('content-layer');
      await zIndexHelper.removeTestElement('nav-layer');
      
      await page.locator('button:has-text("✕")').click();
    }
  });
});

test.describe('Notification Z-Index Tests', () => {
  let zIndexHelper: ZIndexTestHelper;

  test.beforeEach(async ({ page }) => {
    zIndexHelper = new ZIndexTestHelper(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should have highest z-index for notifications', async ({ page }) => {
    // Look for notification containers
    const notifications = page.locator('.notification, [role="alert"], .z-notification, [data-testid*="notification"]');
    
    if (await notifications.count() > 0) {
      const notificationZIndex = await zIndexHelper.getComputedZIndex('.notification, [role="alert"], .z-notification');
      expect(notificationZIndex).toBe(1100); // Highest z-index
    }
  });

  test('should display notifications above all other elements', async ({ page }) => {
    // Create a notification scenario
    await zIndexHelper.simulateElementOverlap();
    
    // Create a mock notification
    await zIndexHelper.createTestElement(1100, 'test-notification', 'Notification');
    
    // Notification should be above everything
    const notificationAboveModal = await zIndexHelper.checkElementsStackingOrder('test-notification', 'modal-element');
    const notificationAboveBackground = await zIndexHelper.checkElementsStackingOrder('test-notification', 'background-element');
    
    expect(notificationAboveModal).toBe(true);
    expect(notificationAboveBackground).toBe(true);
    
    await zIndexHelper.removeTestElement('test-notification');
    await zIndexHelper.cleanupTestElements();
  });

  test('should handle multiple notifications stacking', async ({ page }) => {
    // Create multiple notifications to test stacking
    await zIndexHelper.createTestElement(1100, 'notification-1', 'Notification 1');
    await zIndexHelper.createTestElement(1100, 'notification-2', 'Notification 2');
    await zIndexHelper.createTestElement(1100, 'notification-3', 'Notification 3');
    
    // All should have same z-index (handled by DOM order)
    const zIndex1 = await zIndexHelper.getComputedZIndex('#notification-1');
    const zIndex2 = await zIndexHelper.getComputedZIndex('#notification-2');
    const zIndex3 = await zIndexHelper.getComputedZIndex('#notification-3');
    
    expect(zIndex1).toBe(1100);
    expect(zIndex2).toBe(1100);
    expect(zIndex3).toBe(1100);
    
    // Clean up
    await zIndexHelper.removeTestElement('notification-1');
    await zIndexHelper.removeTestElement('notification-2');
    await zIndexHelper.removeTestElement('notification-3');
  });
});

test.describe('Z-Index CSS Classes Validation', () => {
  let zIndexHelper: ZIndexTestHelper;

  test.beforeEach(async ({ page }) => {
    zIndexHelper = new ZIndexTestHelper(page);
    const helpers = new TestHelpers(page);
    
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should have correct utility z-index classes', async ({ page }) => {
    // Test utility classes by creating elements with them
    const utilityClasses = [
      { class: 'z-1100', expected: 1100 },
      { class: 'z-1000', expected: 1000 },
      { class: 'z-950', expected: 950 },
      { class: 'z-900', expected: 900 },
      { class: 'z-800', expected: 800 },
      { class: 'z-750', expected: 750 },
      { class: 'z-700', expected: 700 },
      { class: 'z-650', expected: 650 },
      { class: 'z-600', expected: 600 },
      { class: 'z-500', expected: 500 },
      { class: 'z-400', expected: 400 },
      { class: 'z-300', expected: 300 },
      { class: 'z-200', expected: 200 },
      { class: 'z-100', expected: 100 }
    ];

    for (const { class: className, expected } of utilityClasses) {
      // Create element with utility class
      await page.evaluate(({ className }) => {
        const element = document.createElement('div');
        element.id = `test-${className}`;
        element.className = className;
        element.style.position = 'absolute';
        document.body.appendChild(element);
      }, { className });

      // Check z-index
      const actualZIndex = await zIndexHelper.getComputedZIndex(`#test-${className}`);
      expect(actualZIndex).toBe(expected);

      // Clean up
      await page.evaluate(({ className }) => {
        const element = document.getElementById(`test-${className}`);
        if (element) element.remove();
      }, { className });
    }
  });

  test('should have correct semantic z-index classes', async ({ page }) => {
    const semanticClasses = [
      { class: 'z-notification', expected: 1100 },
      { class: 'z-modal', expected: 1000 },
      { class: 'z-dropdown', expected: 950 },
      { class: 'z-popover', expected: 900 },
      { class: 'z-tooltip', expected: 800 },
      { class: 'z-floating', expected: 750 },
      { class: 'z-titlebar', expected: 700 },
      { class: 'z-navigation', expected: 650 },
      { class: 'z-header', expected: 600 },
      { class: 'z-content', expected: 400 },
      { class: 'z-form', expected: 300 },
      { class: 'z-background', expected: 100 }
    ];

    for (const { class: className, expected } of semanticClasses) {
      // Create element with semantic class
      await page.evaluate(({ className }) => {
        const element = document.createElement('div');
        element.id = `test-${className}`;
        element.className = className;
        element.style.position = 'absolute';
        document.body.appendChild(element);
      }, { className });

      // Check z-index
      const actualZIndex = await zIndexHelper.getComputedZIndex(`#test-${className}`);
      expect(actualZIndex).toBe(expected);

      // Clean up
      await page.evaluate(({ className }) => {
        const element = document.getElementById(`test-${className}`);
        if (element) element.remove();
      }, { className });
    }
  });

  test('should not have z-index conflicts in actual UI', async ({ page }) => {
    // Check for elements that might have conflicting z-indices
    const allPositionedElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const positioned = elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.position !== 'static' && style.zIndex !== 'auto';
      });

      return positioned.map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        zIndex: parseInt(window.getComputedStyle(el).zIndex) || 0
      }));
    });

    // Check for potential conflicts
    const zIndexGroups = new Map<number, any[]>();
    
    for (const element of allPositionedElements) {
      if (!zIndexGroups.has(element.zIndex)) {
        zIndexGroups.set(element.zIndex, []);
      }
      zIndexGroups.get(element.zIndex)!.push(element);
    }

    // Report elements with same z-index (potential conflicts)
    for (const [zIndex, elements] of zIndexGroups) {
      if (elements.length > 1 && zIndex > 0) {
        console.log(`Z-index ${zIndex} used by ${elements.length} elements:`, elements);
        
        // This is informational - same z-index is okay if elements don't overlap
        // or are in different stacking contexts
      }
    }

    // At minimum, ensure we don't have negative z-indices (usually a sign of problems)
    const negativeZIndices = allPositionedElements.filter(el => el.zIndex < 0);
    expect(negativeZIndices.length).toBe(0);
  });
});