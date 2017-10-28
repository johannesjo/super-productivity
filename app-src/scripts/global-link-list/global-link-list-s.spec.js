'use strict';

describe('Service: GlobalLinkList', function() {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    var GlobalLinkList;
    beforeEach(inject(function (_GlobalLinkList_) {
        GlobalLinkList = _GlobalLinkList_;
    }));

    it('should be defined', function() {
        expect(true).toBe(true);
    });

});