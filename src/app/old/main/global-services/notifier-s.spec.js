'use strict';

describe('Service: Notifier', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var Notifier;
  beforeEach(inject(function (_Notifier_) {
    Notifier = _Notifier_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});