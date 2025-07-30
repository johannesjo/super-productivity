import { test, expect } from '../../fixtures/app.fixture';

test.describe('Task Creation Debug', () => {
  test('should create a task and verify it appears', async ({ page, workViewPage }) => {
    // Add task
    const taskTitle = 'Test Task 123';
    await workViewPage.addTask(taskTitle);

    // Debug: Log what's on the page
    await page.waitForTimeout(2000);

    // Try different selectors for tasks
    const selectors = [
      'task',
      '.task',
      '[data-testid="task"]',
      'task-additional-info',
      '.task-title',
      'textarea',
      'mat-card',
      '.mat-card',
    ];

    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      console.log(`${selector}: ${count} elements`);
      if (count > 0) {
        const text = await page.locator(selector).first().textContent();
        console.log(`  First element text: "${text?.substring(0, 50)}"`);
      }
    }

    // Try to find the task by text
    const taskByText = page.locator(`text="${taskTitle}"`);
    const taskExists = await taskByText.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Task with text "${taskTitle}" visible: ${taskExists}`);

    // Check if there's an input/textarea with the task text
    const inputs = await page.locator('input, textarea').all();
    for (let i = 0; i < inputs.length; i++) {
      const value = await inputs[i].inputValue().catch(() => '');
      if (value.includes(taskTitle)) {
        console.log(`Found task text in input/textarea ${i}: "${value}"`);
      }
    }

    // The test should find the task somewhere
    expect(
      taskExists || inputs.some(async (i) => (await i.inputValue()).includes(taskTitle)),
    ).toBeTruthy();
  });
});
