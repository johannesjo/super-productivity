'use strict';

describe('Service: PomodoroButton', () => {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    let PomodoroButton;
    beforeEach(inject((_PomodoroButton_) => {
        PomodoroButton = _PomodoroButton_;
    }));

    it('should be defined', () => {
        expect(true).toBe(true);
    });

});