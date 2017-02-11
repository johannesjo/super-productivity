'use strict';

describe('Directive: gitSettings', function () {

  // load the directive's module
  beforeEach(module('superProductivity'));
  beforeEach(module('templates'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should do something', inject(function ($compile) {
    element = $compile('<git-settings></git-settings>')(scope);
    scope.$digest();
    expect(true).toBe(true);
  }));
});