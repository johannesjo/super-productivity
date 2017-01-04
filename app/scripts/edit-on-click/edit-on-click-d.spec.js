'use strict';

describe('Directive: editOnClick', function() {

    // load the directive's module
    beforeEach(module('superProductivity'));
    beforeEach(module('templates'));

    var element,
        scope;

    beforeEach(inject(function($rootScope) {
        scope = $rootScope.$new();
    }));

    it('should do something', inject(function($compile) {
        element = $compile('<edit-on-click></edit-on-click>')(scope);
        scope.$digest();
        expect(true).toBe(true);
    }));
});