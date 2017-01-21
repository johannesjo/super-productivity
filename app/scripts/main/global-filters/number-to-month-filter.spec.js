'use strict';

describe('Filter: numberToMonth', function() {

    // load the filter's module
    beforeEach(module('superProductivity'));

    // initialize a new instance of the filter before each test
    var numberToMonth;
    beforeEach(inject(function ($filter) {
        numberToMonth = $filter('numberToMonth');
    }));

    it('should change some output:"', function() {
        // var text = 'angularjs';
        // expect(numberToMonth(text)).toBe('something else');
        expect(true).toBe(true);

    });

});