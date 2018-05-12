'use strict';

describe('Service: Git', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var Git;
  beforeEach(inject(function (_Git_) {
    Git = _Git_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});