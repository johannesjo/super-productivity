(function () {
  // Wait for Jasmine to be fully loaded
  function waitForJasmine() {
    if (typeof jasmine !== 'undefined' && jasmine.getEnv && window.__karma__) {
      installHooks();
    } else {
      setTimeout(waitForJasmine, 100);
    }
  }

  function installHooks() {
    var env = jasmine.getEnv();

    // Create a custom reporter
    var specReporter = {
      specStarted: function (result) {
        // console.log('[jasmine-spec-reporter-hook] Spec started:', result.fullName);

        if (window.__karma__ && window.__karma__.info) {
          window.__karma__.info({
            type: 'spec-start',
            specName: result.fullName,
            specId: result.id,
            timestamp: Date.now(),
          });
        }
      },

      specDone: function (result) {
        // console.log('[jasmine-spec-reporter-hook] Spec done:', result.fullName);

        if (window.__karma__ && window.__karma__.info) {
          window.__karma__.info({
            type: 'spec-done',
            specName: result.fullName,
            specId: result.id,
            timestamp: Date.now(),
            status: result.status,
          });
        }
      },
    };

    // Add our reporter
    env.addReporter(specReporter);
  }

  // Start waiting
  waitForJasmine();
})();
