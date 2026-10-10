import { test, expect } from '@playwright/test';

const adminRoutes = [
  '/dashboard',
  '/transactions',
  '/alerts',
  '/flow',
  '/recovery',
  '/reports',
  '/settings'
];

test('Capture screenshots after login', async ({ page }) => {
  test.setTimeout(120000);
  
  // Go to login page
  await page.goto('http://localhost:5173/login');
  
  // Click the Admin demo login button
  await page.click('button:has-text("Admin (Lead Investigator)")');
  await page.click('button[type="submit"]');

  // Wait for login to complete (e.g. navigation to dashboard)
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => console.log('Timeout waiting for dashboard'));
  await page.waitForTimeout(3000);

  for (const route of adminRoutes) {
    await page.goto(`http://localhost:5173${route}`);
    // Wait for animations/data
    await page.waitForTimeout(3000);
    const filename = `auth_${route.replace(/\//g, '_').replace(/^_/, '')}`;
    await page.screenshot({ path: `screenshots/${filename}.png`, fullPage: true });
    console.log(`Screenshot saved for ${route}`);
  }
});
