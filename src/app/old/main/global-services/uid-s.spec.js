'use strict';

describe('Service: Uid', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var Uid;
  beforeEach(inject(function (_Uid_) {
    Uid = _Uid_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});