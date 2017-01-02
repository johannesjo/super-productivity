'use strict';

describe('Controller: WasIdleCtrl', function() {

    // load the controller's module
    beforeEach(module('superProductivity'));

    var WasIdleCtrl;
    var scope;

    // Initialize the controller and a mock scope
    beforeEach(inject(function($controller, $rootScope) {
        scope = $rootScope.$new();
        WasIdleCtrl = $controller('WasIdleCtrl', {
            $scope: scope
            // place mocked dependencies here
          });
      }));

    it('should ...', function() {
        expect(true).toBe(true);
      });
  });
