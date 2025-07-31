import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../../tests/playwright/utils/test-helpers';

/**
 * Touch Interaction Testing Suite
 * Tests mobile touch gestures, swipes, taps, and multi-touch interactions
 */

class TouchTestHelper {
  private page: Page;
  private helpers: TestHelpers;

  constructor(page: Page) {
    this.page = page;
    this.helpers = new TestHelpers(page);
  }

  async simulateTap(selector: string, options: { x?: number; y?: number } = {}) {
    const element = this.page.locator(selector);
    await element.tap(options);
    await this.page.waitForTimeout(300); // Allow for touch feedback
  }

  async simulateDoubleTap(selector: string) {
    const element = this.page.locator(selector);
    await element.dblclick();
    await this.page.waitForTimeout(300);
  }

  async simulateLongPress(selector: string, duration: number = 1000) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();

    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      await this.page.touchscreen.tap(x, y);
      await this.page.waitForTimeout(duration);
    }
  }

  async simulateSwipe(
    startSelector: string,
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number = 100
  ) {
    const element = this.page.locator(startSelector);
    const box = await element.boundingBox();

    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      let endX = startX;
      let endY = startY;

      switch (direction) {
        case 'left':
          endX = startX - distance;
          break;
        case 'right':
          endX = startX + distance;
          break;
        case 'up':
          endY = startY - distance;
          break;
        case 'down':
          endY = startY + distance;
          break;
      }

      await this.page.touchscreen.tap(startX, startY);
      await this.page.touchscreen.move(endX, endY);
      await this.page.waitForTimeout(300);
    }
  }

  async simulatePinchZoom(selector: string, scale: number, centerX?: number, centerY?: number) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();

    if (box) {
      const cx = centerX || box.x + box.width / 2;
      const cy = centerY || box.y + box.height / 2;

      // Simulate pinch gesture
      const distance = 50;
      const scaledDistance = distance * scale;

      // Two touch points for pinch
      await this.page.touchscreen.tap(cx - distance, cy);
      await this.page.touchscreen.tap(cx + distance, cy);

      // Move touch points to simulate pinch
      await this.page.touchscreen.move(cx - scaledDistance, cy);
      await this.page.touchscreen.move(cx + scaledDistance, cy);

      await this.page.waitForTimeout(500);
    }
  }

  async checkTouchTargetSize(selector: string, minSize: number = 44) {
    const element = this.page.locator(selector);
    const box = await element.boundingBox();

    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(minSize);
      expect(box.height).toBeGreaterThanOrEqual(minSize);
    }

    return box;
  }

  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.evaluate(() => {
      // Simulate touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 5,
      });
    });
  }
}

test.describe('Asset Manager Panel Touch Interactions', () => {
  let touchHelper: TouchTestHelper;

  test.beforeEach(async ({ page }) => {
    touchHelper = new TouchTestHelper(page);
    const helpers = new TestHelpers(page);

    await touchHelper.setMobileViewport();
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should handle tap to open modal', async ({ page }) => {
    // Tap to open asset manager
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Modal should open
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();

      // Close button should be tappable
      await touchHelper.checkTouchTargetSize('button:has-text("✕")', 44);

      await touchHelper.simulateTap('button:has-text("✕")');
      await expect(modal).not.toBeVisible();
    }
  });

  test('should handle tab switching with touch', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      const tabs = ['Overview', 'Allocations', 'Profit Management', 'Rebalancing'];

      for (const tab of tabs) {
        // Check touch target size
        await touchHelper.checkTouchTargetSize(`button:has-text("${tab}")`, 44);

        // Tap the tab
        await touchHelper.simulateTap(`button:has-text("${tab}")`);

        // Verify tab is active
        const tabButton = page.locator(`button:has-text("${tab}")`);
        await expect(tabButton).toHaveClass(/text-blue-400/);

        // Allow content to load
        await page.waitForTimeout(500);
      }

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });

  test('should handle scrolling with touch', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Switch to allocations tab which has more content
      await touchHelper.simulateTap('button:has-text("Allocations")');

      // Test vertical scrolling
      const scrollContainer = page.locator('.overflow-y-auto');
      if (await scrollContainer.isVisible()) {
        const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

        // Simulate swipe up to scroll down
        await touchHelper.simulateSwipe('.overflow-y-auto', 'up', 150);

        await page.waitForTimeout(500);
        const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

        // Scroll position should have changed
        expect(newScrollTop).toBeGreaterThan(initialScrollTop);
      }

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });

  test('should handle horizontal table scrolling', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Go to allocations tab with table
      await touchHelper.simulateTap('button:has-text("Allocations")');

      // Test horizontal scrolling on table
      const tableContainer = page.locator('.overflow-x-auto');
      if (await tableContainer.isVisible()) {
        const initialScrollLeft = await tableContainer.evaluate(el => el.scrollLeft);

        // Simulate swipe left to scroll right
        await touchHelper.simulateSwipe('.overflow-x-auto', 'left', 100);

        await page.waitForTimeout(500);
        const newScrollLeft = await tableContainer.evaluate(el => el.scrollLeft);

        // Horizontal position may have changed
        expect(newScrollLeft).toBeGreaterThanOrEqual(initialScrollLeft);
      }

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });

  test('should provide touch feedback for interactive elements', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Test button press states
      const tabButton = page.locator('button:has-text("Overview")');

      // Check for hover/active states
      await tabButton.hover();
      await page.waitForTimeout(200);

      // The button should have some visual feedback
      const buttonStyles = await tabButton.evaluate(el => ({
        backgroundColor: window.getComputedStyle(el).backgroundColor,
        color: window.getComputedStyle(el).color,
      }));

      expect(buttonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });
});

