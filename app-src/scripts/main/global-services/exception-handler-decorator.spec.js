'use strict';

describe('Decorator: ExceptionHandlerDecorator', () => {
    // load the service's module
    beforeEach(module('superProductivity'));

    // instantiate service
    let ExceptionHandlerDecorator;
    beforeEach(inject(function (_ExceptionHandlerDecorator_) {
        ExceptionHandlerDecorator = _ExceptionHandlerDecorator_;
    }));

    it('should be defined', () => {
        expect(true).toBe(true);
    });

});