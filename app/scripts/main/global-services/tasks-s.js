/**
 * @ngdoc service
 * @name superProductivity.Tasks
 * @description
 * # Tasks
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Tasks', Tasks);

  /* @ngInject */
  function Tasks($localStorage, $q, $window, $rootScope, Dialogs) {
    const IPC_EVENT_IDLE = 'WAS_IDLE';
    const IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT = 'UPDATE_TIME_SPEND';

    $localStorage.$default({
      currentTask: null,
      tasks: [],
      backlogTasks: []
    });

    // SETUP HANDLERS FOR ELECTRON EVENTS
    if (angular.isDefined(window.ipcRenderer)) {

      // handler for time spend tracking
      window.ipcRenderer.on(IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT, (ev, timeSpend) => {
        // only track if there is a task
        if ($rootScope.r.currentTask) {
          let timeSpendCalculatedTotal;
          let timeSpendCalculatedOnDay;

          // use mysql date as it is sortable
          let todayStr = $window.moment().format('YYYY-MM-DD');

          // track total time spend
          if ($rootScope.r.currentTask.timeSpend) {
            timeSpendCalculatedTotal = $window.moment.duration($rootScope.r.currentTask.timeSpend);
            timeSpendCalculatedTotal.add($window.moment.duration({ milliseconds: timeSpend }));
          } else {
            timeSpendCalculatedTotal = $window.moment.duration(timeSpend);
          }

          // track time spend on days
          if (!$rootScope.r.currentTask.timeSpendOnDay) {
            $rootScope.r.currentTask.timeSpendOnDay = {};
          }

          if ($rootScope.r.currentTask.timeSpendOnDay[todayStr]) {
            timeSpendCalculatedOnDay = $window.moment.duration($rootScope.r.currentTask.timeSpendOnDay[todayStr]);
            timeSpendCalculatedOnDay.add($window.moment.duration({ milliseconds: timeSpend }));
          } else {
            timeSpendCalculatedOnDay = $window.moment.duration(timeSpend);
          }

          // assign values
          $rootScope.r.currentTask.timeSpend = timeSpendCalculatedTotal;
          $rootScope.r.currentTask.timeSpendOnDay[todayStr] = timeSpendCalculatedOnDay;

          $rootScope.r.currentTask.lastWorkedOn = $window.moment();

          // we need to manually call apply as this is an outside event
          $rootScope.$apply();
        }
      });

      // handler for idle event
      window.ipcRenderer.on(IPC_EVENT_IDLE, (ev, idleTime) => {
        Dialogs('WAS_IDLE', { idleTime: idleTime });
      });
    }


    // GET DATA
    this.getCurrent = () => {
      let currentTask;
      if ($localStorage.currentTask) {
        currentTask = $window._.find($localStorage.tasks, { id: $localStorage.currentTask.id });
        $localStorage.currentTask = $rootScope.r.currentTask = currentTask;
      }
      return $q.when($rootScope.r.currentTask);
    };

    this.getBacklog = () => {
      return $q.when($localStorage.backlogTasks);
    };

    this.getDoneBacklog = () => {
      return $q.when($localStorage.doneBacklogTasks);
    };

    this.getToday = () => {
      return $q.when($localStorage.tasks);
    };

    this.getUndoneToday = () => {
      let tasks = $window._.filter($localStorage.tasks, (task) => {
        return task && !task.isDone;
      });

      return $q.when(tasks);
    };

    // UPDATE DATA
    this.updateCurrent = (task) => {

      // fix for when data messes up
      if (angular.isArray(task) && task[0]) {
        $localStorage.currentTask = task[0];
      } else {
        $localStorage.currentTask = task;
      }

      // update global pointer
      $rootScope.r.currentTask = $localStorage.currentTask;

      return $q.when({});
    };

    this.updateToday = (tasks) => {
      $localStorage.tasks = tasks;

      // update global pointer
      $rootScope.r.tasks = $localStorage.tasks;

      return $q.when({});
    };

    this.updateBacklog = (tasks) => {
      $localStorage.backlogTasks = tasks;

      // update global pointer
      $rootScope.r.backlogTasks = $localStorage.backlogTasks;

      return $q.when({});
    };

    this.addTasksToTopOfBacklog = (tasks) => {
      $localStorage.backlogTasks = tasks.concat($localStorage.backlogTasks);

      // update global pointer
      $rootScope.r.backlogTasks = $localStorage.backlogTasks;

      return $q.when({});
    };

    this.updateDoneBacklog = (tasks) => {
      $localStorage.doneBacklogTasks = tasks;

      // update global pointer
      $rootScope.r.doneBacklogTasks = $localStorage.doneBacklogTasks;

      return $q.when({});
    };

    this.addDoneTasksToDoneBacklog = (tasks) => {
      let doneTasks = $window._.filter($localStorage.tasks, (task) => {
        return task.isDone === true;
      });

      $localStorage.doneBacklogTasks = doneTasks.concat($localStorage.doneBacklogTasks);

      // update global pointer
      $rootScope.r.doneBacklogTasks = $localStorage.doneBacklogTasks;

      return $q.when({});
    };

    this.finishDay = (clearDoneTasks, moveUnfinishedToBacklog) => {
      if (clearDoneTasks) {

        // move to done backlog
        this.addTasksToDoneBacklog(vm.doneTasks).then(() => {

          //move unfinished to backlog
          if (moveUnfinishedToBacklog) {
            // move tasks to top of backlog
            this.addTasksToTopOfBacklog(vm.undoneTasks).then(() => {
              // empty today
              this.updateToday([]).then(() => {
                // finally
              });
            });

          } else {
            // update todays task to only contain unfinished tasks
            this.updateToday(vm.undoneTasks).then(() => {
              // finally

            });
          }

        });
      } else {
        //move unfinished to backlog
        if (moveUnfinishedToBacklog) {
          this.updateToday(vm.doneTasks).then(() => {
            // finally
          });
        }
      }
    };
  }

})();
