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

    this.sidenav = page.locator('magic-side-nav');
    this.createProjectBtn = page.locator(
      'button[aria-label="Create New Project"], button:has-text("Create Project")',
    );
    this.projectAccordion = page.locator('nav-item button:has-text("Projects")');
    this.projectNameInput = page.getByRole('textbox', { name: 'Project Name' });
    this.submitBtn = page.locator('dialog-create-project button[type=submit]:enabled');
    this.workCtxMenu = page.locator('work-context-menu');
    this.workCtxTitle = page.locator('.page-title');
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

    try {
      // Ensure page is stable before starting
      await this.page.waitForLoadState('networkidle');

      // Check for empty state first (single "Create Project" button)
      const emptyStateBtn = this.page
        .locator('nav-item')
        .filter({ hasText: 'Create Project' })
        .locator('button');
      try {
        await emptyStateBtn.waitFor({ state: 'visible', timeout: 1000 });
        await emptyStateBtn.click();
        // Continue to dialog handling below
      } catch {
        // Not in empty state, continue with normal flow
        // Find the Projects group item and wait for it to be visible
        const projectsGroup = this.page
          .locator('nav-list')
          .filter({ hasText: 'Projects' })
          .locator('nav-item button')
          .first();
        await projectsGroup.waitFor({ state: 'visible', timeout: 3000 }); // Reduced from 5s to 3s

        // Hover over the Projects group to show additional buttons
        await projectsGroup.hover();

        // Wait a bit for the hover effect to take place
        await this.page.waitForTimeout(500);

        // Look for the create project button (add icon) in additional buttons
        const createProjectBtn = this.page.locator(
          'nav-list .additional-btns button[mat-icon-button]:has(mat-icon:text("add"))',
        );
        await createProjectBtn.waitFor({ state: 'visible', timeout: 1500 }); // Reduced from 2s to 1.5s
        await createProjectBtn.click();
      }
    } catch (error) {
      // If the specific selectors fail, try a more general approach
      console.warn('Primary project creation approach failed, trying fallback:', error);

      // Fallback: try to find any add button near Projects text
      const addButton = this.page
        .locator('button[mat-icon-button]:has(mat-icon:text("add"))')
        .first();
      await addButton.waitFor({ state: 'visible', timeout: 2000 }); // Reduced from 3s to 2s
      await addButton.click();
    }

    // Wait for the dialog to appear
    await this.projectNameInput.waitFor({ state: 'visible' });
    await this.projectNameInput.fill(prefixedProjectName);
    await this.submitBtn.click();

    // Wait for dialog to close by waiting for input to be hidden
    await this.projectNameInput.waitFor({ state: 'hidden', timeout: 1500 }); // Reduced from 2s to 1.5s
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
    // Ensure the page context is stable before starting
    await this.page.waitForLoadState('networkidle');

    // Wait for the nav to be fully loaded
    await this.sidenav.waitFor({ state: 'visible', timeout: 3000 }); // Reduced from 5s to 3s

    // Handle empty state vs existing projects scenario
    const addProjectBtn = this.page
      .locator('nav-item')
      .filter({ hasText: 'Create Project' })
      .locator('button');
    const projectsGroupBtn = this.page
      .locator('nav-list')
      .filter({ hasText: 'Projects' })
      .locator('nav-item button')
      .first();

    // Check if we're in empty state (no projects yet) or if projects group exists
    try {
      await addProjectBtn.waitFor({ state: 'visible', timeout: 1000 });
      // Empty state: just create project directly since button is already visible
    } catch {
      // Normal state: expand projects group first
      await projectsGroupBtn.waitFor({ state: 'visible', timeout: 5000 });
      const projectsGroupExpanded = await projectsGroupBtn.getAttribute('aria-expanded');
      if (projectsGroupExpanded !== 'true') {
        await projectsGroupBtn.click();
        await this.page.waitForTimeout(500); // Wait for expansion animation
      }
    }

    // Create a new default project
    await this.createProject('Test Project');

    // Navigate to the created project
    const projectName = this.testPrefix
      ? `${this.testPrefix}-Test Project`
      : 'Test Project';

    // After creating a project, ensure Projects group is visible and expanded
    await this.page.waitForTimeout(2000); // Increased wait for DOM updates

    // Find the Projects group button (should exist since we have a project)
    const projectsGroupAfterCreation = this.page
      .locator('nav-list')
      .filter({ hasText: 'Projects' })
      .locator('nav-item button')
      .first();
    await projectsGroupAfterCreation.waitFor({ state: 'visible', timeout: 5000 });

    // Check if projects group is expanded, use similar logic to project.spec.ts
    let isExpanded = await projectsGroupAfterCreation.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      // Multiple approaches to expand the Projects section
      // First: Try clicking the expand icon within the Projects button
      const expandIcon = projectsGroupAfterCreation
        .locator('mat-icon, .expand-icon, [class*="expand"]')
        .first();
      if (await expandIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expandIcon.click();
        await this.page.waitForTimeout(1500);
        isExpanded = await projectsGroupAfterCreation.getAttribute('aria-expanded');
      }

      // If still not expanded, try clicking the main button
      if (isExpanded !== 'true') {
        await projectsGroupAfterCreation.click();
        await this.page.waitForTimeout(1500);
        isExpanded = await projectsGroupAfterCreation.getAttribute('aria-expanded');
      }

      // If still not expanded, try double-clicking as last resort
      if (isExpanded !== 'true') {
        await projectsGroupAfterCreation.dblclick();
        await this.page.waitForTimeout(1500);
      }
    }

    // Wait for the project to appear in the navigation - use improved approach from project.spec.ts
    await this.page.waitForTimeout(1000); // Allow time for project to appear

    let newProject;
    let projectFound = false;

    // Check if .nav-children container exists after expansion
    const navChildren = this.page.locator('.nav-children');
    const navChildrenExists = await navChildren.count();

    if (navChildrenExists > 0) {
      await navChildren.waitFor({ state: 'visible', timeout: 5000 });

      try {
        // Primary approach: nav-child-item structure with nav-item button
        newProject = this.page
          .locator('.nav-children .nav-child-item nav-item button')
          .filter({ hasText: projectName });
        await newProject.waitFor({ state: 'visible', timeout: 3000 });
        projectFound = true;
      } catch {
        try {
          // Second approach: any nav-child-item with the project name
          newProject = this.page
            .locator('.nav-child-item')
            .filter({ hasText: projectName })
            .locator('button');
          await newProject.waitFor({ state: 'visible', timeout: 3000 });
          projectFound = true;
        } catch {
          // Continue to fallback approaches
        }
      }
    }

    // Fallback approaches if structured approach didn't work
    if (!projectFound) {
      try {
        // Fallback: find any button with project name in the nav area
        newProject = this.page
          .locator('magic-side-nav button')
          .filter({ hasText: projectName });
        await newProject.waitFor({ state: 'visible', timeout: 3000 });
        projectFound = true;
      } catch {
        // Ultimate fallback: search entire page for project button
        newProject = this.page.locator('button').filter({ hasText: projectName });
        await newProject.waitFor({ state: 'visible', timeout: 3000 });
        projectFound = true;
      }
    }

    // Verify the project is found and click it
    if (!projectFound) {
      throw new Error(`Project "${projectName}" not found in navigation after creation`);
    }

    await newProject.click();

    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle');

    // Verify we're in the project
    await expect(this.workCtxTitle).toContainText(projectName);
  }

  async addNote(noteContent: string): Promise<void> {
    // Wait for the app to be ready
    const routerWrapper = this.page.locator('.route-wrapper');
    await routerWrapper.waitFor({ state: 'visible', timeout: 6000 }); // Reduced from 10s to 6s

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
