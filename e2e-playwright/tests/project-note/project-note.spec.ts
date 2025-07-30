import { test, expect } from '../../fixtures/app.fixture';
import { AppHelpers } from '../../helpers/app-helpers';

test.describe('Project Notes', () => {
  test.beforeEach(async ({ page }) => {
    // Create default project
    await AppHelpers.createDefaultProject(page);
  });

  test.skip('create a note', async ({ page }) => {
    const noteTitle = 'Some new Note';

    // Press N to add note (keyboard shortcut)
    await page.keyboard.press('N');

    // Wait for add note button and click
    const addNoteBtn = page.locator('#add-note-btn');
    await addNoteBtn.waitFor({ state: 'visible' });
    await addNoteBtn.click();

    // Wait for dialog and enter note
    const textarea = page.locator('dialog-fullscreen-markdown textarea');
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(noteTitle);

    // Save note
    const saveBtn = page.locator('#T-save-note');
    await saveBtn.click();

    // Hover over notes wrapper to ensure visibility
    const notesWrapper = page.locator('notes');
    await notesWrapper.hover({ position: { x: 10, y: 50 } });

    // Verify note appears
    const firstNote = page.locator('notes note:first-of-type');
    await firstNote.waitFor({ state: 'visible' });
    await expect(firstNote).toContainText(noteTitle);
  });

  test.skip('new note should be still available after reload', async ({ page }) => {
    const noteTitle = 'Some new Note';

    // Create a note first
    await page.keyboard.press('N');
    const addNoteBtn = page.locator('#add-note-btn');
    await addNoteBtn.waitFor({ state: 'visible' });
    await addNoteBtn.click();

    const textarea = page.locator('dialog-fullscreen-markdown textarea');
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(noteTitle);

    const saveBtn = page.locator('#T-save-note');
    await saveBtn.click();

    // Wait for save
    await page.waitForTimeout(200);

    // Reload page
    await page.reload();

    // Toggle notes panel
    const toggleNotesBtn = page.locator('.e2e-toggle-notes-btn');
    await toggleNotesBtn.waitFor({ state: 'visible' });
    await toggleNotesBtn.click();

    // Wait for notes wrapper
    const notesWrapper = page.locator('notes');
    await notesWrapper.waitFor({ state: 'visible' });

    // Hover to ensure visibility
    await notesWrapper.hover({ position: { x: 10, y: 50 } });

    // Verify note still exists
    const firstNote = page.locator('notes note:first-of-type');
    await firstNote.waitFor({ state: 'visible' });
    await expect(firstNote).toBeVisible();
    await expect(firstNote).toContainText(noteTitle);
  });
});
