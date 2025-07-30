import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ProjectPage extends BasePage {
  readonly sidenav: Locator;
  readonly createProjectBtn: Locator;
  readonly projectAccordion: Locator;
  readonly projectNameInput: Locator;
  readonly submitBtn: Locator;
  readonly projectSection: Locator;
  readonly workContextMenu: Locator;
  readonly workContextTitle: Locator;
  readonly moveToArchiveBtn: Locator;
  readonly globalErrorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.sidenav = page.locator('side-nav');
    this.createProjectBtn = page.locator(
      'side-nav section.projects .g-multi-btn-wrapper > button:last-of-type',
    );
    this.projectAccordion = page.locator('.projects button');
    this.projectNameInput = page.locator('dialog-create-project input:first-of-type');
    this.submitBtn = page.locator('dialog-create-project button[type=submit]:enabled');
    this.projectSection = page.locator('side-nav section.projects');
    this.workContextMenu = page.locator('work-context-menu');
    this.workContextTitle = page.locator('.current-work-context-title');
    this.moveToArchiveBtn = page.locator('.e2e-move-done-to-archive');
    this.globalErrorAlert = page.locator('.global-error-alert');
  }

  async createProject(projectName: string) {
    // Hover over project section to reveal create button
    await this.projectAccordion.hover();
    await this.createProjectBtn.waitFor({ state: 'visible' });
    await this.createProjectBtn.click();

    // Fill project name and submit
    await this.projectNameInput.waitFor({ state: 'visible' });
    await this.projectNameInput.fill(projectName);
    await this.submitBtn.click();

    // Wait for dialog to close
    await this.projectNameInput.waitFor({ state: 'hidden' });
  }

  async navigateToProject(projectName: string) {
    const projectItem = this.projectSection.locator(
      `side-nav-item:has-text("${projectName}")`,
    );
    await projectItem.waitFor({ state: 'visible' });
    await projectItem.locator('button:first-of-type').click();
  }

  async getProjectByIndex(index: number): Promise<Locator> {
    return this.projectSection.locator(`side-nav-item`).nth(index);
  }

  async openProjectSettings(projectIndex: number = 0) {
    const project = await this.getProjectByIndex(projectIndex);
    const projectBtn = project.locator('.mat-mdc-menu-item');
    const advBtn = project.locator('.additional-btn');

    await projectBtn.hover();
    await advBtn.waitFor({ state: 'visible' });
    await advBtn.click();

    // Click project settings in context menu
    await this.workContextMenu.waitFor({ state: 'visible' });
    const settingsBtn = this.workContextMenu.locator('button:nth-of-type(4)');
    await settingsBtn.click();
  }

  async moveTasksToArchive() {
    // Check if button is visible, if not, expand the collapsible
    const isVisible = await this.moveToArchiveBtn.isVisible({ timeout: 1000 });
    if (!isVisible) {
      // Try to expand collapsible
      const collapsibleHeader = this.page.locator('.collapsible-header');
      if ((await collapsibleHeader.count()) > 0) {
        await collapsibleHeader.click();
        await this.page.waitForTimeout(200);
      }
    }

    await this.moveToArchiveBtn.waitFor({ state: 'visible' });
    await this.moveToArchiveBtn.click();
  }
}
