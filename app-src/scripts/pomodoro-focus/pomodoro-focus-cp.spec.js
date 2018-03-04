'use strict';

describe('Component: pomodoroFocus', () => {

    // load the directive's module
    beforeEach(module('superProductivity'));
    beforeEach(module('templates'));

    let element;
    let scope;

    beforeEach(inject(($rootScope) => {
        scope = $rootScope.$new();
    }));

    it('should do something', inject(($compile) => {
        element = $compile('<pomodoro-focus></pomodoro-focus>')(scope);
        scope.$digest();
        expect(true).toBe(true);
    }));
});