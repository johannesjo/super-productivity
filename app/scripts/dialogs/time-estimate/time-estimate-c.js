/**
 * @ngdoc function
 * @name superProductivity.controller:TimeEstimateCtrl
 * @description
 * # TimeEstimateCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('TimeEstimateCtrl', TimeEstimateCtrl);

  /* @ngInject */
  function TimeEstimateCtrl($mdDialog, task, Tasks, $window) {
    let vm = this;
    const moment = $window.moment;

    // TODO refactor and add to Tasks.service
    vm.todayStr = Tasks.constructor.getTodayStr();
    vm.task = task;
    vm.timeEstimate = task.timeEstimate && moment.duration(task.timeEstimate);
    vm.showAddForAnotherDayForm = false;

    if (!task.timeSpentOnDay) {
      task.timeSpentOnDay = {};
    }

    // create copy in case nothing is save
    vm.timeSpentOnDayCopy = angular.copy(task.timeSpentOnDay);

    // clean empty
    for (let key in vm.timeSpentOnDay) {
      // if no real value
      if (!task.timeSpentOnDay[key]) {
        delete task.timeSpentOnDay[key];
      }
    }

    // assign a key for today
    if (!vm.timeSpentOnDayCopy[vm.todayStr]) {
      vm.timeSpentOnDayCopy[vm.todayStr] = null;
    }

    vm.deleteValue = (strDate) => {
      delete vm.timeSpentOnDayCopy[strDate];
    };

    vm.addNewEntry = (newEntry) => {
      let strDate = Tasks.formatToWorklogDateStr(newEntry.date);
      vm.timeSpentOnDayCopy[strDate] = angular.copy(newEntry.timeSpent);

      // unset afterwards
      newEntry.timeSpent = undefined;
      newEntry.date = undefined;
      vm.showAddForAnotherDayForm = false;
    };

    vm.submit = (estimate) => {

      let totalTimeSpent = moment.duration();
      for (let key in vm.timeSpentOnDayCopy) {
        if (vm.timeSpentOnDayCopy[key]) {
          totalTimeSpent.add(moment.duration(vm.timeSpentOnDayCopy[key]));
        }
      }

      // finally assign back to task
      task.timeEstimate = estimate;
      task.timeSpent = totalTimeSpent;
      task.timeSpentOnDay = vm.timeSpentOnDayCopy;

      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };
  }
})();
