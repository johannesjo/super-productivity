'use strict';

describe('Controller: EditGlobalLinkCtrl', function () {

  // load the controller's module
  beforeEach(module('superProductivity'));

  var EditGlobalLinkCtrl;
  var scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    EditGlobalLinkCtrl = $controller('EditGlobalLinkCtrl', {
      $scope: scope
      // place mocked dependencies here
    });
  }));

  it('should ...', function () {
    expect(true).toBe(true);
  });
});
