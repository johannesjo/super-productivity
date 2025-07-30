import { Page, Locator } from '@playwright/test';
import { WorkViewPage } from '../pages/work-view.page';
import { TagPage } from '../pages/tag.page';
import { WelcomeDialogComponent } from '../components/welcome-dialog.component';

export class AppHelpers {
  static async loadAppAndDismissWelcome(page: Page): Promise<void> {
    await page.goto('/');
    const welcomeDialog = new WelcomeDialogComponent(page);
    await welcomeDialog.dismissIfPresent();
  }

  static async addTaskWithTag(
    page: Page,
    taskName: string,
    tagName: string,
  ): Promise<void> {
    const workView = new WorkViewPage(page);
    const tagPage = new TagPage(page);

    await workView.addTask(`${taskName} #${tagName}`, true);
    await tagPage.confirmTagCreation();
  }

  static async createDefaultProject(page: Page): Promise<void> {
    // Wait for side nav to be ready
    await page.waitForTimeout(1000);

    // Navigate to projects - try multiple selectors
    const projectNavSelectors = [
      'side-nav [routerLink="/project-overview"]',
      '[routerLink="/project-overview"]',
      'a[href*="project-overview"]',
      'mat-list-item:has-text("Projects")',
      'button:has-text("Projects")',
    ];

    let clicked = false;
    for (const selector of projectNavSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          clicked = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!clicked) {
      throw new Error('Could not find project navigation button');
    }

    // Wait for navigation
    await page.waitForTimeout(1000);

    // Create new project - try multiple selectors
    const createBtnSelectors = [
      'button:has-text("Create Project")',
      'button:has-text("Create")',
      '.mat-fab',
      'button[aria-label*="create" i]',
    ];

    for (const selector of createBtnSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          break;
        }
      } catch {
        continue;
      }
    }

    // Fill project name
    const titleInput = page
      .locator(
        'input[formControlName="title"], input[placeholder*="name" i], input[placeholder*="title" i]',
      )
      .first();
    await titleInput.waitFor({ state: 'visible' });
    await titleInput.fill('Default Test Project');

    // Submit - try multiple selectors
    const submitBtn = page
      .locator(
        'button[type="submit"], mat-dialog-actions button:last-child, button:has-text("Create"):not(:disabled)',
      )
      .first();
    await submitBtn.click();

    // Wait for navigation or dialog to close
    await page.waitForTimeout(2000);
  }

  static async addNote(page: Page, noteText: string): Promise<void> {
    // Press 'N' to open add note
    await page.keyboard.press('N');

    const noteInput = page.locator('textarea[formControlName="text"]');
    await noteInput.waitFor({ state: 'visible' });
    await noteInput.fill(noteText);

    // Submit
    await page.keyboard.press('Control+Enter');
    await noteInput.waitFor({ state: 'hidden' });
  }

  static async addTaskWithReminder(
    page: Page,
    taskName: string,
    reminderTime: string,
  ): Promise<void> {
    const workView = new WorkViewPage(page);

    // Add task
    await workView.addTask(taskName, true);

    // Open task detail
    const task = await workView.getTaskByTitle(taskName);
    await task.click();

    // Add reminder
    await page.click('button:has-text("Add Reminder")');
    await page.fill('input[type="time"]', reminderTime);
    await page.click('button:has-text("Save")');
  }

  static async openPanelForTask(page: Page, taskTitle: string): Promise<void> {
    const task = page.locator(`task-additional-info:has-text("${taskTitle}")`);
    await task.click();
    await page.waitForSelector('task-detail-panel', { state: 'visible' });
  }

  static async openTaskDetailPanel(page: Page, task: Locator): Promise<void> {
    // First, ensure any dialogs are closed
    try {
      const welcomeDialog = page.locator(
        'mat-dialog-container:has-text("Welcome to Super Productivity")',
      );
      if (await welcomeDialog.isVisible({ timeout: 500 })) {
        const closeBtn = welcomeDialog.locator(
          'button:has-text("No thanks"), button:has-text("Close Tour")',
        );
        await closeBtn.click();
        await welcomeDialog.waitFor({ state: 'hidden' });
      }
    } catch {
      // No welcome dialog
    }

    // Wait a bit for UI to stabilize
    await page.waitForTimeout(500);

    // Hover on task to show controls
    await task.hover();
    await page.waitForTimeout(300);

    // Try to find and click the info button first
    const infoBtn = task
      .locator(
        'button[title*="info" i], button[aria-label*="info" i], .task-hover-controls button',
      )
      .first();

    if (await infoBtn.isVisible({ timeout: 1000 })) {
      await infoBtn.click();
    } else {
      // Fallback: click on the task content area
      const taskContent = task.locator('.task-text, textarea').first();
      await taskContent.click();
    }

    // Wait for task detail panel to appear
    await page.waitForSelector(
      'task-detail-panel, .task-detail-panel, task-additional-info-wrapper, [class*="additional-info"]',
      {
        state: 'visible',
        timeout: 5000,
      },
    );
  }

  static async sendKeysToActiveElement(page: Page, keys: string): Promise<void> {
    await page.keyboard.type(keys);
  }

  static async checkNoErrors(page: Page): Promise<boolean> {
    // Check for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Check for Angular errors
    const hasAngularErrors = await page.evaluate(() => {
      const errorElement = document.querySelector('.error-handler');
      return errorElement !== null;
    });

    return errors.length === 0 && !hasAngularErrors;
  }
}
