import { test, expect } from '@playwright/test';

test.describe('Page Structure Analysis', () => {
  test('should identify key page elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Log all main structural elements
    const elements = [
      { name: 'task-list', selector: 'task-list' },
      { name: '.task-list', selector: '.task-list' },
      { name: 'add-task-bar', selector: 'add-task-bar' },
      { name: 'add-task-bar input', selector: 'add-task-bar input' },
      { name: 'task', selector: 'task' },
      { name: '.route-wrapper', selector: '.route-wrapper' },
      { name: 'main', selector: 'main' },
      { name: 'work-view', selector: 'work-view' },
      { name: 'button with A', selector: 'button:has-text("A")' },
      { name: 'input[placeholder]', selector: 'input[placeholder]' },
    ];

    for (const { name, selector } of elements) {
      const count = await page.locator(selector).count();
      const isVisible =
        count > 0 ? await page.locator(selector).first().isVisible() : false;
      console.log(`${name}: count=${count}, visible=${isVisible}`);
    }

    // Log all input placeholders
    const inputs = await page.locator('input[placeholder]').all();
    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder');
      console.log(`Input placeholder: "${placeholder}"`);
    }

    // Log all visible buttons
    const buttons = await page.locator('button:visible').all();
    console.log(`\nVisible buttons: ${buttons.length}`);
    for (let i = 0; i < Math.min(5, buttons.length); i++) {
      const text = await buttons[i].textContent();
      console.log(`Button ${i}: "${text?.trim()}"`);
    }

    // Check main content area
    const mainContent = await page.locator('[role="main"], main, .main-content').first();
    console.log('\nMain content found:', (await mainContent.count()) > 0);
  });
});
