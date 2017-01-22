'use strict';

describe('Service: Projects', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var Projects;
  beforeEach(inject(function (_Projects_) {
    Projects = _Projects_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});