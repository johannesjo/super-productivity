'use strict';

describe('Component: progressBar', () => {

  // load the directive's module
  beforeEach(module('superProductivity'));
  beforeEach(module('templates'));

  let element;
  let scope;

  beforeEach(inject(($rootScope) => {
    scope = $rootScope.$new();
  }));

  it('should do something', inject(($compile) => {
    element = $compile('<progress-bar></progress-bar>')(scope);
    scope.$digest();
    expect(true).toBe(true);
  }));
});