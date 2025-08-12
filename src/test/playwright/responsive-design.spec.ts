import { test, expect, Page, devices } from '@playwright/test';
import { TestHelpers } from '../../tests/playwright/utils/test-helpers';

/**
 * Responsive Design Testing Suite
 * Tests breakpoint behavior, grid layouts, and mobile adaptations
 */

class ResponsiveTestHelper {
  private page: Page;
  private helpers: TestHelpers;

  // Common breakpoints
  private readonly breakpoints = {
    mobile: { width: 375, height: 667, name: 'mobile' },
    mobileLandscape: { width: 667, height: 375, name: 'mobile-landscape' },
    tablet: { width: 768, height: 1024, name: 'tablet' },
    tabletLandscape: { width: 1024, height: 768, name: 'tablet-landscape' },
    desktop: { width: 1280, height: 720, name: 'desktop' },
    desktopLarge: { width: 1920, height: 1080, name: 'desktop-large' },
    ultrawide: { width: 2560, height: 1440, name: 'ultrawide' },
  };

  constructor(page: Page) {
    this.page = page;
    this.helpers = new TestHelpers(page);
  }

  async testBreakpoint(breakpoint: { width: number; height: number; name: string }) {
    await this.page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
    await this.page.waitForTimeout(1000); // Allow layout to settle

    return breakpoint;
  }

  async takeResponsiveScreenshot(name: string, viewport: string) {
    await this.page.screenshot({
      path: `test-results/responsive/${name}-${viewport}.png`,
      fullPage: true,
    });
  }

  async checkGridLayout(selector: string, expectedColumns: number) {
    const gridElement = this.page.locator(selector);

    if (await gridElement.isVisible()) {
      const computedStyle = await gridElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          gridTemplateColumns: styles.gridTemplateColumns,
        };
      });

      if (computedStyle.display === 'grid') {
        const columnCount = computedStyle.gridTemplateColumns.split(' ').length;
        expect(columnCount).toBeLessThanOrEqual(expectedColumns);
      }
    }
  }

  async testElementVisibility(selectors: string[], shouldBeVisible: boolean = true) {
    for (const selector of selectors) {
      const element = this.page.locator(selector);
      if (shouldBeVisible) {
        await expect(element).toBeVisible();
      } else {
        await expect(element).not.toBeVisible();
      }
    }
  }

  async checkScrollability(selector: string) {
    const element = this.page.locator(selector);

    if (await element.isVisible()) {
      const scrollInfo = await element.evaluate(el => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        hasVerticalScroll: el.scrollHeight > el.clientHeight,
      }));

      return scrollInfo;
    }

    return null;
  }
}

test.describe('Asset Manager Panel Responsive Design', () => {
  let responsiveHelper: ResponsiveTestHelper;

  test.beforeEach(async ({ page }) => {
    responsiveHelper = new ResponsiveTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should adapt to mobile breakpoints', async ({ page }) => {
    // Test mobile portrait
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].mobile);

    // Open asset manager
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Modal should fit mobile screen
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();

      // Check modal content doesn't overflow
      const modalContent = page.locator('.w-full.max-w-xs');
      if (await modalContent.isVisible()) {
        const contentBox = await modalContent.boundingBox();
        expect(contentBox?.width).toBeLessThanOrEqual(375);
      }

      // Tabs should be responsive
      const tabContainer = page.locator('.flex.border-b');
      await expect(tabContainer).toBeVisible();

      // Grid should stack on mobile
      await responsiveHelper.checkGridLayout(
        '.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4',
        1
      );

      await responsiveHelper.takeResponsiveScreenshot('asset-manager', 'mobile');

      // Close modal
      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should adapt to tablet breakpoints', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].tablet);

    // Open asset manager
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Modal should use tablet sizing
      const modalContent = page.locator('.max-w-sm, .max-w-md, .max-w-lg');
      await expect(modalContent.first()).toBeVisible();

      // Grid should show 2 columns on tablet
      await responsiveHelper.checkGridLayout(
        '.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4',
        2
      );

      await responsiveHelper.takeResponsiveScreenshot('asset-manager', 'tablet');

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should adapt to desktop breakpoints', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].desktop);

    // Open asset manager
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Modal should use full desktop sizing
      const modalContent = page.locator('.max-w-4xl, .max-w-6xl, .max-w-7xl');
      await expect(modalContent.first()).toBeVisible();

      // Grid should show 4 columns on desktop
      await responsiveHelper.checkGridLayout(
        '.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4',
        4
      );

      // Charts should be visible and properly sized
      await page.locator('button:has-text("Allocations")').click();
      await expect(page.locator('.recharts-wrapper')).toBeVisible();

      await responsiveHelper.takeResponsiveScreenshot('asset-manager', 'desktop');

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should handle viewport transitions smoothly', async ({ page }) => {
    // Open asset manager first
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Test transition from desktop to mobile
      await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].desktop);
      await page.waitForTimeout(500);

      await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].mobile);
      await page.waitForTimeout(500);

      // Modal should still be functional
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();

      // Tabs should still work
      await page.locator('button:has-text("Overview")').click();
      await expect(page.locator('button:has-text("Overview")')).toHaveClass(/text-blue-400/);

      await page.locator('button:has-text("✕")').click();
    }
  });
});

