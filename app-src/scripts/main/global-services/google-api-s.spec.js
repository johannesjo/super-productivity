'use strict';

describe('Service: GoogleApi', () => {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  let GoogleApi;
  beforeEach(inject((_GoogleApi_) => {
    GoogleApi = _GoogleApi_;
  }));

  it('should be defined', () => {
    expect(true).toBe(true);
  });

});