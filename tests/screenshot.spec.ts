import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/login',
  '/dashboard',
  '/transactions',
  '/alerts'
];

test('Capture screenshots of all major routes', async ({ page }) => {
  test.setTimeout(120000);
  for (const route of routes) {
    await page.goto(`http://localhost:5173${route}`);
    // Wait a bit for animations/data to load
    await page.waitForTimeout(2000);
    const filename = route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
    await page.screenshot({ path: `screenshots/${filename}.png`, fullPage: true });
    console.log(`Screenshot saved for ${route}`);
  }
});
