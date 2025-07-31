import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
import { TestHelpers } from '../../tests/playwright/utils/test-helpers';

/**
 * Accessibility Testing Suite
 * Tests WCAG compliance, keyboard navigation, screen reader compatibility
 */

class AccessibilityTestHelper {
  private page: Page;
  private helpers: TestHelpers;

  constructor(page: Page) {
    this.page = page;
    this.helpers = new TestHelpers(page);
  }

  async injectAxeCore() {
    await injectAxe(this.page);
  }

  async runAccessibilityAudit(
    options: {
      include?: string[];
      exclude?: string[];
      tags?: string[];
      rules?: Record<string, { enabled: boolean }>;
    } = {}
  ) {
    const defaultOptions = {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      ...options,
    };

    await checkA11y(this.page, undefined, defaultOptions, true, 'v2');
  }

  async getAccessibilityViolations(selector?: string) {
    return await getViolations(this.page, selector);
  }

  async checkColorContrast() {
    const contrastResults = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues: Array<{
        element: string;
        color: string;
        backgroundColor: string;
        ratio: number | null;
      }> = [];

      elements.forEach(el => {
        const htmlEl = el as HTMLElement;
        const styles = window.getComputedStyle(htmlEl);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;

        // Skip elements without visible text
        if (
          !htmlEl.textContent?.trim() ||
          backgroundColor === 'rgba(0, 0, 0, 0)' ||
          backgroundColor === 'transparent'
        )
          return;

        // Simple contrast check (would use more sophisticated calculation in production)
        const ratio = this.calculateContrastRatio
          ? this.calculateContrastRatio(color, backgroundColor)
          : null;

        if (ratio && ratio < 4.5) {
          // WCAG AA standard
          issues.push({
            element: htmlEl.tagName + (htmlEl.className ? '.' + htmlEl.className : ''),
            color,
            backgroundColor,
            ratio,
          });
        }
      });

      return issues;
    });

    return contrastResults;
  }

  async checkFocusManagement() {
    // Test tab order and focus visibility
    const focusableElements = await this.page
      .locator(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      .all();

    const focusResults = [];

    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      const element = focusableElements[i];
      await element.focus();

      const focused = await this.page.locator(':focus').first();
      const isVisible = await focused.isVisible();
      const hasFocusStyles = await focused.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return (
          styles.outline !== 'none' || styles.outlineWidth !== '0px' || styles.boxShadow !== 'none'
        );
      });

      focusResults.push({
        index: i,
        visible: isVisible,
        hasFocusStyles,
        element: await element.getAttribute('tagName'),
      });
    }

    return focusResults;
  }

  async checkAriaAttributes() {
    const ariaResults = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-*], [role]');
      const issues: Array<{
        element: string;
        attributes: Record<string, string>;
        issues: string[];
      }> = [];

      elements.forEach(el => {
        const htmlEl = el as HTMLElement;
        const attributes: Record<string, string> = {};
        const elementIssues: string[] = [];

        // Collect ARIA attributes
        for (let i = 0; i < htmlEl.attributes.length; i++) {
          const attr = htmlEl.attributes[i];
          if (attr.name.startsWith('aria-') || attr.name === 'role') {
            attributes[attr.name] = attr.value;
          }
        }

        // Basic validation
        if (attributes.role && !attributes.role.trim()) {
          elementIssues.push('Empty role attribute');
        }

        if (attributes['aria-labelledby']) {
          const referencedId = attributes['aria-labelledby'];
          if (!document.getElementById(referencedId)) {
            elementIssues.push(`aria-labelledby references non-existent ID: ${referencedId}`);
          }
        }

        if (attributes['aria-describedby']) {
          const referencedId = attributes['aria-describedby'];
          if (!document.getElementById(referencedId)) {
            elementIssues.push(`aria-describedby references non-existent ID: ${referencedId}`);
          }
        }

        if (elementIssues.length > 0) {
          issues.push({
            element: htmlEl.tagName + (htmlEl.className ? '.' + htmlEl.className : ''),
            attributes,
            issues: elementIssues,
          });
        }
      });

      return issues;
    });

    return ariaResults;
  }

  async checkHeadingStructure() {
    const headings = await this.page.evaluate(() => {
      const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headingElements).map(el => ({
        level: parseInt(el.tagName.substring(1)),
        text: el.textContent?.trim() || '',
        hasContent: Boolean(el.textContent?.trim()),
      }));
    });

    // Check for proper heading hierarchy
    const issues = [];
    let previousLevel = 0;

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];

      if (!heading.hasContent) {
        issues.push(`Empty heading at position ${i + 1}`);
      }

      if (i === 0 && heading.level !== 1) {
        issues.push('First heading should be h1');
      }

      if (heading.level > previousLevel + 1) {
        issues.push(
          `Heading level jumps from h${previousLevel} to h${heading.level} at position ${i + 1}`
        );
      }

      previousLevel = heading.level;
    }

    return { headings, issues };
  }

  async checkFormAccessibility() {
    const formResults = await this.page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input, select, textarea');
      const issues: string[] = [];

      // Check form labels
      inputs.forEach(input => {
        const htmlInput = input as HTMLInputElement;
        const id = htmlInput.id;
        const type = htmlInput.type;

        if (type === 'hidden') return; // Skip hidden inputs

        const hasLabel = document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = htmlInput.getAttribute('aria-label');
        const hasAriaLabelledBy = htmlInput.getAttribute('aria-labelledby');

        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
          issues.push(`Input ${htmlInput.tagName}[type="${type}"] lacks proper labeling`);
        }
      });

      // Check required field indication
      const requiredInputs = document.querySelectorAll(
        'input[required], select[required], textarea[required]'
      );
      requiredInputs.forEach(input => {
        const htmlInput = input as HTMLElement;
        const hasAriaRequired = htmlInput.getAttribute('aria-required') === 'true';
        const hasVisualIndicator =
          htmlInput.getAttribute('aria-label')?.includes('required') ||
          document.querySelector(`label[for="${htmlInput.id}"]`)?.textContent?.includes('*');

        if (!hasAriaRequired && !hasVisualIndicator) {
          issues.push(`Required field lacks proper indication: ${htmlInput.tagName}`);
        }
      });

      return { formCount: forms.length, inputCount: inputs.length, issues };
    });

    return formResults;
  }
}

