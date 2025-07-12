declare global {
  namespace NightwatchCustomCommands {
    interface Commands {
      setupWebdavSync(
        config: {
          baseUrl: string;
          username: string;
          password: string;
          syncFolderPath: string;
        },
        callback?: () => void,
      ): this;
    }
  }
}

module.exports = {
  command: function setupWebdavSync(
    this: any,
    config: {
      baseUrl: string;
      username: string;
      password: string;
      syncFolderPath: string;
    },
    callback?: () => void,
  ) {
    this.url('http://localhost:4200/config')
      .waitForElementVisible('body', 5000)
      .pause(500)
      // Navigate to sync settings
      .click('a[href="/config/sync"]')
      .waitForElementVisible('[data-cy="sync-provider-webdav"]', 5000)
      // Select WebDAV provider
      .click('[data-cy="sync-provider-webdav"]')
      .pause(500)
      // Fill in WebDAV configuration
      .waitForElementVisible('input[ng-reflect-name="baseUrl"]', 2000)
      .clearValue('input[ng-reflect-name="baseUrl"]')
      .setValue('input[ng-reflect-name="baseUrl"]', config.baseUrl)
      .clearValue('input[ng-reflect-name="userName"]')
      .setValue('input[ng-reflect-name="userName"]', config.username)
      .clearValue('input[ng-reflect-name="password"]')
      .setValue('input[ng-reflect-name="password"]', config.password)
      .clearValue('input[ng-reflect-name="syncFolderPath"]')
      .setValue('input[ng-reflect-name="syncFolderPath"]', config.syncFolderPath)
      // Save configuration
      .click('button[type="submit"]')
      .pause(1000);

    if (callback) {
      callback.call(this);
    }

    return this;
  },
};
