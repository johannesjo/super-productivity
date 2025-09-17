import { expect, test } from '../../fixtures/test.fixture';

test.describe('Project Folders', () => {
  test('can create a project folder via navigation', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();

    const navigation = page.locator('nav.nav-sidenav, .nav-sidenav');
    await expect(navigation).toBeVisible();

    const projectsHeader = page
      .locator('.g-multi-btn-wrapper')
      .filter({ hasText: 'Projects' })
      .first();
    await expect(projectsHeader).toBeVisible();

    const createFolderBtn = projectsHeader
      .locator('button.additional-btn')
      .filter({ has: page.locator('mat-icon', { hasText: 'create_new_folder' }) })
      .first();
    await createFolderBtn.click();

    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();

    const folderName = 'E2E Folder';
    await dialog.locator('input[formcontrolname="title"]').fill(folderName);
    await dialog.locator('button[type="submit"]').click();

    await expect(dialog).toHaveCount(0);

    const createdFolderNavItem = page
      .locator('nav-item, .nav-child-item')
      .filter({ hasText: folderName })
      .first();
    await expect(createdFolderNavItem).toBeVisible();
  });

  test('opens create project dialog from navigation', async ({ page, workViewPage }) => {
    await workViewPage.waitForTaskList();

    const projectsHeader = page
      .locator('.g-multi-btn-wrapper')
      .filter({ hasText: 'Projects' })
      .first();
    await expect(projectsHeader).toBeVisible();

    const createProjectBtn = projectsHeader
      .locator('button.additional-btn')
      .filter({ has: page.locator('mat-icon', { hasText: 'add' }) })
      .first();
    await createProjectBtn.click();

    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[formcontrolname="title"]')).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
  });
});