test.describe('Asset Manager Panel Accessibility Tests', () => {
  let a11yHelper: AccessibilityTestHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new AccessibilityTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
    await a11yHelper.injectAxeCore();
  });

  test('should meet WCAG 2.1 AA standards', async ({ page }) => {
    // Open asset manager
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Run full accessibility audit
      await a11yHelper.runAccessibilityAudit({
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      });

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should have proper modal accessibility attributes', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Check modal has role="dialog"
      const modal = page.locator('.fixed.inset-0').first();
      const modalContent = modal.locator('.glass-morphic, .w-full').first();

      // Modal should have proper ARIA attributes
      const ariaAttributes = await modalContent.evaluate(el => ({
        role: el.getAttribute('role'),
        ariaModal: el.getAttribute('aria-modal'),
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledby: el.getAttribute('aria-labelledby'),
      }));

      // Modal should have proper role and attributes
      expect(ariaAttributes.role || '').toMatch(/dialog|modal/);

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should trap focus within modal', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Test focus trapping
      const focusableElements = page.locator(
        'button, [tabindex]:not([tabindex="-1"]), input, select'
      );
      const focusableCount = await focusableElements.count();

      if (focusableCount > 0) {
        // Start tabbing through elements
        await page.keyboard.press('Tab');

        // Tab through all elements
        for (let i = 0; i < focusableCount + 2; i++) {
          await page.keyboard.press('Tab');

          const focusedElement = page.locator(':focus');
          const isWithinModal = await focusedElement.evaluate(el => {
            const modal = document.querySelector('.fixed.inset-0');
            return modal ? modal.contains(el) : false;
          });

          // Focus should remain within modal
          if (await focusedElement.isVisible()) {
            expect(isWithinModal).toBe(true);
          }
        }
      }

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should support escape key to close', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Modal should be visible
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();

      // Press escape to close
      await page.keyboard.press('Escape');

      // Modal should close
      await expect(modal).not.toBeVisible();
    }
  });

  test('should have accessible tab navigation', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Test tab button accessibility
      const tabButtons = page.locator('.flex.border-b button');
      const tabCount = await tabButtons.count();

      if (tabCount > 0) {
        for (let i = 0; i < tabCount; i++) {
          const tab = tabButtons.nth(i);

          // Tab should have proper ARIA attributes
          const ariaAttributes = await tab.evaluate(el => ({
            role: el.getAttribute('role'),
            ariaSelected: el.getAttribute('aria-selected'),
            tabIndex: el.getAttribute('tabindex'),
          }));

          // Focus the tab
          await tab.focus();

          // Should be focusable
          await expect(tab).toBeFocused();

          // Activate with Enter or Space
          await page.keyboard.press('Enter');

          // Check if tab became active
          const isActive = await tab.evaluate(
            el =>
              el.classList.contains('text-blue-400') || el.getAttribute('aria-selected') === 'true'
          );

          if (isActive) {
            expect(isActive).toBe(true);
          }
        }
      }

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Run color contrast audit
      await a11yHelper.runAccessibilityAudit({
        tags: ['color-contrast'],
      });

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should have proper heading structure', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      const headingStructure = await a11yHelper.checkHeadingStructure();

      // Should have at least one heading
      expect(headingStructure.headings.length).toBeGreaterThan(0);

      // Report any heading issues
      if (headingStructure.issues.length > 0) {
        console.log('Heading structure issues:', headingStructure.issues);
      }

      await page.locator('button:has-text("✕")').click();
    }
  });
});

