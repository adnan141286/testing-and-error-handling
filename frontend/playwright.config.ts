import { defineConfig } from '@playwright/test';
import os from 'os';
import path from 'path';

/**
 * Playwright test configuration for Whalepath multi-device and accessibility verification.
 * Enforces 4 standard responsive viewports: 375x667, 768x1024, 1366x768, 1920x1080.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: path.join(os.tmpdir(), 'whalepath-playwright-results'),
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'off',
  },
  projects: [
    {
      name: 'Mobile (375x667)',
      use: {
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'Tablet (768x1024)',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'Desktop HD (1366x768)',
      use: {
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'Desktop FHD (1920x1080)',
      use: {
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});

