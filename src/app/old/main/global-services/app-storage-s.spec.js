'use strict';

describe('Service: AppStorage', () => {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    let AppStorage;
    beforeEach(inject((_AppStorage_) => {
        AppStorage = _AppStorage_;
    }));

    it('should be defined', () => {
        expect(true).toBe(true);
    });

});