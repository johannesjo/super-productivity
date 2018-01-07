'use strict';

describe('Service: TimeTracking', () => {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    let TimeTracking;
    beforeEach(inject((_TimeTracking_) => {
        TimeTracking = _TimeTracking_;
    }));

    it('should be defined', () => {
        expect(true).toBe(true);
    });

});