'use strict';

describe('Directive: helpSection', function () {

  // load the directive's module
  beforeEach(module('superProductivity'));
  beforeEach(module('templates'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should do something', inject(function ($compile) {
    element = $compile('<help-section></help-section>')(scope);
    scope.$digest();
    expect(true).toBe(true);
  }));
});