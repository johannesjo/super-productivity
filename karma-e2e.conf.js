// An example configuration file.
'use strict';

exports.config = {
    // The address of a running selenium server.
    seleniumAddress: 'http://localhost:4444/wd/hub',

    // Spec patterns are relative to the current working directly when
    // protractor is called.
    specs: ['e2e-tests/**/*.js'],

    // Options to be passed to Jasmine-node.
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 30000,
        isVerbose: true
      },

    onPrepare: function() {
        browser.manage()
            .window()
            .setSize(1360, 768);
        browser.manage()
            .timeouts()
            .setScriptTimeout(20000);
      }
  };