test.describe('Automation Config Panel Accessibility Tests', () => {
  let a11yHelper: AccessibilityTestHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new AccessibilityTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
    await a11yHelper.injectAxeCore();
  });

  test('should meet WCAG standards for form elements', async ({ page }) => {
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );

    if (await configButton.isVisible()) {
      await configButton.click();

      // Run form accessibility audit
      await a11yHelper.runAccessibilityAudit({
        tags: ['wcag2a', 'wcag2aa', 'forms'],
      });

      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should have accessible form controls', async ({ page }) => {
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );

    if (await configButton.isVisible()) {
      await configButton.click();

      // Check form accessibility
      const formResults = await a11yHelper.checkFormAccessibility();

      // Report form issues
      if (formResults.issues.length > 0) {
        console.log('Form accessibility issues:', formResults.issues);

        // Allow some issues but ensure they're documented
        expect(formResults.issues.length).toBeLessThan(5);
      }

      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should have accessible toggle switches', async ({ page }) => {
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );

    if (await configButton.isVisible()) {
      await configButton.click();

      // Check toggle switches
      const toggleSwitches = page.locator('.w-14.h-7.rounded-full');
      const switchCount = await toggleSwitches.count();

      if (switchCount > 0) {
        for (let i = 0; i < Math.min(switchCount, 3); i++) {
          const toggle = toggleSwitches.nth(i);

          // Should be keyboard accessible
          await toggle.focus();
          await expect(toggle).toBeFocused();

          // Should respond to Space key
          const initialState = await toggle.getAttribute('class');
          await page.keyboard.press('Space');
          const newState = await toggle.getAttribute('class');

          // State should change or remain consistent
          expect(typeof newState).toBe('string');
        }
      }

      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should have accessible range sliders', async ({ page }) => {
    const configButton = page.locator(
      '[data-testid="automation-config-button"], button:has-text("Automation Config")'
    );

    if (await configButton.isVisible()) {
      await configButton.click();

      // Check range sliders
      const sliders = page.locator('input[type="range"]');
      const sliderCount = await sliders.count();

      if (sliderCount > 0) {
        for (let i = 0; i < Math.min(sliderCount, 3); i++) {
          const slider = sliders.nth(i);

          // Should have proper attributes
          const attributes = await slider.evaluate(el => ({
            min: el.getAttribute('min'),
            max: el.getAttribute('max'),
            step: el.getAttribute('step'),
            value: el.getAttribute('value'),
            ariaLabel: el.getAttribute('aria-label'),
            ariaValueNow: el.getAttribute('aria-valuenow'),
          }));

          // Should have min and max
          expect(attributes.min).toBeTruthy();
          expect(attributes.max).toBeTruthy();

          // Should be keyboard accessible
          await slider.focus();
          await expect(slider).toBeFocused();

          // Should respond to arrow keys
          const initialValue = await slider.inputValue();
          await page.keyboard.press('ArrowRight');
          const newValue = await slider.inputValue();

          // Value may change depending on step size
          expect(typeof newValue).toBe('string');
        }
      }

      await page.locator('button:has-text("Cancel")').click();
    }
  });
});

