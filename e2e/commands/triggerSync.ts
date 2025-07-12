declare global {
  namespace NightwatchCustomCommands {
    interface Commands {
      triggerSync(callback?: () => void): this;
    }
  }
}

module.exports = {
  command: function triggerSync(this: any, callback?: () => void) {
    this.url('http://localhost:4200/work-view')
      .waitForElementVisible('body', 5000)
      .pause(500)
      // Find and click sync button
      .waitForElementVisible('.sync-btn', 3000)
      .click('.sync-btn')
      .pause(2000); // Allow time for sync to complete

    if (callback) {
      callback.call(this);
    }

    return this;
  },
};