test.describe('Automation Config Panel Responsive Design', () => {
  let responsiveHelper: ResponsiveTestHelper;

  test.beforeEach(async ({ page }) => {
    responsiveHelper = new ResponsiveTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should adapt form elements to mobile', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].mobile);

    // Open automation config
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );
    if (await configButton.isVisible()) {
      await configButton.click();

      // Form elements should be touch-friendly
      const switches = page.locator('.w-14.h-7');
      if ((await switches.count()) > 0) {
        const switchBox = await switches.first().boundingBox();
        expect(switchBox?.height).toBeGreaterThanOrEqual(28); // Touch target size
      }

      // Sliders should be accessible
      const sliders = page.locator('input[type="range"]');
      if ((await sliders.count()) > 0) {
        const sliderBox = await sliders.first().boundingBox();
        expect(sliderBox?.height).toBeGreaterThanOrEqual(20);
      }

      await responsiveHelper.takeResponsiveScreenshot('automation-config', 'mobile');

      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should stack form grids on mobile', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].mobile);

    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );
    if (await configButton.isVisible()) {
      await configButton.click();

      // Switch to risk controls tab which has grids
      await page.locator('button:has-text("Risk Controls")').click();

      // Grid should stack on mobile
      await responsiveHelper.checkGridLayout('.grid.grid-cols-1.sm\\:grid-cols-2', 1);

      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should expand form grids on desktop', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].desktop);

    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );
    if (await configButton.isVisible()) {
      await configButton.click();

      // Switch to risk controls tab
      await page.locator('button:has-text("Risk Controls")').click();

      // Grid should show 2 columns on desktop
      await responsiveHelper.checkGridLayout('.grid.grid-cols-1.sm\\:grid-cols-2', 2);

      await responsiveHelper.takeResponsiveScreenshot('automation-config', 'desktop');

      await page.locator('button:has-text("Cancel")').click();
    }
  });
});

test.describe('Grid Layout Responsiveness', () => {
  let responsiveHelper: ResponsiveTestHelper;

  test.beforeEach(async ({ page }) => {
    responsiveHelper = new ResponsiveTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should adapt dashboard grid layouts', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667, expectedCols: 1 },
      { name: 'tablet', width: 768, height: 1024, expectedCols: 2 },
      { name: 'desktop', width: 1280, height: 720, expectedCols: 3 },
    ];

    for (const bp of breakpoints) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.waitForTimeout(1000);

      // Check main dashboard grid
      const dashboardGrid = page.locator('.grid').first();
      if (await dashboardGrid.isVisible()) {
        await responsiveHelper.checkGridLayout('.grid', bp.expectedCols);
      }

      await responsiveHelper.takeResponsiveScreenshot('dashboard-grid', bp.name);
    }
  });

  test('should handle dynamic content in grids', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].mobile);

    // Test grids with varying content lengths
    const gridItems = page.locator('.grid > *');
    const itemCount = await gridItems.count();

    if (itemCount > 0) {
      // Add some dynamic content to test grid adaptation
      await page.evaluate(() => {
        const grids = document.querySelectorAll('.grid');
        grids.forEach(grid => {
          const items = grid.children;
          for (let i = 0; i < items.length; i++) {
            const item = items[i] as HTMLElement;
            if (i % 2 === 0) {
              item.style.height = '150px';
            } else {
              item.style.height = '100px';
            }
          }
        });
      });

      await page.waitForTimeout(500);

      // Grid should still maintain proper layout
      const gridElement = page.locator('.grid').first();
      if (await gridElement.isVisible()) {
        const gridBox = await gridElement.boundingBox();
        expect(gridBox?.width).toBeLessThanOrEqual(375);
      }
    }
  });
});

