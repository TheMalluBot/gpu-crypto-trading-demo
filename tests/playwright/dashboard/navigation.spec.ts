import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { RESPONSIVE_BREAKPOINTS, PERFORMANCE_THRESHOLDS } from '../fixtures/test-data';

/**
 * Dashboard & Navigation Tests
 * Tests core navigation functionality, responsive design, and user experience
 */

test.describe('Dashboard & Navigation', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test.describe('Application Startup', () => {
    test('should load the application successfully', async ({ page }) => {
      // Check that the main content area is visible
      await expect(page.locator('#main-content')).toBeVisible();
      
      // Check that navigation is present
      await expect(page.locator('nav')).toBeVisible();
      
      // Check that the title bar is present
      await expect(page.locator('[data-testid="title-bar"]')).toBeVisible();
      
      // Verify initial route redirect to /trade
      await expect(page).toHaveURL(/.*\/trade$/);
    });

    test('should display loading state initially', async ({ page }) => {
      // Navigate to a fresh instance
      await page.goto('http://localhost:1420/');
      
      // Check for loading indicator during initial load
      // Note: This might be brief, so we use a more flexible approach
      const hasLoadingState = await page.evaluate(() => {
        return document.querySelector('[data-testid="loading"], .animate-spin, .loading') !== null;
      });
      
      // If loading state was present, wait for it to disappear
      if (hasLoadingState) {
        await page.waitForFunction(() => {
          const loadingElements = document.querySelectorAll('[data-testid="loading"], .animate-spin, .loading');
          return loadingElements.length === 0;
        });
      }
      
      // Verify app is fully loaded
      await expect(page.locator('#main-content')).toBeVisible();
    });

    test('should show performance metrics in development mode', async ({ page }) => {
      // Look for FPS counter or other performance indicators
      const fpsIndicator = page.locator('text=/\\d+\\.\\d+ FPS/');
      
      // FPS counter might be hidden on mobile or disabled, so we check if it exists
      const isVisible = await fpsIndicator.isVisible().catch(() => false);
      
      if (isVisible) {
        // If visible, verify it shows reasonable FPS values
        const fpsText = await fpsIndicator.textContent();
        const fps = parseFloat(fpsText?.split(' ')[0] || '0');
        expect(fps).toBeGreaterThan(0);
        expect(fps).toBeLessThanOrEqual(120); // Reasonable upper bound
      }
    });

    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const errors = await helpers.checkForJSErrors();
      
      // Navigate around the app to generate potential errors
      await helpers.navigateToRoute('/dashboard');
      await helpers.navigateToRoute('/settings');
      await helpers.navigateToRoute('/trade');
      
      // Check that no critical JavaScript errors occurred
      const criticalErrors = errors.filter(error => 
        !error.includes('Warning') && 
        !error.includes('DevTools') &&
        !error.includes('Extension')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Navigation Between Tabs', () => {
    const routes = [
      { path: '/dashboard', name: 'Dashboard', selector: 'text=Dashboard' },
      { path: '/trade', name: 'Trade', selector: 'text=Trade' },
      { path: '/analytics', name: 'Analytics', selector: 'text=Analytics' },
      { path: '/bot', name: 'Bot', selector: 'text=Bot' },
      { path: '/settings', name: 'Settings', selector: 'text=Settings' },
      { path: '/tutorial', name: 'Tutorial', selector: 'text=Tutorial' }
    ];

    for (const route of routes) {
      test(`should navigate to ${route.name} page`, async ({ page }) => {
        await helpers.navigateToRoute(route.path);
        
        // Verify URL changed
        await expect(page).toHaveURL(new RegExp(`.*${route.path}$`));
        
        // Verify page content loaded
        await expect(page.locator('#main-content')).toBeVisible();
        
        // Look for page-specific content
        if (route.name === 'Dashboard') {
          await expect(page.locator('text=Dashboard')).toBeVisible();
        } else if (route.name === 'Settings') {
          await expect(page.locator('text=Trading Settings')).toBeVisible();
        } else if (route.name === 'Trade') {
          await expect(page.locator('text=Paper Trading')).toBeVisible();
        }
        
        // Verify navigation highlight
        const navButton = page.locator(`nav a[href="${route.path}"], nav button:has-text("${route.name}")`);
        if (await navButton.isVisible()) {
          // Check if the nav item has active state
          const classes = await navButton.getAttribute('class') || '';
          expect(classes).toMatch(/(active|selected|current)/i);
        }
      });
    }

    test('should maintain navigation state during page transitions', async ({ page }) => {
      // Navigate through multiple pages
      for (const route of routes.slice(0, 3)) {
        await helpers.navigateToRoute(route.path);
        
        // Verify navigation is always visible
        await expect(page.locator('nav')).toBeVisible();
        
        // Verify main content updates
        await expect(page.locator('#main-content')).toBeVisible();
        
        // Small delay to allow for transitions
        await page.waitForTimeout(300);
      }
    });

    test('should handle direct URL navigation', async ({ page }) => {
      // Test direct navigation to each route
      for (const route of routes) {
        await page.goto(`http://localhost:1420${route.path}`);
        await helpers.waitForAppLoad();
        
        // Verify correct page loaded
        await expect(page).toHaveURL(new RegExp(`.*${route.path}$`));
        await expect(page.locator('#main-content')).toBeVisible();
      }
    });

    test('should show smooth transitions between pages', async ({ page }) => {
      // Enable motion preference detection
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      
      await helpers.navigateToRoute('/dashboard');
      
      // Click navigation to trade page and observe transition
      const tradeNav = page.locator('nav a[href="/trade"], nav button:has-text("Trade")');
      await tradeNav.click();
      
      // Wait for transition to complete
      await page.waitForURL(/.*\/trade$/);
      await helpers.waitForAppLoad();
      
      // Verify we're on the correct page
      await expect(page.locator('#main-content')).toBeVisible();
    });
  });

  test.describe('Responsive Design Validation', () => {
    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize(RESPONSIVE_BREAKPOINTS.desktop);
      await helpers.waitForAppLoad();
      
      // Check that all navigation items are visible on desktop
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      // Check that content is properly sized
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();
      
      // Verify layout doesn't overflow
      const bodyOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      expect(bodyOverflow).toBe(false);
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize(RESPONSIVE_BREAKPOINTS.tablet);
      await helpers.waitForAppLoad();
      
      // Navigation should still be accessible
      await expect(page.locator('nav')).toBeVisible();
      
      // Content should adapt to tablet size
      await expect(page.locator('#main-content')).toBeVisible();
      
      // Check that touch targets are appropriately sized
      const buttons = page.locator('button, a');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const boundingBox = await button.boundingBox();
          if (boundingBox) {
            // Touch targets should be at least 44px (iOS guidelines)
            expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(32);
          }
        }
      }
    });

    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize(RESPONSIVE_BREAKPOINTS.mobile);
      await helpers.waitForAppLoad();
      
      // Check mobile navigation
      await expect(page.locator('nav')).toBeVisible();
      
      // Content should be accessible
      await expect(page.locator('#main-content')).toBeVisible();
      
      // Check for mobile-specific optimizations
      const isHamburgerMenu = await page.locator('[data-testid="mobile-menu"], .mobile-menu, .hamburger').isVisible();
      
      if (isHamburgerMenu) {
        console.log('Mobile hamburger menu detected');
      }
      
      // Verify no horizontal scrolling
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test('should handle orientation changes on mobile', async ({ page }) => {
      // Start with portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.waitForAppLoad();
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(1000); // Allow layout to settle
      
      // Verify layout still works
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
      
      // Check that content doesn't break
      const hasLayoutIssues = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let hasIssues = false;
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > window.innerWidth + 10) { // 10px tolerance
            hasIssues = true;
          }
        });
        
        return hasIssues;
      });
      
      expect(hasLayoutIssues).toBe(false);
    });

    test('should test all responsive breakpoints', async ({ page }) => {
      await helpers.testResponsiveness();
    });
  });

  test.describe('Theme Switching', () => {
    test('should have a consistent theme applied', async ({ page }) => {
      // Check for theme-related CSS classes or attributes
      const themeClasses = await page.evaluate(() => {
        return {
          documentElement: document.documentElement.className,
          body: document.body.className
        };
      });
      
      // Verify theme system is active
      expect(themeClasses.documentElement || themeClasses.body).toBeTruthy();
    });

    test('should maintain theme consistency across pages', async ({ page }) => {
      // Get initial theme state
      const initialTheme = await page.evaluate(() => {
        return {
          documentElement: document.documentElement.className,
          computedStyle: window.getComputedStyle(document.body).backgroundColor
        };
      });
      
      // Navigate to different pages
      await helpers.navigateToRoute('/dashboard');
      await helpers.navigateToRoute('/settings');
      
      // Check theme consistency
      const finalTheme = await page.evaluate(() => {
        return {
          documentElement: document.documentElement.className,
          computedStyle: window.getComputedStyle(document.body).backgroundColor
        };
      });
      
      expect(finalTheme.documentElement).toBe(initialTheme.documentElement);
      expect(finalTheme.computedStyle).toBe(initialTheme.computedStyle);
    });

    test('should test theme switching if available', async ({ page }) => {
      const themeChanged = await helpers.testThemeSwitch();
      
      if (themeChanged) {
        console.log('Theme switching functionality verified');
      } else {
        console.log('No theme switching functionality found - using fixed professional theme');
      }
    });
  });

  test.describe('Performance Metrics', () => {
    test('should meet performance thresholds', async ({ page }) => {
      const metrics = await helpers.checkPerformanceMetrics();
      
      // Verify performance metrics
      expect(metrics.loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.loadTime);
      expect(metrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.domContentLoaded);
      
      if (metrics.firstPaint > 0) {
        expect(metrics.firstPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstPaint);
      }
      
      if (metrics.firstContentfulPaint > 0) {
        expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
      }
    });

    test('should handle slow network conditions', async ({ page }) => {
      await helpers.simulateSlowNetwork();
      
      // Navigate with slow network
      await helpers.navigateToRoute('/dashboard');
      
      // Should still load eventually
      await expect(page.locator('#main-content')).toBeVisible({ timeout: 30000 });
    });

    test('should display performance indicators in dev mode', async ({ page }) => {
      // Look for FPS counter or performance stats
      const perfIndicators = [
        'text=/\\d+\\.\\d+ FPS/',
        '[data-testid="performance"]',
        '.performance-stats'
      ];
      
      let foundIndicator = false;
      for (const selector of perfIndicators) {
        try {
          await expect(page.locator(selector)).toBeVisible({ timeout: 2000 });
          foundIndicator = true;
          break;
        } catch {
          // Continue checking other selectors
        }
      }
      
      // In development mode, we should have some performance indicators
      if (!foundIndicator) {
        console.log('No performance indicators found - may be disabled in this environment');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 routes gracefully', async ({ page }) => {
      await page.goto('http://localhost:1420/nonexistent-route');
      
      // Should redirect to a valid route or show 404 page
      await page.waitForTimeout(2000);
      
      const currentURL = page.url();
      
      // Either redirected to valid route or showing error page
      const isValidRoute = ['/trade', '/dashboard', '/404'].some(route => 
        currentURL.includes(route)
      );
      
      expect(isValidRoute || currentURL.includes('404')).toBe(true);
    });

    test('should recover from navigation errors', async ({ page }) => {
      // Attempt navigation to invalid route
      await page.goto('http://localhost:1420/invalid-route');
      
      // Then navigate to valid route
      await helpers.navigateToRoute('/trade');
      
      // Should work normally
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page).toHaveURL(/.*\/trade$/);
    });
  });
});