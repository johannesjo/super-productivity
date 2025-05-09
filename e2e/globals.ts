// const fakeDateTS = new Date('2025-05-09T11:00:00Z').getTime();

module.exports = {
  beforeEach: async (browser) => {
    // // For newer Nightwatch versions (v2+)
    // if (browser.chrome && browser.chrome.sendDevToolsCommand) {
    //   await browser.chrome.sendDevToolsCommand('Emulation.setVirtualTimePolicy', {
    //     policy: 'pauseIfNetworkFetchesPending',
    //     initialVirtualTime: fakeDateTS / 1000,
    //   });
    // }
    // // Fallback to older method
    // else if (browser.driver) {
    //   const session = await browser.driver.getDevToolsSession();
    //   await session.send('Emulation.setVirtualTimePolicy', {
    //     policy: 'pauseIfNetworkFetchesPending',
    //     initialVirtualTime: fakeDateTS / 1000,
    //   });
    // } else {
    //   throw new Error('Unable to simulate other time');
    // }
  },
};
