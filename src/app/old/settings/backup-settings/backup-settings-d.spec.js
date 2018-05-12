//'use strict';
//
//describe('Directive: backupSettings', () => {
//
//  // load the directive's module
//  beforeEach(module('superProductivity'));
//  beforeEach(module('templates'));
//
//  let element;
//  let scope;
//
//  beforeEach(inject(($rootScope) => {
//    scope = $rootScope.$new();
//  }));
//
//  describe('ctrl', () => {
//    let ctrl;
//    let dScope;
//
//    beforeEach(inject(($compile) => {
//      element = $compile('<backup-settings></backup-settings>')(scope);
//      scope.$digest();
//      ctrl = angular.element(element).controller('backupSettings');
//      dScope = element.isolateScope();
//      console.log(ctrl);
//    }));
//
//    describe('', () => {
//
//    });
//    it('', () => {
//      ctrl = sinon.stub();
//      console.log(ctrl);
//    });
//  });
//});