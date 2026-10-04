import { test, expect } from '@playwright/test';
import {
  SMOKE_USER,
  SMOKE_MASTER_PROFILE,
  SMOKE_TAILOR_RESPONSE,
} from './fixtures';

const EDITED_SUMMARY = 'Edited by the Playwright smoke test.';

// Full tailor → edit → print flow with the backend stubbed at the network
// layer. Covers: tailor form submit, tailored canvas render + A4 pagination,
// inline summary edit reflected on the canvas, and the print entry point.
test.describe('tailor → edit → print smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Seed auth (authStore reads these synchronously on boot) and stub
    // window.print before any app code runs.
    await page.addInitScript(
      ({ user }) => {
        window.localStorage.setItem('access_token', 'smoke-access-token');
        window.localStorage.setItem('refresh_token', 'smoke-refresh-token');
        window.localStorage.setItem('user_data', JSON.stringify(user));
        (window as unknown as Record<string, unknown>).__printCalled = false;
        window.print = () => {
          (window as unknown as Record<string, unknown>).__printCalled = true;
        };
      },
      { user: SMOKE_USER },
    );

    await page.route('**/api/v1/master-profile/full', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SMOKE_MASTER_PROFILE) }),
    );
    // Autosave/version endpoints are not exercised; keep them quiet.
    await page.route('**/api/v1/resume/versions**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'smoke-version-1' } }) }),
    );
  });

  test('tailors, edits inline, and prints', async ({ page }) => {
    let tailorRequestBody: Record<string, unknown> | null = null;
    await page.route('**/api/v1/resume/tailor', async (route) => {
      tailorRequestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SMOKE_TAILOR_RESPONSE),
      });
    });

    await page.goto('/editor');
    await expect(page.getByRole('heading', { name: 'Job Listing Details' })).toBeVisible();

    // --- Tailor ---
    await page.locator('#editorRole').fill('Smoke Engineer');
    await page.locator('#editorDesc').fill('Build smoke-tested web applications with Python and React.');
    await page.getByRole('button', { name: 'Analyze & Tailor' }).click();

    // Tailor request carries the pasted job description…
    await expect
      .poll(() => tailorRequestBody?.['job_description'], { timeout: 15_000 })
      .toContain('smoke-tested');

    // …and the tailored canvas renders the AI snapshot.
    const firstPage = page.locator('div[style*="297mm"]').first();
    await expect(firstPage).toBeVisible();
    await expect(firstPage.getByText('Smoke Tester').first()).toBeVisible();
    await expect(firstPage.getByText('Smoke tailored summary for Playwright.').first()).toBeVisible();

    // --- Edit inline on the canvas ---
    const summaryBox = firstPage.getByPlaceholder(
      'A brief summary of your professional background, strengths, and career focus...',
    );
    await expect(summaryBox).toBeVisible();
    await summaryBox.fill(EDITED_SUMMARY);
    await expect(summaryBox).toHaveValue(EDITED_SUMMARY);
    await expect(firstPage.getByText(EDITED_SUMMARY).first()).toBeVisible();

    // --- Print ---
    await page.getByRole('button', { name: 'Download' }).click();
    await page.getByRole('button', { name: 'Print / PDF' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).__printCalled))
      .toBe(true);
  });
});
