'use strict';

describe('Controller: AddTaskCtrl', function () {

  // load the controller's module
  beforeEach(module('superProductivity'));

  var AddTaskCtrl;
  var scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    AddTaskCtrl = $controller('AddTaskCtrl', {
      $scope: scope
      // place mocked dependencies here
    });
  }));

  it('should ...', function () {
    expect(true).toBe(true);
  });
});
