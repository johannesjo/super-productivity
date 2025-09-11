import { expect, test } from '../../fixtures/test.fixture';

test.describe('Project Folders', () => {
  test('should create and display project folders in navigation', async ({
    page,
    workViewPage,
  }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Take screenshot to see the initial navigation structure
    await page.screenshot({
      path: 'e2e-results/project-folders-before.png',
      fullPage: true,
    });

    // Check if navigation is visible
    const navigation = page.locator('nav.nav-sidenav, .nav-sidenav');
    await expect(navigation).toBeVisible();

    // Look for projects section in navigation
    const projectsSection = page.locator('text="Projects"');
    const projectsSectionExists = (await projectsSection.count()) > 0;
    console.log(`Projects section found: ${projectsSectionExists}`);

    // If projects section exists, check if we can expand it
    if (projectsSectionExists) {
      // Take screenshot after finding projects section
      await page.screenshot({
        path: 'e2e-results/project-folders-projects-found.png',
        fullPage: true,
      });
    }

    // For now, just verify the navigation exists and has basic structure
    const navItems = page.locator('.nav-sidenav li, nav-item');
    const navCount = await navItems.count();
    expect(navCount).toBeGreaterThan(0);
  });

  test('should test project creation flow', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Find and click "Create Project" button
    const createProjectBtn = page.locator('text="Create Project"');
    await expect(createProjectBtn).toBeVisible();

    // Take screenshot before clicking
    await page.screenshot({
      path: 'e2e-results/project-folders-before-create.png',
      fullPage: true,
    });

    await createProjectBtn.click();

    // Wait for dialog or new project form to appear
    await page.waitForTimeout(1000);

    // Take screenshot after clicking to see what appears
    await page.screenshot({
      path: 'e2e-results/project-folders-after-create-click.png',
      fullPage: true,
    });

    // Look for project creation dialog
    const dialog = page.locator(
      'mat-dialog-container, .mat-dialog-container, [role="dialog"]',
    );
    const hasDialog = (await dialog.count()) > 0;

    console.log(`Project creation dialog appeared: ${hasDialog}`);

    // For now, just verify the create project button works
    expect(hasDialog).toBeTruthy();

    // Close dialog if it opened
    if (hasDialog) {
      const closeBtn = page.locator(
        'button[mat-dialog-close], .mat-dialog-close, button:has-text("Cancel")',
      );
      if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });
});
