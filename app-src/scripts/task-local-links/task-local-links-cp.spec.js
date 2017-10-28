'use strict';

describe('Component: taskLocalLinks', function() {

    // load the directive's module
    beforeEach(module('superProductivity'));
    beforeEach(module('templates'));

    var element,
        scope;

    beforeEach(inject(function($rootScope) {
        scope = $rootScope.$new();
    }));

    it('should do something', inject(function($compile) {
        element = $compile('<task-local-links></task-local-links>')(scope);
        scope.$digest();
        expect(true).toBe(true);
    }));
});