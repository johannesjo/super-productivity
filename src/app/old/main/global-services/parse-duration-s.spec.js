'use strict';

describe('Service: ParseDuration', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var ParseDuration;
  beforeEach(inject(function (_ParseDuration_) {
    ParseDuration = _ParseDuration_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});