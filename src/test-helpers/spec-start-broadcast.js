(function () {
  console.log('[spec-start-broadcast] Script loaded');

  if (typeof jasmine !== 'undefined' && jasmine.getEnv) {
    console.log('[spec-start-broadcast] Jasmine detected, hooking into specStarted');

    var env = jasmine.getEnv();
    var originalSpecStarted = env.specStarted;

    // Try to hook into reporter's specStarted
    env.specStarted = function (spec) {
      console.log('[spec-start-broadcast] Spec started:', spec.fullName);

      if (window.__karma__ && window.__karma__.info) {
        console.log('[spec-start-broadcast] Sending info to Karma');
        window.__karma__.info({
          type: 'spec-start',
          specName: spec.fullName,
          specId: spec.id,
          timestamp: Date.now(),
        });
      }

      if (originalSpecStarted) {
        originalSpecStarted.call(this, spec);
      }
    };

    // Also try to hook into the reporter
    var origAddReporter = env.addReporter;
    env.addReporter = function (reporter) {
      console.log('[spec-start-broadcast] Reporter added, wrapping specStarted');

      if (reporter.specStarted) {
        var origSpecStarted = reporter.specStarted;
        reporter.specStarted = function (spec) {
          console.log('[spec-start-broadcast] Reporter spec started:', spec.fullName);

          if (window.__karma__ && window.__karma__.info) {
            window.__karma__.info({
              type: 'spec-start',
              specName: spec.fullName,
              specId: spec.id,
              timestamp: Date.now(),
            });
          }

          return origSpecStarted.call(this, spec);
        };
      }

      return origAddReporter.call(this, reporter);
    };
  } else {
    console.log('[spec-start-broadcast] Jasmine not found');
  }
})();
