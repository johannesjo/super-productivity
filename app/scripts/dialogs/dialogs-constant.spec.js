'use strict';

describe('Service: Dialogs', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var Dialogs;
  beforeEach(inject(function (_Dialogs_) {
    Dialogs = _Dialogs_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});