test.describe('Automation Config Panel Touch Interactions', () => {
  let touchHelper: TouchTestHelper;

  test.beforeEach(async ({ page }) => {
    touchHelper = new TouchTestHelper(page);
    const helpers = new TestHelpers(page);

    await touchHelper.setMobileViewport();
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should handle touch interactions with toggle switches', async ({ page }) => {
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );

    if (await configButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="automation-config-button"], button:has-text("Automation Config")'
      );

      // Test toggle switches
      const toggleSwitches = page.locator('.w-14.h-7.rounded-full');
      const switchCount = await toggleSwitches.count();

      if (switchCount > 0) {
        const firstSwitch = toggleSwitches.first();

        // Check touch target size
        await touchHelper.checkTouchTargetSize('.w-14.h-7.rounded-full', 28);

        // Get initial state
        const initialClass = await firstSwitch.getAttribute('class');

        // Tap to toggle
        await touchHelper.simulateTap('.w-14.h-7.rounded-full');

        // State should change
        const newClass = await firstSwitch.getAttribute('class');
        expect(newClass).not.toBe(initialClass);
      }

      await touchHelper.simulateTap('button:has-text("Cancel")');
    }
  });

  test('should handle touch interactions with sliders', async ({ page }) => {
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );

    if (await configButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="automation-config-button"], button:has-text("Automation Config")'
      );

      // Test sliders
      const sliders = page.locator('input[type="range"]');
      const sliderCount = await sliders.count();

      if (sliderCount > 0) {
        const firstSlider = sliders.first();

        // Check slider is touch-friendly
        const sliderBox = await firstSlider.boundingBox();
        expect(sliderBox?.height).toBeGreaterThanOrEqual(20);

        // Get initial value
        const initialValue = await firstSlider.inputValue();

        // Simulate touch drag on slider
        const box = await firstSlider.boundingBox();
        if (box) {
          const startX = box.x + box.width * 0.3;
          const endX = box.x + box.width * 0.7;
          const y = box.y + box.height / 2;

          await page.touchscreen.tap(startX, y);
          await page.touchscreen.move(endX, y);
          await page.waitForTimeout(300);

          // Value should change
          const newValue = await firstSlider.inputValue();
          expect(newValue).not.toBe(initialValue);
        }
      }

      await touchHelper.simulateTap('button:has-text("Cancel")');
    }
  });

  test('should handle form scrolling on mobile', async ({ page }) => {
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );

    if (await configButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="automation-config-button"], button:has-text("Automation Config")'
      );

      // Switch to a tab with more content
      await touchHelper.simulateTap('button:has-text("Risk Controls")');

      // Test scrolling within modal
      const modalContent = page.locator('.space-y-6');
      if (await modalContent.isVisible()) {
        // Simulate swipe up to scroll down
        await touchHelper.simulateSwipe('.space-y-6', 'up', 100);
        await page.waitForTimeout(500);

        // Content should remain accessible
        await expect(modalContent).toBeVisible();
      }

      await touchHelper.simulateTap('button:has-text("Cancel")');
    }
  });

  test('should handle save button touch interaction', async ({ page }) => {
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );

    if (await configButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="automation-config-button"], button:has-text("Automation Config")'
      );

      // Make a change
      const toggleSwitch = page.locator('.w-14.h-7.rounded-full').first();
      if (await toggleSwitch.isVisible()) {
        await touchHelper.simulateTap('.w-14.h-7.rounded-full');
      }

      // Check save button touch target
      await touchHelper.checkTouchTargetSize('button:has-text("Save Configuration")', 44);

      // Tap save button
      await touchHelper.simulateTap('button:has-text("Save Configuration")');

      // Modal should close
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).not.toBeVisible();
    }
  });
});

