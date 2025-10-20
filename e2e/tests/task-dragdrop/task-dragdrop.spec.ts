import { test, expect } from '../../fixtures/test.fixture';
import { WorkViewPage } from '../../pages/work-view.page';

test.describe('Drag Task to change project and labels', () => {
  let workViewPage: WorkViewPage;

  test.beforeEach(async ({ page, testPrefix }) => {
    workViewPage = new WorkViewPage(page, testPrefix);

    // Wait for app to be ready
    await workViewPage.waitForTaskList();
    // Additional wait for stability in parallel execution
    await page.waitForTimeout(50);
  });

  test('should be able to move task to project by dragging to project link in magic-side-nav', async ({
    page,
    testPrefix,
  }) => {
    // Create task
    await workViewPage.addTask('TestTask');
    await page.waitForSelector('task', { state: 'visible' });

    const projectNameInput = page.locator('dialog-create-project input').first();

    // Add first project
    await page.keyboard.press('Shift+P');

    // Wait for input to be visible
    await projectNameInput.waitFor({ state: 'visible', timeout: 15000 });
    await projectNameInput.fill(`${testPrefix}-TestProject 1`);
    await page.keyboard.press('Enter');
    await page.waitForSelector('dialog-create-project', { state: 'detached' });

    // Add another project
    await page.keyboard.press('Shift+P');

    // Wait for input to be visible
    await projectNameInput.waitFor({ state: 'visible', timeout: 15000 });
    await projectNameInput.fill(`${testPrefix}-TestProject 2`);
    await page.keyboard.press('Enter');
    await page.waitForSelector('dialog-create-project', { state: 'detached' });

    // ensure projects are in the nav
    const project1NavItem = page
      .getByRole('menuitem')
      .filter({ hasText: `${testPrefix}-TestProject 1` });
    const project2NavItem = page
      .getByRole('menuitem')
      .filter({ hasText: `${testPrefix}-TestProject 2` });
    await expect(project1NavItem).toBeVisible();
    await expect(project2NavItem).toBeVisible();

    // find drag handle of task
    const firstTask = page.locator('task').first();
    const dragHandle = firstTask.locator('.drag-handle');

    // Drag and drop to first project
    await dragHandle.dragTo(project1NavItem);
    await expect(firstTask.locator('tag-list')).toContainText(
      `${testPrefix}-TestProject 1`,
    );

    // Drag and drop to second project
    await dragHandle.dragTo(project2NavItem);
    await expect(firstTask.locator('tag-list')).not.toContainText(
      `${testPrefix}-TestProject 1`,
    );
    await expect(firstTask.locator('tag-list')).toContainText(
      `${testPrefix}-TestProject 2`,
    );

    // Drag and drop back to inbox
    const inboxNavItem = page.getByRole('menuitem').filter({ hasText: 'Inbox' });
    await dragHandle.dragTo(inboxNavItem);
    await expect(firstTask.locator('tag-list')).not.toContainText(
      `${testPrefix}-TestProject 2`,
    );
    await expect(firstTask.locator('tag-list')).toContainText('Inbox');
  });

  test('should be able to add and remove tags by dragging task to the tag link in magic-side-nav', async ({
    page,
    testPrefix,
  }) => {
    // Create task
    await workViewPage.addTask('TestTask');
    await page.waitForSelector('task', { state: 'visible' });

    // create two tags
    const tagNameInput = page.locator('dialog-prompt input').first();
    // const tagMenu = page.locator('.nav-item').filter({ hasText: 'Tags' });
    const tagMenu = page
      .locator('nav-item')
      .filter({ hasText: 'Tags' })
      .locator('button');
    const createTagBtn = page
      .locator('li.nav-item')
      .filter({ hasText: 'Tags' })
      .locator('button')
      .filter({ hasText: 'add' });

    const tag1NavItem = page
      .getByRole('menuitem')
      .filter({ hasText: `${testPrefix}-Tag1` });
    const tag2NavItem = page
      .getByRole('menuitem')
      .filter({ hasText: `${testPrefix}-Tag2` });

    await tagMenu.hover();
    await createTagBtn.waitFor({ state: 'visible', timeout: 3000 });
    await createTagBtn.click();
    await tagNameInput.waitFor({ state: 'visible', timeout: 3000 });
    await tagNameInput.fill(`${testPrefix}-Tag1`);
    await page.keyboard.press('Enter');
    await tag1NavItem.waitFor({ state: 'visible', timeout: 3000 });

    await tagMenu.hover();
    await createTagBtn.waitFor({ state: 'visible', timeout: 3000 });
    await createTagBtn.click();
    await tagNameInput.waitFor({ state: 'visible', timeout: 3000 });
    await tagNameInput.fill(`${testPrefix}-Tag2`);
    await page.keyboard.press('Enter');
    await tag2NavItem.waitFor({ state: 'visible', timeout: 3000 });

    // find drag handle of task
    const firstTask = page.locator('task').first();
    const dragHandle = firstTask.locator('.drag-handle');

    // Drag and drop to first tag
    await dragHandle.dragTo(tag1NavItem);
    await expect(firstTask.locator('tag-list')).toContainText(`${testPrefix}-Tag1`);

    // Drag and drop to second tag
    await dragHandle.dragTo(tag2NavItem);
    await expect(firstTask.locator('tag-list')).toContainText(`${testPrefix}-Tag1`);
    await expect(firstTask.locator('tag-list')).toContainText(`${testPrefix}-Tag2`);

    // Drag and drop again to first tag to remove it
    await dragHandle.dragTo(tag1NavItem);
    await expect(firstTask.locator('tag-list')).not.toContainText(`${testPrefix}-Tag1`);
    await expect(firstTask.locator('tag-list')).toContainText(`${testPrefix}-Tag2`);
  });
});
