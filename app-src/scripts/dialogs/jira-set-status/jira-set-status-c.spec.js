'use strict';

describe('Controller: JiraSetStatusCtrl', function () {

  // load the controller's module
  beforeEach(module('superProductivity'));

  var JiraSetStatusCtrl;
  var scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    JiraSetStatusCtrl = $controller('JiraSetStatusCtrl', {
      $scope: scope
      // place mocked dependencies here
    });
  }));

  it('should ...', function () {
    expect(true).toBe(true);
  });
});
