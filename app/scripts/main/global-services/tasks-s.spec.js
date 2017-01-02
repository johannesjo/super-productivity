'use strict';

describe('Service: Tasks', function() {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    var Tasks;
    beforeEach(inject(function(_Tasks_) {
        Tasks = _Tasks_;
      }));

    it('should be defined', function() {
        expect(true).toBe(true);
      });

  });
