import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TagPage extends BasePage {
  readonly tagTitle: Locator;
  readonly confirmCreateTagBtn: Locator;
  readonly expandTagBtn: Locator;
  readonly tags: Locator;

  constructor(page: Page) {
    super(page);
    this.tagTitle = page
      .locator('.current-work-context-title, work-context-menu .title')
      .first();
    this.confirmCreateTagBtn = page.locator('dialog-confirm button[e2e="confirmBtn"]');
    this.expandTagBtn = page.locator('side-nav .tags .expand-btn');
    this.tags = page.locator('side-nav section.tags');
  }

  async confirmTagCreation() {
    // Try multiple selectors for the confirm button
    const confirmBtn = this.page
      .locator(
        'mat-dialog-container button[mat-button], mat-dialog-container button[mat-raised-button], mat-dialog-container button:has-text("Confirm"), mat-dialog-container button:has-text("Create"), mat-dialog-container button:has-text("OK")',
      )
      .last();

    try {
      await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
      await confirmBtn.click();
    } catch {
      // If no dialog, continue
    }

    // Wait a bit for tag creation
    await this.page.waitForTimeout(500);
  }

  async expandTags() {
    await this.expandTagBtn.click();
    await this.tags.waitFor({ state: 'visible' });
  }

  async getTagByName(name: string): Promise<Locator> {
    return this.page.locator(`side-nav .tags .tag:has-text("${name}")`);
  }
}
