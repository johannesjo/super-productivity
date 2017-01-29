/**
 * @ngdoc service
 * @name superProductivity.SimpleToast
 * @description
 * # SimpleToast
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('SimpleToast', SimpleToast);

  /* @ngInject */
  function SimpleToast($mdToast) {
    const DEFAULT_HIDE_DELAY = 4000;

    return (textContent, type, hideDelay) => {

      if (!type) {
        return $mdToast.show($mdToast.simple()
          .textContent(textContent)
          .capsule(false)
          .hideDelay(hideDelay || DEFAULT_HIDE_DELAY)
          .position('bottom'));
      } else {
        let icon;
        let iconColor;

        if ([
            'SUCCESS',
            'ERROR'
          ].indexOf(textContent) > -1) {
          const tmpType = textContent;
          textContent = type;
          type = tmpType;
        }

        if (type === 'SUCCESS') {
          icon = 'check_circle';
          iconColor = '#4fa758';
        }
        else if (type === 'ERROR') {
          icon = 'error';
          iconColor = '#e15d63';
        }

        return $mdToast.show({
          template: `
<md-toast>
<div class="md-toast-content">
<div><ng-md-icon icon="${icon}" ${iconColor && 'style="fill:' + iconColor + '"'}></ng-md-icon>
${textContent} 
</div>
</div>          
</md-toast>
          `,
          hideDelay: hideDelay || DEFAULT_HIDE_DELAY
        });
      }
    };
  }

})();
