function RunningSpecReporter(baseReporterDecorator, config, logger) {
  baseReporterDecorator(this);

  var log = logger.create('running-spec');
  var runningSpecs = {};

  this.onBrowserInfo = function (browser, info) {
    if (info && info.type === 'spec-start') {
      runningSpecs[browser.id] = {
        name: info.specName,
        id: info.specId,
        timestamp: info.timestamp,
      };
    } else if (info && info.type === 'spec-done') {
      if (info.status === 'passed') {
        delete runningSpecs[browser.id];
      }
    }
  };

  this.onBrowserDisconnect = function (browser) {
    var spec = runningSpecs[browser.id];
    if (spec) {
      log.warn(
        'Browser %s disconnected while running spec: "%s" (id: %s)',
        browser.name,
        spec.name,
        spec.id,
      );
      log.warn('Test started at: %s', new Date(spec.timestamp).toISOString());
    } else {
      log.warn('Browser %s disconnected (no spec information available)', browser.name);
    }
  };

  this.onBrowserError = function (browser, error) {
    var spec = runningSpecs[browser.id];
    if (spec) {
      log.error('Browser %s error while running spec: "%s"', browser.name, spec.name);
      log.error('Error: %s', error);
    }
  };

  this.onSpecComplete = function (browser, result) {
    if (result && result.success) {
      delete runningSpecs[browser.id];
    }
  };

  this.onBrowserComplete = function (browser) {
    delete runningSpecs[browser.id];
  };
}

RunningSpecReporter.$inject = ['baseReporterDecorator', 'config', 'logger'];

module.exports = {
  'reporter:running-spec': ['type', RunningSpecReporter],
};
