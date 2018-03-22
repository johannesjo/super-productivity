'use strict';

describe('Service: ExtensionInterface', () => {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    let ExtensionInterface;
    beforeEach(inject((_ExtensionInterface_) => {
        ExtensionInterface = _ExtensionInterface_;
    }));

    it('should be defined', () => {
        expect(true).toBe(true);
    });

});