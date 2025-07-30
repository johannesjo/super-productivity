import { Page, Locator } from '@playwright/test';

export class AutocompleteComponent {
  private page: Page;
  readonly dropdown: Locator;
  readonly items: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dropdown = page.locator('.mat-autocomplete-panel');
    this.items = page.locator('.mat-autocomplete-panel mat-option');
  }

  async waitForDropdown() {
    await this.dropdown.waitFor({ state: 'visible' });
  }

  async selectOption(text: string) {
    const option = this.page.locator(
      `.mat-autocomplete-panel mat-option:has-text("${text}")`,
    );
    await option.click();
  }

  async getOptionCount(): Promise<number> {
    await this.waitForDropdown();
    return await this.items.count();
  }

  async getOptionTexts(): Promise<string[]> {
    await this.waitForDropdown();
    return await this.items.allTextContents();
  }
}
