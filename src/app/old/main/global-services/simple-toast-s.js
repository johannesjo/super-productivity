/**
 * @ngdoc service
 * @name superProductivity.SimpleToast
 * @description
 * # SimpleToast
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  const MINIMAL_TIMEOUT_DURATION = 10;

  angular
    .module('superProductivity')
    .service('SimpleToast', SimpleToast);

  /* @ngInject */
  function SimpleToast($mdToast) {
    const DEFAULT_HIDE_DELAY = 4000;

    return (textContent, type, hideDelay, icon) => {
      // allow to omit hideDelay when specifying an icon
      if (angular.isString(hideDelay)) {
        icon = hideDelay;
        hideDelay = DEFAULT_HIDE_DELAY;
      }

      if (!type) {
        setTimeout(() => {
          $mdToast.show($mdToast.simple()
            .textContent(textContent)
            .capsule(false)
            .hideDelay(hideDelay || DEFAULT_HIDE_DELAY)
            .position('bottom'));
        }, MINIMAL_TIMEOUT_DURATION);
      } else {
        let iconColor;

        // allow for type to be first
        if ([
            'SUCCESS',
            'ERROR',
            'WARNING',
            'INFO',
            'CUSTOM'
          ].indexOf(textContent) > -1) {
          const tmpType = textContent;
          textContent = type;
          type = tmpType;
        }

        switch (type) {
          case 'SUCCESS':
            icon = icon || 'check_circle';
            iconColor = '#4fa758';
            break;
          case 'WARNING':
            icon = icon || 'warning';
            iconColor = '#e1e048';
            break;
          case 'ERROR':
            icon = icon || 'error';
            iconColor = '#e15d63';
            break;
          case 'CUSTOM':
            break;
          default:
            icon = icon || 'info';
        }

        setTimeout(() => {
          $mdToast.show({
            template: `
<md-toast>
  <div class="md-toast-content">
    <div class="icon-wrapper">
      <ng-md-icon icon="${icon}" ${iconColor && 'style="fill:' + iconColor + '"'}></ng-md-icon>
    </div>
    <div class="toast-text">${textContent}</div>
  </div>
</md-toast>
          `,
            hideDelay: hideDelay || DEFAULT_HIDE_DELAY
          });
        }, MINIMAL_TIMEOUT_DURATION);

      }
    };
  }

})();
