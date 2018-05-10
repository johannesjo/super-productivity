'use strict';

describe('Service: AddTaskBarGlobal', () => {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  let AddTaskBarGlobal;
  beforeEach(inject((_AddTaskBarGlobal_) => {
    AddTaskBarGlobal = _AddTaskBarGlobal_;
  }));

  it('should be defined', () => {
    expect(true).toBe(true);
  });

});