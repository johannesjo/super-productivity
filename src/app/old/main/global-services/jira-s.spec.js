'use strict';

describe('Service: Jira', function () {
  // load the service's module
  beforeEach(module('superProductivity'));

  // instantiate service
  var Jira;
  beforeEach(inject(function (_Jira_) {
    Jira = _Jira_;
  }));

  it('should be defined', function () {
    expect(true).toBe(true);
  });

});