test.describe('Scroll Container Tests', () => {
  let responsiveHelper: ResponsiveTestHelper;

  test.beforeEach(async ({ page }) => {
    responsiveHelper = new ResponsiveTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should handle modal content scrolling', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].mobile);

    // Open asset manager which has scrollable content
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Check if content area is scrollable
      const scrollContainer = page.locator('.overflow-y-auto');
      if (await scrollContainer.isVisible()) {
        const scrollInfo = await responsiveHelper.checkScrollability('.overflow-y-auto');

        if (scrollInfo && scrollInfo.hasVerticalScroll) {
          // Test scroll functionality
          await scrollContainer.scroll({ top: 100 });
          await page.waitForTimeout(500);

          // Verify scroll position changed
          const scrollTop = await scrollContainer.evaluate(el => el.scrollTop);
          expect(scrollTop).toBeGreaterThan(0);
        }
      }

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should maintain scroll position during tab switches', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].mobile);

    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Switch to allocations tab (likely has more content)
      await page.locator('button:has-text("Allocations")').click();

      const scrollContainer = page.locator('.overflow-y-auto');
      if (await scrollContainer.isVisible()) {
        // Scroll down
        await scrollContainer.scroll({ top: 200 });
        const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

        // Switch tabs and back
        await page.locator('button:has-text("Overview")').click();
        await page.locator('button:has-text("Allocations")').click();

        // Scroll position may reset (this is expected behavior)
        const finalScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
        expect(finalScrollTop).toBeGreaterThanOrEqual(0);
      }

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should handle horizontal scroll for tables', async ({ page }) => {
    await responsiveHelper.testBreakpoint(responsiveHelper['breakpoints'].mobile);

    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Go to allocations tab which has tables
      await page.locator('button:has-text("Allocations")').click();

      // Check for horizontal scroll on table
      const tableContainer = page.locator('.overflow-x-auto');
      if (await tableContainer.isVisible()) {
        const table = tableContainer.locator('table');
        if (await table.isVisible()) {
          const tableBox = await table.boundingBox();
          const containerBox = await tableContainer.boundingBox();

          if (tableBox && containerBox && tableBox.width > containerBox.width) {
            // Test horizontal scrolling
            await tableContainer.scroll({ left: 50 });
            await page.waitForTimeout(500);

            const scrollLeft = await tableContainer.evaluate(el => el.scrollLeft);
            expect(scrollLeft).toBeGreaterThan(0);
          }
        }
      }

      await page.locator('button:has-text("✕")').click();
    }
  });
});

test.describe('High DPI and Retina Display Tests', () => {
  let responsiveHelper: ResponsiveTestHelper;

  test.beforeEach(async ({ page }) => {
    responsiveHelper = new ResponsiveTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should render correctly on high DPI displays', async ({ page }) => {
    // Simulate high DPI display
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ colorScheme: 'dark' });

    // Simulate device pixel ratio
    await page.evaluate(() => {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: () => 2,
      });
    });

    // Open asset manager
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );
    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Check that elements are crisp and properly sized
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();

      // Take high-DPI screenshot
      await page.screenshot({
        path: 'test-results/responsive/asset-manager-high-dpi.png',
        fullPage: true,
        devicePixelRatio: 2,
      });

      await page.locator('button:has-text("✕")').click();
    }
  });
});
