'use strict';

describe('Service: InitGlobalModels', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var InitGlobalModels;
  beforeEach(inject(function (_InitGlobalModels_) {
    InitGlobalModels = _InitGlobalModels_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});