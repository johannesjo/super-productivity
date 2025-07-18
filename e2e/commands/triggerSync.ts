import { NBrowser } from '../n-browser-interface';

module.exports = {
  command: function triggerSync(this: NBrowser) {
    return this.waitForElementVisible('.sync-btn', 3000).click('.sync-btn').pause(1000); // Allow time for sync to complete
  },
};
