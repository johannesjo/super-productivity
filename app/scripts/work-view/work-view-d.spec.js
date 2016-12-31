'use strict';

describe('Directive: workView', function() {

    // load the directive's module
    beforeEach(module('superProductivity'));
    beforeEach(module('templates'));

    var element,
        scope;

    beforeEach(inject(function($rootScope) {
        scope = $rootScope.$new();
      }));

    it('should do something', inject(function($compile) {
        element = $compile('<work-view></work-view>')(scope);
        scope.$digest();
        expect(true).toBe(true);
      }));
  });