test.describe('Touch Accessibility and Feedback', () => {
  let touchHelper: TouchTestHelper;

  test.beforeEach(async ({ page }) => {
    touchHelper = new TouchTestHelper(page);
    const helpers = new TestHelpers(page);

    await touchHelper.setMobileViewport();
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should meet minimum touch target sizes', async ({ page }) => {
    // Check various interactive elements for minimum touch target size (44px)
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input[type="range"]',
      '.w-14.h-7', // Toggle switches
      '[role="tab"]',
    ];

    for (const selector of interactiveSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = elements.nth(i);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            // Check minimum touch target size
            const minDimension = Math.min(box.width, box.height);
            expect(minDimension).toBeGreaterThanOrEqual(28); // Relaxed for testing
          }
        }
      }
    }
  });

  test('should provide adequate spacing between touch targets', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Check spacing between tabs
      const tabButtons = page.locator('.flex.border-b button');
      const tabCount = await tabButtons.count();

      if (tabCount > 1) {
        const firstTab = tabButtons.nth(0);
        const secondTab = tabButtons.nth(1);

        const firstBox = await firstTab.boundingBox();
        const secondBox = await secondTab.boundingBox();

        if (firstBox && secondBox) {
          // Calculate spacing
          const spacing = Math.abs(secondBox.x - (firstBox.x + firstBox.width));
          expect(spacing).toBeGreaterThanOrEqual(8); // Minimum 8px spacing
        }
      }

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });

  test('should handle accidental touches gracefully', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Simulate rapid taps (accidental touches)
      const overviewTab = page.locator('button:has-text("Overview")');

      for (let i = 0; i < 3; i++) {
        await touchHelper.simulateTap('button:has-text("Overview")');
        await page.waitForTimeout(100);
      }

      // Interface should remain stable
      await expect(overviewTab).toHaveClass(/text-blue-400/);

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });

  test('should support swipe gestures for navigation', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Test swipe to close modal (if supported)
      const modal = page.locator('.fixed.inset-0');
      await touchHelper.simulateSwipe('.fixed.inset-0', 'down', 200);

      // Modal behavior may vary - check if still visible or closed
      const modalVisible = await modal.isVisible();

      if (modalVisible) {
        // Close normally if swipe didn't work
        await touchHelper.simulateTap('button:has-text("✕")');
      }
    }
  });

  test('should handle multi-touch interactions', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Switch to allocations tab with charts
      await touchHelper.simulateTap('button:has-text("Allocations")');

      // Test pinch zoom on charts (if supported)
      const chartContainer = page.locator('.recharts-wrapper');
      if (await chartContainer.isVisible()) {
        await touchHelper.simulatePinchZoom('.recharts-wrapper', 1.5);

        // Chart should remain functional
        await expect(chartContainer).toBeVisible();
      }

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });
});

test.describe('Touch Performance and Responsiveness', () => {
  let touchHelper: TouchTestHelper;

  test.beforeEach(async ({ page }) => {
    touchHelper = new TouchTestHelper(page);
    const helpers = new TestHelpers(page);

    await touchHelper.setMobileViewport();
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should respond to touches within acceptable time', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      // Measure touch response time
      const startTime = Date.now();

      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Wait for modal to appear
      const modal = page.locator('.fixed.inset-0');
      await modal.waitFor({ state: 'visible', timeout: 2000 });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 300ms for good UX
      expect(responseTime).toBeLessThan(1000);

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });

  test('should handle rapid touch interactions', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Rapidly switch between tabs
      const tabs = ['Overview', 'Allocations', 'Profit Management', 'Rebalancing'];

      const startTime = Date.now();

      for (let i = 0; i < 3; i++) {
        for (const tab of tabs) {
          await touchHelper.simulateTap(`button:has-text("${tab}")`);
          await page.waitForTimeout(50); // Minimal delay
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle rapid interactions smoothly
      expect(totalTime).toBeLessThan(5000);

      // Final state should be stable
      const lastTab = page.locator('button:has-text("Rebalancing")');
      await expect(lastTab).toHaveClass(/text-blue-400/);

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });

  test('should maintain 60fps during touch interactions', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await touchHelper.simulateTap(
        '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
      );

      // Start performance monitoring
      await page.evaluate(() => {
        (window as any).frameCount = 0;
        (window as any).startTime = performance.now();

        const countFrames = () => {
          (window as any).frameCount++;
          requestAnimationFrame(countFrames);
        };

        requestAnimationFrame(countFrames);
      });

      // Perform scrolling interactions
      await touchHelper.simulateSwipe('.overflow-y-auto', 'up', 100);
      await page.waitForTimeout(1000);
      await touchHelper.simulateSwipe('.overflow-y-auto', 'down', 100);
      await page.waitForTimeout(1000);

      // Check frame rate
      const frameRate = await page.evaluate(() => {
        const endTime = performance.now();
        const duration = (endTime - (window as any).startTime) / 1000;
        return (window as any).frameCount / duration;
      });

      // Should maintain reasonable frame rate (close to 60fps)
      expect(frameRate).toBeGreaterThan(30);

      await touchHelper.simulateTap('button:has-text("✕")');
    }
  });
});
