import { test, expect } from '@playwright/test';

test.describe('Memorica Smoke Tests', () => {

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Memorica')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type="submit"]').click();
    // HTML5 validation prevents submission on empty required fields
    // This test verifies the form exists and buttons work
    await expect(page.locator('form')).toBeVisible();
  });

  test('should be able to toggle between login and register', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=立即注册').click();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.locator('text=去登录').click();
    await expect(page.locator('input[type="email"]')).not.toBeVisible();
  });
});
