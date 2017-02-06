'use strict';

describe('Controller: DistractionsCtrl', function () {

  // load the controller's module
  beforeEach(module('superProductivity'));

  var DistractionsCtrl;
  var scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    DistractionsCtrl = $controller('DistractionsCtrl', {
      $scope: scope
      // place mocked dependencies here
    });
  }));

  it('should ...', function () {
    expect(true).toBe(true);
  });
});
