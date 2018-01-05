'use strict';

describe('Component: distractionList', () => {

    // load the directive's module
    beforeEach(module('superProductivity'));
    beforeEach(module('templates'));

    let element;
    let scope;

    beforeEach(inject(($rootScope) => {
        scope = $rootScope.$new();
    }));

    it('should do something', inject(($compile) => {
        element = $compile('<distraction-list></distraction-list>')(scope);
        scope.$digest();
        expect(true).toBe(true);
    }));
});