'use strict';

describe('Factory: TasksUtil', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var TasksUtil;
  beforeEach(inject(function (_TasksUtil_) {
    TasksUtil = _TasksUtil_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});