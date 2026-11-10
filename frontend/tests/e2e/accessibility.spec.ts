import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { getWhalepathPageHtml } from '../../src/pageTemplate';

test.describe('Accessibility Audits (@axe-core/playwright)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(getWhalepathPageHtml(), { waitUntil: 'domcontentloaded' });
  });

  test('should pass automated WCAG 2.1 AA accessibility guidelines with 0 violations', async ({
    page,
  }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ensures form controls and interactive buttons have accessible names and zero violations', async ({
    page,
  }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('#order-form')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

