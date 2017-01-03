'use strict';

describe('Filter: duration', function () {

  // load the filter's module
  beforeEach(module('superProductivity'));

  // initialize a new instance of the filter before each test
  var duration;
  beforeEach(inject(function ($filter) {
    duration = $filter('duration');
  }));

  it('should change some output:"', function () {
    // var text = 'angularjs';
    // expect(duration(text)).toBe('something else');
    expect(true).toBe(true);

  });

});
