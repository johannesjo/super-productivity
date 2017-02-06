'use strict';

describe('Controller: CreateProjectCtrl', function () {

  // load the controller's module
  beforeEach(module('superProductivity'));

  var CreateProjectCtrl;
  var scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    CreateProjectCtrl = $controller('CreateProjectCtrl', {
      $scope: scope
      // place mocked dependencies here
    });
  }));

  it('should ...', function () {
    expect(true).toBe(true);
  });
});
