import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class PluginSettingsPage extends BasePage {
  readonly settingsBtn: Locator;
  readonly pluginSection: Locator;
  readonly pluginManagement: Locator;
  readonly pluginMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.settingsBtn = page.locator('side-nav .tour-settingsMenuBtn');
    this.pluginSection = page.locator('.plugin-section');
    this.pluginManagement = page.locator('plugin-management');
    this.pluginMenu = page.locator('side-nav plugin-menu');
  }

  async navigateToPluginSettings() {
    // Click settings button
    await this.settingsBtn.click();
    await this.page.waitForTimeout(1000);

    // Scroll to plugin section
    await this.pluginSection.scrollIntoViewIfNeeded();

    // Expand collapsible if needed
    const collapsible = this.page.locator('.plugin-section collapsible');
    const isExpanded = await collapsible.evaluate((el) =>
      el.classList.contains('isExpanded'),
    );

    if (!isExpanded) {
      const header = collapsible.locator('.collapsible-header');
      await header.click();
      await this.page.waitForTimeout(500);
    }

    // Wait for plugin management to be visible
    await this.pluginManagement.waitFor({ state: 'visible', timeout: 5000 });
  }

  async getPluginCards() {
    const cards = this.pluginManagement.locator('mat-card');
    const pluginCards = [];

    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const hasToggle = (await card.locator('mat-slide-toggle').count()) > 0;
      if (hasToggle) {
        const title = await card.locator('mat-card-title').textContent();
        pluginCards.push({ card, title: title?.trim() || '' });
      }
    }

    return pluginCards;
  }

  async enablePlugin(pluginName: string): Promise<boolean> {
    const pluginCards = await this.getPluginCards();

    for (const { card, title } of pluginCards) {
      if (title.includes(pluginName)) {
        const toggle = card.locator('mat-slide-toggle button[role="switch"]');
        const isChecked = (await toggle.getAttribute('aria-checked')) === 'true';

        if (!isChecked) {
          await toggle.click();
          return true;
        }
        return false; // Already enabled
      }
    }

    return false; // Plugin not found
  }

  async getPluginMenuButtons() {
    const buttons = this.pluginMenu.locator('button');
    const buttonTexts = await buttons.allTextContents();
    return buttonTexts.map((text) => text.trim());
  }
}
