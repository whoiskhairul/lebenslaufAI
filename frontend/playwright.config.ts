import { defineConfig, devices } from '@playwright/test';

// Smoke coverage for the tailor → edit → print flow (frontend only, backend stubbed).
//
// - Local: uses the installed Google Chrome so no browser download is needed:
//     npx playwright test
// - CI / machines without Chrome: install the bundled browser once, then run
//   without the channel override:
//     npx playwright install --with-deps chromium
//     PW_CHANNEL= npx playwright test
const channel = process.env.PW_CHANNEL ?? 'chrome';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    ...(channel ? { channel: channel as 'chrome' } : {}),
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'smoke', use: { ...devices['Desktop Chrome'] } }],
});
