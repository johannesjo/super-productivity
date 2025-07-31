import { expect, test } from '../../fixtures/test.fixture';

const CONFIRM_CREATE_TAG_BTN = `dialog-confirm button[e2e="confirmBtn"]`;
const BASIC_TAG_TITLE = 'task tag-list tag:last-of-type .tag-title';

test.describe('Autocomplete Dropdown', () => {
  test('should create a simple tag', async ({ page, workViewPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Add task with tag syntax, skipClose=true to keep input open
    await workViewPage.addTask('some task <3 #basicTag', true);

    // Wait for and click the confirm create tag button
    await page.waitForSelector(CONFIRM_CREATE_TAG_BTN, { state: 'visible' });
    await page.click(CONFIRM_CREATE_TAG_BTN);

    // Wait for tag to be created
    await page.waitForSelector(BASIC_TAG_TITLE, { state: 'visible' });

    // Assert tag is present and has correct text
    const tagTitle = page.locator(BASIC_TAG_TITLE);
    await expect(tagTitle).toBeVisible();
    await expect(tagTitle).toContainText('basicTag');
  });
});
