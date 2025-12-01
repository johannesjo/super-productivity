import { test, expect } from '../../fixtures/test.fixture';

const NOTES_WRAPPER = 'notes';
const NOTE = 'notes note';
const FIRST_NOTE = `${NOTE}:first-of-type`;
const TOGGLE_NOTES_BTN = '.e2e-toggle-notes-btn';

test.describe('Project Note', () => {
  test.skip('create a note', async ({ page, projectPage }) => {
    // Create and navigate to default project
    await projectPage.createAndGoToTestProject();

    // Add a note
    await projectPage.addNote('Some new Note');

    // Move to notes wrapper area and verify note is visible
    const notesWrapper = page.locator(NOTES_WRAPPER);
    await notesWrapper.hover({ position: { x: 10, y: 50 } });

    const firstNote = page.locator(FIRST_NOTE);
    await firstNote.waitFor({ state: 'visible' });
    await expect(firstNote).toContainText('Some new Note');
  });

  test.skip('new note should be still available after reload', async ({
    page,
    projectPage,
  }) => {
    // Create and navigate to default project
    await projectPage.createAndGoToTestProject();

    // Add a note
    await projectPage.addNote('Some new Note');

    // Wait for save
    await page.waitForLoadState('networkidle');

    // Reload the page
    await page.reload();

    // Click toggle notes button
    const toggleNotesBtn = page.locator(TOGGLE_NOTES_BTN);
    await toggleNotesBtn.waitFor({ state: 'visible' });
    await toggleNotesBtn.click();

    // Verify notes wrapper is present
    const notesWrapper = page.locator(NOTES_WRAPPER);
    await notesWrapper.waitFor({ state: 'visible' });
    await notesWrapper.hover({ position: { x: 10, y: 50 } });

    // Verify note is still there
    const firstNote = page.locator(FIRST_NOTE);
    await firstNote.waitFor({ state: 'visible' });
    await expect(firstNote).toBeVisible();
    await expect(firstNote).toContainText('Some new Note');
  });
});
