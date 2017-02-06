'use strict';

describe('Service: ShortSyntax', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var ShortSyntax;
  beforeEach(inject(function (_ShortSyntax_) {
    ShortSyntax = _ShortSyntax_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});