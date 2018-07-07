/**
 * @ngdoc function
 * @name superProductivity.decorator:LastActionDecorator
 * @description
 * # LastActionDecorator
 * Decorator of the superProductivity. Used having a valid pointer to when
 * the last relevant action occurred.
 */

(() => {
  'use strict';

  const CFG = [
    {
      svcName: 'Tasks',
      methods: [
        'createTask',
        'markAsDone',
        'addTimeSpent',
        'addNewToTopOfBacklog',
        'moveTask',
        'finishDay',
        'addLocalAttachment',
      ]
    },
    {
      svcName: 'Projects',
      methods: [
        'createNew',
        'updateProjectData',
        'updateProjectTitle',
      ]
    }
  ];

  CFG.forEach((entry) => {
    function LastActionDecorator($provide) {
      $provide.decorator(entry.svcName, ($delegate, $injector) => {
        entry.methods.forEach((methodName) => {
          const origFn = $delegate[methodName];
          $delegate[methodName] = function() {
            const $rootScope = $injector.get('$rootScope');
            if ($rootScope.r) {
              $rootScope.r.lastActiveTime = new Date();
            }
            return origFn.apply($delegate, arguments);
          };
        });

        return $delegate;
      });
    }

    angular
      .module('superProductivity')
      .config(LastActionDecorator);

  });

})();
