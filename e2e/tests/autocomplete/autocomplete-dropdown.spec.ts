import { expect, test } from '../../fixtures/test.fixture';

const CONFIRM_CREATE_TAG_BTN = `dialog-confirm button[e2e="confirmBtn"]`;
const BASIC_TAG_TITLE = 'task tag-list tag:last-of-type .tag-title';

test.describe('Autocomplete Dropdown', () => {
  test('should create a simple tag', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Add task with tag syntax, skipClose=true to keep input open
    await workViewPage.addTask('some task <3 #basicTag', true);

    // Small delay to let the tag creation dialog appear
    await page.waitForTimeout(500);

    // Wait for and click the confirm create tag button with increased timeout
    await page.waitForSelector(CONFIRM_CREATE_TAG_BTN, {
      state: 'visible',
      timeout: 15000,
    });
    await page.locator(CONFIRM_CREATE_TAG_BTN).click();

    // Wait for dialog to close
    await page.waitForSelector(CONFIRM_CREATE_TAG_BTN, {
      state: 'hidden',
      timeout: 10000,
    });

    // Close the add task input if still open
    const backdrop = page.locator('.backdrop');
    if (await backdrop.isVisible()) {
      await backdrop.click();
    }

    // Wait for tag to be created with increased timeout
    await page.waitForSelector(BASIC_TAG_TITLE, { state: 'visible', timeout: 15000 });

    // Assert tag is present and has correct text
    const tagTitle = page.locator(BASIC_TAG_TITLE);
    await expect(tagTitle).toBeVisible();
    await expect(tagTitle).toContainText('basicTag');
  });
});
