/**
 * @ngdoc function
 * @name superProductivity.controller:SimpleTaskSummaryCtrl
 * @description
 * # SimpleTaskSummaryCtrl
 * Controller of the superProductivity
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .controller('SimpleTaskSummaryCtrl', SimpleTaskSummaryCtrl);

  /* @ngInject */
  function SimpleTaskSummaryCtrl($mdDialog, tasks, settings, TasksUtil, $scope) {
    let vm = this;

    vm.options = settings;

    if (!vm.options.separateBy) {
      vm.options.separateBy = '';
    }
    if (!vm.options.separateFieldsBy) {
      vm.options.separateFieldsBy = '';
    }

    function formatLine() {
    }

    function createTasksText(tasks) {
      let tasksTxt = '';
      let newLineSeparator = '\n';

      if (tasks) {
        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          if ((!vm.options.isListDoneOnly || task.isDone) && (!vm.options.isWorkedOnTodayOnly || TasksUtil.isWorkedOnToday(task))) {
            tasksTxt += task.title + vm.options.separateBy;
            if (vm.options.isUseNewLine) {
              tasksTxt += newLineSeparator;
            }
          }

          if (vm.options.isListSubTasks && task.subTasks) {
            for (let j = 0; j < task.subTasks.length; j++) {
              let subTask = task.subTasks[j];
              if ((!vm.options.isListDoneOnly || subTask.isDone) && (!vm.options.isWorkedOnTodayOnly || TasksUtil.isWorkedOnToday(subTask))) {
                tasksTxt += subTask.title + vm.options.separateBy;
                if (vm.options.isUseNewLine) {
                  tasksTxt += newLineSeparator;
                }
              }
            }
          }
        }
      }
      // cut off last separator
      tasksTxt = tasksTxt.substring(0, tasksTxt.length - vm.options.separateBy.length);
      if (vm.options.isUseNewLine) {
        tasksTxt = tasksTxt.substring(0, tasksTxt.length - newLineSeparator.length);
      }

      if (vm.options.regExToRemove) {
        vm.isInvalidRegEx = false;
        try {
          const regEx = new RegExp(vm.options.regExToRemove, 'g');
          tasksTxt = tasksTxt.replace(regEx, '');
        } catch (e) {
          vm.isInvalidRegEx = true;
        }
      }

      return tasksTxt;
    }

    vm.tasksTxt = createTasksText(tasks);

    $scope.$watch('vm.options', () => {
      vm.tasksTxt = createTasksText(tasks);
    }, true);

    vm.submit = () => {
      $mdDialog.hide();
    };

    vm.cancel = () => {
      $mdDialog.hide();
    };
  }
})();
