import { test, expect } from '../fixtures/test.fixture';

test.describe('Debug Project Note', () => {
  test('debug project creation and note toggle', async ({ page, projectPage }) => {
    // Create and navigate to default project
    await projectPage.createAndGoToTestProject();

    // Verify we're in a project context
    const workCtxTitle = page.locator('.current-work-context-title');
    const titleText = await workCtxTitle.textContent();
    console.log('Current work context:', titleText);

    // Check if notes toggle button exists
    const toggleNotesBtn = page.locator('.e2e-toggle-notes-btn');
    const toggleExists = await toggleNotesBtn.isVisible();
    console.log('Toggle notes button exists:', toggleExists);

    if (toggleExists) {
      await toggleNotesBtn.click();

      // Wait longer for notes section to appear
      await page.waitForTimeout(1000);

      // Check if notes section appears
      const notesSection = page.locator('notes');
      const notesVisible = await notesSection.isVisible({ timeout: 5000 });
      console.log('Notes section visible after toggle:', notesVisible);

      if (notesVisible) {
        // Check if add note button exists
        const addNoteBtn = page.locator('#add-note-btn');
        const addNoteBtnVisible = await addNoteBtn.isVisible({ timeout: 5000 });
        console.log('Add note button visible:', addNoteBtnVisible);

        if (addNoteBtnVisible) {
          // Try to click the add note button
          console.log('Attempting to click add note button...');

          // Check for any errors or console messages
          page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
          page.on('pageerror', (error) => console.log('PAGE ERROR:', error.message));

          await addNoteBtn.click({ force: true });

          // Wait a moment for potential async operations
          await page.waitForTimeout(1000);

          // Check for any overlay or dialog elements
          const allOverlays = page.locator('.cdk-overlay-container *');
          const overlayCount = await allOverlays.count();
          console.log('Total overlay elements:', overlayCount);

          // Check if dialog appears (it should be in a mat-dialog-container)
          const matDialog = page.locator('mat-dialog-container');
          const matDialogVisible = await matDialog.isVisible({ timeout: 2000 });
          console.log('Mat dialog container visible:', matDialogVisible);

          // Also check for CDK overlay
          const cdkOverlay = page.locator('.cdk-overlay-container mat-dialog-container');
          const cdkOverlayVisible = await cdkOverlay.isVisible({ timeout: 2000 });
          console.log('CDK overlay dialog visible:', cdkOverlayVisible);

          // Check for any dialog-like elements
          const anyDialog = page.locator(
            '[role="dialog"], .mat-dialog-container, mat-dialog-container',
          );
          const anyDialogCount = await anyDialog.count();
          console.log('Any dialog elements found:', anyDialogCount);

          if (matDialogVisible || cdkOverlayVisible) {
            // Check if textarea appears (inside the mat-dialog-container)
            const textarea = page.locator('mat-dialog-container textarea');
            const textareaVisible = await textarea.isVisible({ timeout: 5000 });
            console.log('Textarea visible:', textareaVisible);

            if (textareaVisible) {
              // Try to fill the textarea
              await textarea.fill('Test note content');
              console.log('Filled textarea with test content');

              // Check if save button exists (also inside the dialog)
              const saveBtn = page.locator('mat-dialog-container #T-save-note');
              const saveBtnVisible = await saveBtn.isVisible({ timeout: 5000 });
              console.log('Save button visible:', saveBtnVisible);

              if (saveBtnVisible) {
                // Click save button
                console.log('Clicking save button...');
                await saveBtn.click();
                console.log('Save button clicked');

                // Wait a moment for the dialog to close and note to be saved
                await page.waitForTimeout(2000);

                // Check if note appears in the notes section
                const noteContent = page.locator('notes note');
                const noteExists = await noteContent.count();
                console.log('Number of notes found after save:', noteExists);
              }
            }
          }
        }
      } else {
        // Try to find notes section in different ways
        const notesAlternate = page.locator(
          '[data-test="notes"], .notes-wrapper, .notes-section',
        );
        const notesAlternateExists = await notesAlternate.count();
        console.log('Alternative notes selectors found:', notesAlternateExists);

        // Check if any elements with 'note' in their tag/class exist
        const anyNotes = page.locator('*[class*="note"], *[id*="note"]');
        const anyNotesCount = await anyNotes.count();
        console.log('Any note-related elements found:', anyNotesCount);
      }
    }

    // Add a short wait to see the final state
    await page.waitForTimeout(2000);
  });
});
