import { NBrowser } from '../../n-browser-interface';

module.exports = {
  '@tags': ['sync', 'webdav'],
  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),
  after: (browser: NBrowser) => browser.end(),

  'should configure WebDAV sync with Last-Modified support': async (
    browser: NBrowser,
  ) => {
    await browser
      .navigateTo('http://localhost:4200')
      // Configure WebDAV sync
      .setupWebdavSync({
        baseUrl: 'http://localhost:2345/',
        username: 'alice',
        password: 'alice',
        syncFolderPath: '/super-productivity-test',
      })
      // Create a test task
      .addTask('Test task for WebDAV Last-Modified sync')
      .pause(500)
      // Trigger sync
      .triggerSync()
      // Verify sync completed
      .pause(3000)
      // .noError()
      .assert.not.elementPresent('.sync-btn mat-icon.spin')
      .assert.textContains('.sync-btn mat-icon', 'check')
      .end();
  },
};
