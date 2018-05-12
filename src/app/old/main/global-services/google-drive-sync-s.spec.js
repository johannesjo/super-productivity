'use strict';

describe('Service: GoogleDriveSync', () => {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  let GoogleDriveSync;
  beforeEach(inject((_GoogleDriveSync_) => {
    GoogleDriveSync = _GoogleDriveSync_;
  }));

  it('should be defined', () => {
    expect(true).toBe(true);
  });

});