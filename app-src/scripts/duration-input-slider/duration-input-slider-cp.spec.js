'use strict';

describe('Component: durationInputSlider', () => {

    // load the directive's module
    beforeEach(module('superProductivity'));
    beforeEach(module('templates'));

    let element;
    let scope;

    beforeEach(inject(($rootScope) => {
        scope = $rootScope.$new();
    }));

    it('should do something', inject(($compile) => {
        element = $compile('<duration-input-slider></duration-input-slider>')(scope);
        scope.$digest();
        expect(true).toBe(true);
    }));
});