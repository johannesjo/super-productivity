/**
 * @ngdoc function
 * @name superProductivity.controller:TimeEstimateCtrl
 * @description
 * # TimeEstimateCtrl
 * Controller of the superProductivity
 */
import moment from 'moment';

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .controller('TimeEstimateCtrl', TimeEstimateCtrl);

  /* @ngInject */
  function TimeEstimateCtrl($mdDialog, task, Tasks, TasksUtil, $window, theme, $scope) {
    let vm = this;
    vm.theme = theme;

    // TODO refactor and add to Tasks.service
    vm.todayStr = TasksUtil.getTodayStr();
    vm.task = task;
    vm.timeEstimate = task.timeEstimate && moment.duration(task.timeEstimate);
    vm.showAddForAnotherDayForm = false;

    if (!task.timeSpentOnDay) {
      task.timeSpentOnDay = {};
    }

    // create copy in case nothing is save
    vm.timeSpentOnDayCopy = angular.copy(task.timeSpentOnDay);

    // assign a key for today
    if (!vm.timeSpentOnDayCopy[vm.todayStr]) {
      vm.timeSpentOnDayCopy[vm.todayStr] = undefined;
    }

    vm.deleteValue = (strDate) => {
      delete vm.timeSpentOnDayCopy[strDate];
    };

    vm.addNewEntry = (newEntry) => {
      let strDate = TasksUtil.formatToWorklogDateStr(newEntry.date);
      vm.timeSpentOnDayCopy[strDate] = angular.copy(newEntry.timeSpent);

      // unset afterwards
      newEntry.timeSpent = undefined;
      newEntry.date = undefined;
      vm.showAddForAnotherDayForm = false;
    };

    vm.submit = (estimate) => {
      // finally assign back to task
      Tasks.updateEstimate(task, estimate);
      Tasks.updateTimeSpentOnDay(task, vm.timeSpentOnDayCopy);
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.cancel();
    };

    const update = () => {
      const totalTimeSpent = TasksUtil.calcTotalTimeSpentOnTask({
        timeSpentOnDay: vm.timeSpentOnDayCopy
      });

      if (totalTimeSpent) {
        vm.timeSpentOnOtherDaysTotal = moment.duration(totalTimeSpent)
          .subtract(vm.timeSpentOnDayCopy[vm.todayStr]);
      }

      if (vm.timeSpentOnOtherDaysTotal && vm.timeSpentOnOtherDaysTotal._milliseconds === 0) {
        vm.timeSpentOnOtherDaysTotal = undefined;
      }

      vm.progress = TasksUtil.calcProgress({
        timeSpent: totalTimeSpent,
        timeEstimate: vm.timeEstimate,
      });
    };

    update();

    const timeSpentOnDayWatcher = $scope.$watch('vm.timeSpentOnDayCopy', update, true);
    const timeEstimateWatcher = $scope.$watch('vm.timeEstimate', update, true);

    $scope.$on('$destroy', () => {
      // remove watchers manually
      timeSpentOnDayWatcher();
      timeEstimateWatcher();
    });
  }

})();
