import { test, expect } from '@playwright/test';
import { getWhalepathPageHtml } from '../../src/pageTemplate';

test.describe('Responsive Cross-Device Layout & Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(getWhalepathPageHtml(), { waitUntil: 'domcontentloaded' });
  });

  test('ensures no horizontal overflow exists across viewport dimensions', async ({ page }) => {
    const hasHorizontalScroll = await page.evaluate(() => {
      const { scrollWidth, clientWidth } = document.documentElement;
      return scrollWidth > clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('verifies all key components and controls are visible', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Paper Trading Panel (Preview)');
    await expect(page.getByTestId('wallet-balance')).toBeVisible();
    await expect(page.locator('#token-select')).toBeVisible();
    await expect(page.locator('#amount-input')).toBeVisible();
    await expect(page.getByTestId('submit-order-button')).toBeVisible();
  });

  test('ensures all interactive buttons meet minimum 44px touch target guidelines', async ({
    page,
  }) => {
    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    for (const button of buttons) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('supports end-to-end keyboard navigation through interactive elements', async ({
    page,
  }) => {
    await page.locator('#token-select').focus();
    await expect(page.locator('#token-select')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#btn-buy')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#btn-sell')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#amount-input')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#btn-submit')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#status-message')).toBeVisible();
  });
});

