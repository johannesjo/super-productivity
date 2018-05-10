'use strict';

describe('Component: addTaskBar', () => {

  // load the directive's module
  beforeEach(module('superProductivity'));
  beforeEach(module('templates'));

  let element;
  let scope;

  beforeEach(inject(($rootScope) => {
    scope = $rootScope.$new();
  }));

  it('should do something', inject(($compile) => {
    element = $compile('<add-task-bar></add-task-bar>')(scope);
    scope.$digest();
    expect(true).toBe(true);
  }));
});