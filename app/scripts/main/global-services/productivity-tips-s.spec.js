'use strict';

describe('Service: ProductivityTips', function() {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    var ProductivityTips;
    beforeEach(inject(function (_ProductivityTips_) {
        ProductivityTips = _ProductivityTips_;
    }));

    it('should be defined', function() {
        expect(true).toBe(true);
    });

});