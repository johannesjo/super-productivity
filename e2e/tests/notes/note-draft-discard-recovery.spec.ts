import { test, expect, type Page } from '../../fixtures/test.fixture';

/**
 * End-to-end cover for the crash-safe note draft lifecycle (#8982), against the
 * REAL IndexedDB in a real browser.
 *
 * Everything else guarding this feature runs on the fake-indexeddb the Karma
 * suite installs, against a mocked or in-memory store. That is fine for the
 * decision logic, but it cannot show that the pieces are wired together in a
 * running app: that the editor really checkpoints while you type, that the
 * drafts really land in `sp-local-drafts`, and that reopening a note really
 * consults them.
 *
 * The sequence below is the defect that survived two rounds of review. Discard
 * is reachable with NO confirmation dialog, because the editor only confirms
 * when its content differs from what it opened with. So typing, letting the
 * debounce checkpoint, undoing back to the original text and hitting Discard
 * closes instantly while the stored draft still holds the typed text. If the
 * discard fails to retire that draft, the next open silently restores it and the
 * following save writes it over the note.
 */

interface StoredDraft {
  content: string;
  baseContent: string;
  isResolved: boolean;
}

/**
 * Reads the device-local drafts store from the page. Returns [] when the DB or
 * its store does not exist yet, which is the normal state before the first
 * checkpoint. Opening without a version would otherwise CREATE an empty v1 DB
 * and make the real one unopenable later, so the store is checked before use.
 */
const readDrafts = (page: Page): Promise<StoredDraft[]> =>
  page.evaluate(
    () =>
      new Promise<StoredDraft[]>((resolve) => {
        const req = indexedDB.open('sp-local-drafts');
        req.onerror = () => resolve([]);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('drafts')) {
            db.close();
            resolve([]);
            return;
          }
          const all = db.transaction('drafts', 'readonly').objectStore('drafts').getAll();
          all.onerror = () => {
            db.close();
            resolve([]);
          };
          all.onsuccess = () => {
            const rows = (all.result || []).map((r: Record<string, any>) => ({
              content: r.content,
              baseContent: r.baseContent,
              // Mirrors isDraftResolved(): a marker only counts when it applies
              // to the text actually stored.
              isResolved: !!r.resolved && r.resolved.content === r.content,
            }));
            db.close();
            resolve(rows);
          };
        };
      }),
  );

test.describe('Note draft discard recovery (#8982)', () => {
  test('a discard after an undo does not resurrect the typed text', async ({
    page,
    workViewPage,
    notePage,
    testPrefix,
  }) => {
    await workViewPage.waitForTaskList();

    const original = `${testPrefix}-original note body`;
    const typed = `${original} PLUS UNSAVED JUNK`;
    await notePage.addNote(original);
    expect(await notePage.noteExists(original)).toBe(true);

    // --- Open the note and type, so the debounce checkpoints a draft ----------
    const note = notePage.getNoteByContent(original);
    await note.locator('.markdown-preview').click();
    await notePage.noteDialog.waitFor({ state: 'visible' });

    const textarea = page.locator('dialog-fullscreen-markdown textarea').first();
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(typed);

    // Wait on the checkpoint itself rather than on a timer: the debounce is an
    // implementation detail, the stored row is the thing the next step needs.
    await expect
      .poll(async () => (await readDrafts(page)).map((d) => d.content), {
        message: 'the editor should checkpoint the typed text into sp-local-drafts',
      })
      .toContain(typed);

    // --- Undo back to the original, then Discard ------------------------------
    // Content now equals what the editor opened with, so Discard closes with no
    // confirmation and the pending debounce never becomes a second checkpoint.
    await textarea.fill(original);
    await page.locator('#T-close-note, button:has-text("Discard")').first().click();
    await notePage.noteDialog.waitFor({ state: 'hidden' });

    // The stored draft must no longer be offerable: either retired by a marker,
    // or brought back in line with the note. Asserted on the store because the
    // damage happens here, one open before the user can see it.
    await expect
      .poll(
        async () => {
          const drafts = await readDrafts(page);
          return drafts.filter((d) => d.content === typed && !d.isResolved).length;
        },
        { message: 'the discarded text must not remain as a live, restorable draft' },
      )
      .toBe(0);

    // --- Reopen: the editor must NOT be seeded with the discarded text --------
    await note.locator('.markdown-preview').click();
    await notePage.noteDialog.waitFor({ state: 'visible' });
    await expect(textarea).toHaveValue(original);

    // --- Escape is the save path, so a bad seed would be written back ---------
    await page.keyboard.press('Escape');
    await notePage.noteDialog.waitFor({ state: 'hidden' });

    expect(await notePage.noteExists(original)).toBe(true);
    expect(await notePage.noteExists(typed, 3000)).toBe(false);
  });

  test('a crash-style close keeps the typed text recoverable', async ({
    page,
    workViewPage,
    notePage,
    testPrefix,
  }) => {
    // The mirror property, and the reason none of the above may be "fixed" by
    // retiring drafts more eagerly: text that was neither saved nor discarded
    // must survive and be offered back. A reload with the editor open is the
    // closest honest stand-in for the crash this feature exists for.
    await workViewPage.waitForTaskList();

    const original = `${testPrefix}-note that will crash`;
    const typed = `${original} RECOVER ME`;
    await notePage.addNote(original);

    const note = notePage.getNoteByContent(original);
    await note.locator('.markdown-preview').click();
    await notePage.noteDialog.waitFor({ state: 'visible' });
    const textarea = page.locator('dialog-fullscreen-markdown textarea').first();
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(typed);

    await expect
      .poll(async () => (await readDrafts(page)).map((d) => d.content))
      .toContain(typed);

    // Reload with the edit still open: no save, no discard, nothing retired.
    await page.reload();
    await workViewPage.waitForTaskList();

    // The note itself never changed...
    expect(await notePage.noteExists(original)).toBe(true);
    // ...and reopening offers the unsaved text back for recovery.
    const noteAfterReload = notePage.getNoteByContent(original);
    await noteAfterReload.locator('.markdown-preview').click();
    await notePage.noteDialog.waitFor({ state: 'visible' });
    await expect(page.locator('dialog-fullscreen-markdown textarea').first()).toHaveValue(
      typed,
    );
  });
});
