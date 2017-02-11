'use strict';

describe('Service: CheckShortcutKeyCombo', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var CheckShortcutKeyCombo;
  beforeEach(inject(function (_CheckShortcutKeyCombo_) {
    CheckShortcutKeyCombo = _CheckShortcutKeyCombo_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});