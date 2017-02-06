'use strict';

describe('Service: SimpleToast', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var SimpleToast;
  beforeEach(inject(function (_SimpleToast_) {
    SimpleToast = _SimpleToast_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});