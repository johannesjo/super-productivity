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

    // Wait for the create button to appear after hovering
    const createProjectBtn = this.page.locator('.e2e-add-project-btn');
    await createProjectBtn.waitFor({ state: 'visible', timeout: 1000 });
    await createProjectBtn.click();

    // Wait for the dialog to appear
    await this.projectNameInput.waitFor({ state: 'visible' });
    await this.projectNameInput.fill(prefixedProjectName);
    await this.submitBtn.click();

    // Wait for dialog to close by waiting for input to be hidden
    await this.projectNameInput.waitFor({ state: 'hidden', timeout: 2000 });
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
        // Wait for the section to expand
        await this.moveToArchiveBtn.waitFor({ state: 'visible', timeout: 1000 });
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
    // Wait for the app to be ready
    const routerWrapper = this.page.locator('.route-wrapper');
    await routerWrapper.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for the page to be fully loaded
    await this.page.waitForLoadState('networkidle');
    // Wait for project view to be ready
    await this.page.locator('.page-project').waitFor({ state: 'visible' });
    await this.page.waitForTimeout(100);

    // First ensure notes section is visible by clicking toggle if needed
    const toggleNotesBtn = this.page.locator('.e2e-toggle-notes-btn');
    const isToggleBtnVisible = await toggleNotesBtn
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (isToggleBtnVisible) {
      await toggleNotesBtn.click();
      // Wait for notes section to appear after toggle
      await this.page.locator('notes').waitFor({ state: 'visible', timeout: 5000 });
    }

    // Try multiple approaches to open the note dialog
    let dialogOpened = false;

    // Approach 1: Try to click the add note button
    const addNoteBtn = this.page.locator('#add-note-btn');
    const isAddBtnVisible = await addNoteBtn
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (isAddBtnVisible) {
      await addNoteBtn.click();
      dialogOpened = true;
    }

    // Approach 2: If button not visible, try keyboard shortcut
    if (!dialogOpened) {
      // Focus on the main content area first
      await this.page.locator('body').click();
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('n');
    }

    // Wait for dialog to appear with better error handling
    await this.page.locator('dialog-fullscreen-markdown, mat-dialog-container').waitFor({
      state: 'visible',
      timeout: 5000,
    });

    // Try different selectors for the textarea
    let noteTextarea = this.page.locator('dialog-fullscreen-markdown textarea').first();
    let textareaVisible = await noteTextarea
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!textareaVisible) {
      // Try alternative selector
      noteTextarea = this.page.locator('textarea').first();
      textareaVisible = await noteTextarea
        .isVisible({ timeout: 2000 })
        .catch(() => false);
    }

    if (!textareaVisible) {
      throw new Error('Note dialog textarea not found after trying multiple approaches');
    }

    await noteTextarea.fill(noteContent);

    // Click the save button - try multiple selectors
    let saveBtn = this.page.locator('#T-save-note');
    let saveBtnVisible = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (!saveBtnVisible) {
      // Try button with save icon
      saveBtn = this.page.locator('button:has(mat-icon:has-text("save"))');
      saveBtnVisible = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (saveBtnVisible) {
      await saveBtn.click();
    } else {
      // Fallback: press Enter to save
      await noteTextarea.press('Control+Enter');
    }

    // Wait for dialog to close
    await this.page.locator('dialog-fullscreen-markdown, mat-dialog-container').waitFor({
      state: 'hidden',
      timeout: 5000,
    });

    // After saving, check if notes panel is visible
    // If not, toggle it
    const notesWrapper = this.page.locator('notes');
    const isNotesVisible = await notesWrapper
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    if (!isNotesVisible) {
      // Toggle the notes panel
      const toggleBtn = this.page.locator('.e2e-toggle-notes-btn');
      await toggleBtn.waitFor({ state: 'visible' });
      await toggleBtn.click();
      await notesWrapper.waitFor({ state: 'visible', timeout: 5000 });
    }

    // Hover over the notes area like in Nightwatch
    await notesWrapper.hover({ position: { x: 10, y: 50 } });
  }
}
