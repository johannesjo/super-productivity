'use strict';

describe('Directive: dailySummary', function () {

  // load the directive's module
  beforeEach(module('superProductivity'));
  beforeEach(module('templates'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should do something', inject(function ($compile) {
    element = $compile('<daily-summary></daily-summary>')(scope);
    scope.$digest();
    expect(true).toBe(true);
  }));
});
