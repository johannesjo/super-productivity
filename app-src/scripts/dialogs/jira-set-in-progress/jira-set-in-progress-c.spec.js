'use strict';

describe('Controller: JiraSetInProgressCtrl', function () {

  // load the controller's module
  beforeEach(module('superProductivity'));

  var JiraSetInProgressCtrl;
  var scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    JiraSetInProgressCtrl = $controller('JiraSetInProgressCtrl', {
      $scope: scope
      // place mocked dependencies here
    });
  }));

  it('should ...', function () {
    expect(true).toBe(true);
  });
});
