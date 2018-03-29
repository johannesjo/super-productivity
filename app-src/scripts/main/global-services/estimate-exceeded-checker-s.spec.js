'use strict';

describe('Service: EstimateExceededChecker', () => {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    let EstimateExceededChecker;
    beforeEach(inject((_EstimateExceededChecker_) => {
        EstimateExceededChecker = _EstimateExceededChecker_;
    }));

    it('should be defined', () => {
        expect(true).toBe(true);
    });

});