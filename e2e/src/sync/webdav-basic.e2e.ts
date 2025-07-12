import { NBrowser } from '../../n-browser-interface';

module.exports = {
  '@tags': ['sync', 'webdav'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should configure WebDAV sync with Last-Modified support': async (
    browser: NBrowser,
  ) => {
    await browser
      // Configure WebDAV sync
      .setupWebdavSync({
        baseUrl: 'http://localhost:8080/',
        username: 'alice',
        password: 'alicepassword',
        syncFolderPath: '/super-productivity-test',
      })
      // Create a test task
      .addTask('Test task for WebDAV Last-Modified sync')
      .pause(500)
      // Trigger sync
      .triggerSync()
      // Verify sync completed
      .pause(3000)
      .assert.not.elementPresent('.sync-btn mat-icon.spin')
      // Log sync state for debugging
      .execute(
        () => {
          const syncBtn = document.querySelector('.sync-btn');
          const icon = syncBtn?.querySelector('mat-icon');
          return {
            iconText: icon?.textContent?.trim(),
            hasSyncBtn: !!syncBtn,
            syncBtnText: syncBtn?.textContent?.trim(),
          };
        },
        [],
        (result) => {
          console.log('WebDAV sync state:', result.value);
          const state = result.value as any;
          browser.assert.ok(state.hasSyncBtn, 'Sync button should exist');
        },
      );
  },
};
