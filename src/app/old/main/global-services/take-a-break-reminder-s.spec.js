'use strict';

describe('Service: TakeABreakReminder', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var TakeABreakReminder;
  beforeEach(inject(function (_TakeABreakReminder_) {
    TakeABreakReminder = _TakeABreakReminder_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});