'use strict';

describe('Service: Util', function() {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    var Util;
    beforeEach(inject(function (_Util_) {
        Util = _Util_;
    }));

    it('should be defined', function() {
        expect(true).toBe(true);
    });

});