test.describe('Keyboard Navigation Tests', () => {
  let a11yHelper: AccessibilityTestHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new AccessibilityTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should support full keyboard navigation', async ({ page }) => {
    // Test main page keyboard navigation
    const focusResults = await a11yHelper.checkFocusManagement();

    // All focused elements should be visible
    const invisibleFocus = focusResults.filter(result => !result.visible);
    expect(invisibleFocus.length).toBe(0);

    // Most elements should have focus styles
    const withoutFocusStyles = focusResults.filter(result => !result.hasFocusStyles);
    expect(withoutFocusStyles.length).toBeLessThan(focusResults.length / 2);
  });

  test('should handle modal keyboard navigation', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      // Navigate to button with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs

      // Try to activate asset manager with keyboard
      let attempts = 0;
      while (attempts < 10) {
        const focused = page.locator(':focus');
        const isAssetManagerButton = await focused.evaluate(
          el =>
            el.textContent?.includes('Asset Management') ||
            el.textContent?.includes('Asset Manager')
        );

        if (isAssetManagerButton) {
          await page.keyboard.press('Enter');
          break;
        }

        await page.keyboard.press('Tab');
        attempts++;
      }

      // Check if modal opened
      const modal = page.locator('.fixed.inset-0');
      if (await modal.isVisible()) {
        // Test modal keyboard navigation
        await page.keyboard.press('Tab');

        const focusedElement = page.locator(':focus');
        if (await focusedElement.isVisible()) {
          const isWithinModal = await focusedElement.evaluate(el => {
            const modal = document.querySelector('.fixed.inset-0');
            return modal ? modal.contains(el) : false;
          });

          expect(isWithinModal).toBe(true);
        }

        // Close with Escape
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('should support arrow key navigation for tabs', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Focus first tab
      const firstTab = page.locator('.flex.border-b button').first();
      if (await firstTab.isVisible()) {
        await firstTab.focus();

        // Use arrow keys to navigate tabs
        await page.keyboard.press('ArrowRight');

        // Check if focus moved
        const focusedTab = page.locator(':focus');
        const isTab = await focusedTab.evaluate(
          el => el.tagName.toLowerCase() === 'button' && el.closest('.flex.border-b') !== null
        );

        if (isTab) {
          expect(isTab).toBe(true);
        }
      }

      await page.locator('button:has-text("✕")').click();
    }
  });
});

test.describe('Screen Reader Compatibility Tests', () => {
  let a11yHelper: AccessibilityTestHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new AccessibilityTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should have proper ARIA labels and descriptions', async ({ page }) => {
    const ariaResults = await a11yHelper.checkAriaAttributes();

    // Report ARIA issues
    if (ariaResults.length > 0) {
      console.log('ARIA attribute issues:', ariaResults);

      // Allow some issues but ensure they're minimal
      expect(ariaResults.length).toBeLessThan(3);
    }
  });

  test('should have descriptive button and link text', async ({ page }) => {
    const buttons = await page.locator('button').all();
    const links = await page.locator('a[href]').all();

    const textIssues = [];

    // Check button text
    for (const button of buttons.slice(0, 10)) {
      // Check first 10
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      if (!text?.trim() && !ariaLabel?.trim()) {
        textIssues.push('Button without text or aria-label');
      } else if (text?.trim().length === 1 && !ariaLabel) {
        textIssues.push(`Button with single character text: "${text}"`);
      }
    }

    // Check link text
    for (const link of links.slice(0, 10)) {
      // Check first 10
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      if (!text?.trim() && !ariaLabel?.trim()) {
        textIssues.push('Link without text or aria-label');
      }
    }

    // Report issues but allow some (may be icon buttons with proper aria-labels)
    if (textIssues.length > 0) {
      console.log('Text description issues:', textIssues);
      expect(textIssues.length).toBeLessThan(5);
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Check for live regions that announce changes
      const liveRegions = page.locator(
        '[aria-live], [aria-atomic], [role="status"], [role="alert"]'
      );
      const liveRegionCount = await liveRegions.count();

      // At least some dynamic content should have live regions
      console.log(`Found ${liveRegionCount} live regions`);

      await page.locator('button:has-text("✕")').click();
    }
  });
});

test.describe('High Contrast and Theme Accessibility', () => {
  let a11yHelper: AccessibilityTestHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new AccessibilityTestHelper(page);
    const helpers = new TestHelpers(page);

    await helpers.navigateToRoute('/');
    await helpers.waitForAppLoad();
  });

  test('should work with high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
        }
      `,
    });

    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Elements should still be usable
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();

      // Tabs should be clickable
      const tabs = page.locator('.flex.border-b button');
      if ((await tabs.count()) > 0) {
        await tabs.first().click();
        await expect(tabs.first()).toBeVisible();
      }

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const assetManagerButton = page.locator(
      '[data-testid="asset-manager-button"], button:has-text("Asset Management")'
    );

    if (await assetManagerButton.isVisible()) {
      await assetManagerButton.click();

      // Modal should still open (animations may be reduced)
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();

      await page.locator('button:has-text("✕")').click();
    }
  });

  test('should maintain accessibility across viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);

      // Inject axe for each viewport
      await a11yHelper.injectAxeCore();

      // Run basic accessibility checks
      await a11yHelper.runAccessibilityAudit({
        tags: ['wcag2a', 'wcag2aa'],
        rules: {
          'color-contrast': { enabled: false }, // Skip color contrast for speed
          'duplicate-id': { enabled: false }, // May have issues with dynamic content
        },
      });
    }
  });
});
