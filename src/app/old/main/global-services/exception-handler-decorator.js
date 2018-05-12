/**
 * @ngdoc function
 * @name superProductivity.decorator:ExceptionHandlerDecorator
 * @description
 * # ExceptionHandlerDecorator
 * Decorator of the superProductivity
 */

(() => {
  'use strict';

  angular
    .module('superProductivity')
    .config(ExceptionHandlerDecorator);

  function ExceptionHandlerDecorator($provide) {
    $provide.decorator('$exceptionHandler', ($delegate, $injector) => {
      return (exception, cause) => {
        const SimpleToast = $injector.get('SimpleToast');
        SimpleToast('ERROR', 'Unknown Error: ' + exception);
        $delegate(exception, cause);
      };
    });
  }
})();
