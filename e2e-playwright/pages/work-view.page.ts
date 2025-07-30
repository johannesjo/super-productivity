import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class WorkViewPage extends BasePage {
  readonly addTaskGlobalInput: Locator;
  readonly addBtn: Locator;
  readonly taskList: Locator;
  readonly backdrop: Locator;
  readonly routerWrapper: Locator;

  constructor(page: Page) {
    super(page);
    this.addTaskGlobalInput = page.locator('add-task-bar.global input');
    this.addBtn = page.locator('.switch-add-to-btn');
    this.taskList = page
      .locator('task-list, .task-list, [data-testid="task-list"]')
      .first();
    this.backdrop = page.locator('.backdrop');
    this.routerWrapper = page.locator('.route-wrapper, main, [role="main"]').first();
  }

  async addTask(taskName: string, skipClose = false): Promise<void> {
    // Try multiple selectors for the add task input
    const addTaskSelectors = [
      'add-task-bar input',
      'mat-form-field input',
      'input[placeholder*="Add"]',
      'input[aria-label*="Add"]',
      '.add-task-bar input',
    ];

    let addTaskInput: Locator | null = null;

    // Try to find a visible input
    for (const selector of addTaskSelectors) {
      const input = this.page.locator(selector).first();
      if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
        addTaskInput = input;
        break;
      }
    }

    // If no input visible, press 'A' to open add task
    if (!addTaskInput) {
      await this.page.keyboard.press('Shift+A');
      await this.page.waitForTimeout(500);

      // Try to find input again
      for (const selector of addTaskSelectors) {
        const input = this.page.locator(selector).first();
        if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
          addTaskInput = input;
          break;
        }
      }
    }

    if (!addTaskInput) {
      throw new Error('Could not find add task input');
    }

    // Fill the task name
    await addTaskInput.fill(taskName);

    // Press Enter to add the task
    await addTaskInput.press('Enter');

    // Wait a bit for task to be added
    await this.page.waitForTimeout(1000);

    if (!skipClose) {
      // Check if backdrop exists and click it
      if (await this.backdrop.isVisible({ timeout: 1000 })) {
        await this.backdrop.click();
      }
    }
  }

  async draftTask(taskName: string): Promise<void> {
    // Press keyboard shortcut to open add task
    await this.page.keyboard.press('A');

    // Wait for add task input to be visible
    const addTaskSelectors = [
      'add-task-bar.global input',
      '.add-task-bar.global input',
      'add-task-bar input',
      'input[placeholder*="Add"]',
    ];

    let taskInput = null;
    for (const selector of addTaskSelectors) {
      try {
        taskInput = this.page.locator(selector).first();
        await taskInput.waitFor({ state: 'visible', timeout: 2000 });
        break;
      } catch {
        continue;
      }
    }

    if (!taskInput) {
      throw new Error('Could not find add task input');
    }

    // Type the text without pressing enter
    await taskInput.click();
    await taskInput.type(taskName);
  }

  async waitForTaskList(): Promise<void> {
    // Wait for the page to be ready by checking multiple indicators
    try {
      await this.page.waitForSelector('work-view, .work-view, main', {
        state: 'visible',
        timeout: 10000,
      });
    } catch {
      // Continue even if selector not found
    }

    // Give the app a moment to stabilize
    await this.page.waitForTimeout(1000);
  }

  async getTaskByTitle(title: string): Promise<Locator> {
    return this.page.locator(`task-additional-info:has-text("${title}")`);
  }
}
