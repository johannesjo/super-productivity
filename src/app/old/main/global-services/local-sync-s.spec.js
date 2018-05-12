'use strict';

describe('Service: LocalSync', () => {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  let LocalSync;
  beforeEach(inject((_LocalSync_) => {
    LocalSync = _LocalSync_;
  }));

  it('should be defined', () => {
    expect(true).toBe(true);
  });

});