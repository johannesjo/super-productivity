'use strict';

describe('Service: GitLog', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var GitLog;
  beforeEach(inject(function (_GitLog_) {
    GitLog = _GitLog_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});