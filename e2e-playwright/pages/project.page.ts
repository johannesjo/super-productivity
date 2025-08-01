import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class ProjectPage extends BasePage {
  readonly sidenav: Locator;
  readonly createProjectBtn: Locator;
  readonly projectAccordion: Locator;
  readonly projectNameInput: Locator;
  readonly submitBtn: Locator;
  readonly workCtxMenu: Locator;
  readonly workCtxTitle: Locator;
  readonly projectSettingsBtn: Locator;
  readonly moveToArchiveBtn: Locator;
  readonly globalErrorAlert: Locator;

  constructor(page: Page, testPrefix: string = '') {
    super(page, testPrefix);

    this.sidenav = page.locator('side-nav');
    this.createProjectBtn = page.locator(
      'button[aria-label="Create New Project"], button:has-text("Create Project")',
    );
    this.projectAccordion = page.locator('[role="menuitem"]:has-text("Projects")');
    this.projectNameInput = page.getByRole('textbox', { name: 'Project Name' });
    this.submitBtn = page.locator('dialog-create-project button[type=submit]:enabled');
    this.workCtxMenu = page.locator('work-context-menu');
    this.workCtxTitle = page.locator('.current-work-context-title');
    this.projectSettingsBtn = this.workCtxMenu
      .locator('button[aria-label="Project Settings"]')
      .or(this.workCtxMenu.locator('button').nth(3));
    this.moveToArchiveBtn = page.locator('.e2e-move-done-to-archive');
    this.globalErrorAlert = page.locator('.global-error-alert');
  }

  async createProject(projectName: string): Promise<void> {
    // Add test prefix to project name
    const prefixedProjectName = this.testPrefix
      ? `${this.testPrefix}-${projectName}`
      : projectName;

    // Hover over the Projects menu item to show the button
    const projectsMenuItem = this.page.locator('.e2e-projects-btn');
    await projectsMenuItem.hover();
    await this.page.waitForTimeout(200);

    // Force click the button even if not visible
    const createProjectBtn = this.page.locator('.e2e-add-project-btn');
    await createProjectBtn.click({ force: true });

    // Wait for the dialog to appear
    await this.projectNameInput.waitFor({ state: 'visible' });
    await this.projectNameInput.fill(prefixedProjectName);
    await this.submitBtn.click();

    // Wait for dialog to close
    await this.page.waitForTimeout(500);
  }

  async getProject(index: number): Promise<Locator> {
    // Projects are in a menuitem structure, not side-nav-item
    // Get all project menuitems that follow the Projects header
    const projectMenuItems = this.page.locator(
      '[role="menuitem"]:has-text("Projects") ~ [role="menuitem"]',
    );
    return projectMenuItems.nth(index - 1);
  }

  async navigateToProject(projectLocator: Locator): Promise<void> {
    const projectBtn = projectLocator.locator('button').first();
    await projectBtn.waitFor({ state: 'visible' });
    await projectBtn.click();
  }

  async openProjectMenu(projectLocator: Locator): Promise<void> {
    const projectBtn = projectLocator.locator('.mat-mdc-menu-item');
    const advBtn = projectLocator.locator('.additional-btn');

    await projectBtn.hover();
    await advBtn.waitFor({ state: 'visible' });
    await advBtn.click();
    await this.workCtxMenu.waitFor({ state: 'visible' });
  }

  async navigateToProjectSettings(): Promise<void> {
    await this.projectSettingsBtn.waitFor({ state: 'visible' });
    await this.projectSettingsBtn.click();
  }

  async archiveDoneTasks(): Promise<void> {
    // Check if the collapsible needs to be expanded
    const moveToArchiveBtnVisible = await this.moveToArchiveBtn.isVisible();
    if (!moveToArchiveBtnVisible) {
      const collapsibleHeader = this.page.locator('.collapsible-header');
      if ((await collapsibleHeader.count()) > 0) {
        await collapsibleHeader.click();
        await this.page.waitForTimeout(100);
      }
    }

    await this.moveToArchiveBtn.waitFor({ state: 'visible' });
    await this.moveToArchiveBtn.click();
  }

  async createAndGoToTestProject(): Promise<void> {
    // First click on Projects menu item to expand it
    await this.projectAccordion.click();

    // Create a new default project
    await this.createProject('Test Project');

    // Navigate to the created project
    const projectName = this.testPrefix
      ? `${this.testPrefix}-Test Project`
      : 'Test Project';
    const newProject = this.page.locator(`[role="menuitem"]:has-text("${projectName}")`);
    await newProject.waitFor({ state: 'visible' });
    await newProject.click();

    // Verify we're in the project
    await expect(this.workCtxTitle).toContainText(projectName);
  }

  async addNote(noteContent: string): Promise<void> {
    // First toggle the notes panel to make it visible
    const toggleNotesBtn = this.page.locator('.e2e-toggle-notes-btn');
    await toggleNotesBtn.click();

    // Wait for the notes section to be visible
    const notesSection = this.page.locator('notes');
    await notesSection.waitFor({ state: 'visible' });

    // Click on the add note button (force click to avoid tooltip interference)
    const addNoteBtn = this.page.locator('#add-note-btn');
    await addNoteBtn.click({ force: true });

    // Wait for the dialog to appear in the CDK overlay (full-screen dialog)
    const dialogContainer = this.page.locator('mat-dialog-container');
    await dialogContainer.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for the textarea to appear and type the note content
    const noteTextarea = this.page.locator('mat-dialog-container textarea');
    await noteTextarea.waitFor({ state: 'visible' });
    await noteTextarea.fill(noteContent);

    // Click the save button
    const saveBtn = this.page.locator('mat-dialog-container #T-save-note');
    await saveBtn.click();

    // Wait for the dialog to close
    await dialogContainer.waitFor({ state: 'hidden', timeout: 5000 });
  }
}
