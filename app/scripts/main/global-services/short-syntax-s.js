/**
 * @ngdoc service
 * @name superProductivity.ShortSyntax
 * @description
 * # ShortSyntax
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('ShortSyntax', ShortSyntax);

  /* @ngInject */
  function ShortSyntax(ParseDuration, $localStorage) {

    const timeEstimateRegExp = / t[0-9]+(m|h|d)+ *$/i;

    return (task) => {
      if ($localStorage.config && $localStorage.config.isShortSyntaxEnabled) {
        if (!task.originalKey && !task.timeEstimate && !task.subTasks) {
          let matches = timeEstimateRegExp.exec(task.title);

          if (matches) {
            task.timeEstimate = ParseDuration.fromString(matches[0].replace(' t', ''));
            task.title = task.title.replace(matches[0], '');
          }
        }
      }
      return task;
    };
  }
})();
