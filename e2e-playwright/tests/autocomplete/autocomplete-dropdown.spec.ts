import { test, expect } from '../../fixtures/app.fixture';

test.describe('Autocomplete Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    // The app.fixture automatically loads the app and dismisses welcome dialog
    await page.waitForLoadState('networkidle');
  });

  test.skip('should create a simple tag', async ({ page, workViewPage, tagPage }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Add task with tag using short syntax
    await workViewPage.addTask('some task <3 #basicTag', true);

    // Confirm tag creation if dialog appears
    await tagPage.confirmTagCreation();

    // Wait for navigation or tag to be created
    await page.waitForTimeout(2000);

    // Check multiple possible locations for the tag
    const tagInSidebar = page.locator(
      'side-nav .tags mat-list-item:has-text("basicTag")',
    );
    const tagInContext = page.locator('.current-work-context-title:has-text("basicTag")');
    const tagInTask = page.locator('tag-list tag:has-text("basicTag")');

    // The tag should appear in at least one of these locations
    const tagExists =
      (await tagInSidebar.isVisible({ timeout: 1000 })) ||
      (await tagInContext.isVisible({ timeout: 1000 })) ||
      (await tagInTask.isVisible({ timeout: 1000 }));

    expect(tagExists).toBeTruthy();
  });

  // TODO: These tests need autocomplete functionality to be working
  // They are commented out in the original Nightwatch tests as well

  test.skip('should add an autocomplete dropdown when using short syntax', async ({
    page,
    workViewPage,
    tagPage,
    autocomplete,
  }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Create a tag first
    await workViewPage.addTask('some task <3 #testTag', true);
    await tagPage.confirmTagCreation();

    // Wait a bit for tag to be created and UI to stabilize
    await page.waitForTimeout(2000);

    // Press 'A' to open add task
    await page.keyboard.press('A');
    await page.waitForTimeout(500);

    // Type task text with tag prefix
    await page.keyboard.type('Test autocomplete #te');

    // Wait for autocomplete to appear
    await page.waitForTimeout(1000);

    // Verify autocomplete appears
    await expect(autocomplete.dropdown).toBeVisible({ timeout: 5000 });
  });

  test.skip('should have at least one tag in the autocomplete dropdown', async ({
    page,
    workViewPage,
    tagPage,
    autocomplete,
  }) => {
    // Wait for work view to be ready
    await workViewPage.waitForTaskList();

    // Create a tag first
    await workViewPage.addTask('some task <3 #autocompleteTestTag', true);
    await tagPage.confirmTagCreation();

    // Wait for tag to be created
    await page.waitForTimeout(2000);

    // Expand tags to ensure they're loaded
    try {
      await tagPage.expandTags();
    } catch {
      // Tags might already be expanded
    }

    // Press 'A' to open add task
    await page.keyboard.press('A');
    await page.waitForTimeout(500);

    // Type task text with partial tag name to trigger autocomplete
    await page.keyboard.type('Test tag autocomplete #auto');

    // Wait for autocomplete to appear
    await page.waitForTimeout(1000);

    // Verify autocomplete appears with items
    await expect(autocomplete.dropdown).toBeVisible({ timeout: 5000 });

    // Get autocomplete items
    const itemCount = await autocomplete.getOptionCount();
    expect(itemCount).toBeGreaterThan(0);

    // Verify our tag is in the autocomplete
    const optionTexts = await autocomplete.getOptionTexts();
    expect(optionTexts.some((text) => text.includes('autocompleteTestTag'))).toBeTruthy();
  });
});
