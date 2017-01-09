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
  function Tasks($localStorage, Uid, $window, $rootScope, Dialogs, Jira) {
    const IPC_EVENT_IDLE = 'WAS_IDLE';
    const IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT = 'UPDATE_TIME_SPEND';
    const IPC_EVENT_CURRENT_TASK_UPDATED = 'CHANGED_CURRENT_TASK';

    // SETUP HANDLERS FOR ELECTRON EVENTS
    if (angular.isDefined(window.ipcRenderer)) {
      let that = this;

      // handler for time spend tracking
      window.ipcRenderer.on(IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT, (ev, timeSpend) => {
        // only track if there is a task
        if ($rootScope.r.currentTask) {
          let timeSpendCalculatedTotal;
          let timeSpendCalculatedOnDay;

          // use mysql date as it is sortable
          let todayStr = this.getTodayStr();

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

          that.updateCurrent($rootScope.r.currentTask, true);

          // we need to manually call apply as this is an outside event
          $rootScope.$apply();
        }
      });

      // handler for idle event
      window.ipcRenderer.on(IPC_EVENT_IDLE, (ev, idleTime) => {
        Dialogs('WAS_IDLE', { idleTime: idleTime });
      });
    }

    // UTILITY
    const getTodayStr = () => {
      return $window.moment().format('YYYY-MM-DD');
    };

    this.calcTotalEstimate = (tasks) => {
      let totalEstimate;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalEstimate = $window.moment.duration();

        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          totalEstimate.add(task.timeEstimate);
        }
      }
      return totalEstimate;
    };

    this.calcTotalTimeSpend = (tasks) => {
      let totalTimeSpend;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalTimeSpend = $window.moment.duration();

        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          if (task && task.timeSpend) {
            totalTimeSpend.add(task.timeSpend);
          }
        }
      }
      return totalTimeSpend;
    };

    // GET DATA
    this.getCurrent = () => {
      let currentTask;
      if ($localStorage.currentTask) {
        currentTask = $window._.find($localStorage.tasks, { id: $localStorage.currentTask.id });
        $localStorage.currentTask = $rootScope.r.currentTask = currentTask;
      }
      return $rootScope.r.currentTask;
    };

    this.getBacklog = () => {
      return $localStorage.backlogTasks;
    };

    this.getDoneBacklog = () => {
      return $localStorage.doneBacklogTasks;
    };

    this.getToday = () => {
      return $localStorage.tasks;
    };

    this.getUndoneToday = () => {
      return $window._.filter($localStorage.tasks, (task) => {
        return task && !task.isDone;
      });
    };

    this.getDoneToday = () => {
      return $window._.filter($localStorage.tasks, (task) => {
        return task && task.isDone;
      });
    };

    this.getTimeWorkedToday = () => {
      let tasks = this.getToday();
      let todayStr = getTodayStr();
      let totalTimeWorkedToday;
      if (tasks.length > 0) {
        totalTimeWorkedToday = $window.moment.duration();
        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          if (task.timeSpendOnDay && task.timeSpendOnDay[todayStr]) {
            totalTimeWorkedToday.add(task.timeSpendOnDay[todayStr]);
          }
        }
      }
      return totalTimeWorkedToday;
    };

    // UPDATE DATA
    this.updateCurrent = (task, isCallFromTimeTracking) => {
      // calc progress
      if (task && task.timeSpend && task.timeEstimate) {
        if ($window.moment.duration().format && angular.isFunction($window.moment.duration().format)) {
          task.progress = parseInt($window.moment.duration(task.timeSpend)
              .format('ss') / $window.moment.duration(task.timeEstimate).format('ss') * 100, 10);
        }
      }

      // check if in electron context
      if (window.isElectron) {
        if (!isCallFromTimeTracking) {
          if (task && task.originalKey) {
            Jira.markAsInProgress(task);
          }
        }

        if (task && task.title) {
          window.ipcRenderer.send(IPC_EVENT_CURRENT_TASK_UPDATED, task);
        }
      }

      $localStorage.currentTask = task;
      // update global pointer
      $rootScope.r.currentTask = $localStorage.currentTask;
    };

    this.updateTimeSpendToday = (task, val) => {
      let todayStr = getTodayStr();

      // add when set and not equal to current value
      if (val) {
        task.lastWorkedOn = $window.moment();
        task.timeSpendOnDay = {};
        task.timeSpendOnDay[todayStr] = val;
      } else {
        // remove when unset
        task.timeSpendOnDay = {};
        if (task.lastWorkedOn) {
          delete task.lastWorkedOn;
        }
        if (task.timeSpendOnDay) {
          delete task.timeSpendOnDay;
        }
      }
    };

    this.addToday = (task) => {
      if (task && task.title) {
        $localStorage.tasks.push({
          title: task.title,
          id: Uid(),
          created: $window.moment(),
          notes: task.notes,
          timeEstimate: task.timeEstimate || task.originalEstimate,
          timeSpend: task.timeSpend || task.originalTimeSpent,
          originalId: task.originalId,
          originalKey: task.originalKey,
          originalType: task.originalType,
          originalLink: task.originalLink,
          originalStatus: task.originalStatus,
          originalEstimate: task.originalEstimate,
          originalTimeSpent: task.originalTimeSpent
        });

        // update global pointer for today tasks
        $rootScope.r.tasks = $localStorage.tasks;

        return true;
      }
    };

    this.updateToday = (tasks) => {
      $localStorage.tasks = tasks;
      // update global pointer
      $rootScope.r.tasks = $localStorage.tasks;
    };

    this.updateBacklog = (tasks) => {
      $localStorage.backlogTasks = tasks;
      // update global pointer
      $rootScope.r.backlogTasks = $localStorage.backlogTasks;
    };

    this.addTasksToTopOfBacklog = (tasks) => {
      $localStorage.backlogTasks = tasks.concat($localStorage.backlogTasks);
      // update global pointer
      $rootScope.r.backlogTasks = $localStorage.backlogTasks;
    };

    this.updateDoneBacklog = (tasks) => {
      $localStorage.doneBacklogTasks = tasks;
      // update global pointer
      $rootScope.r.doneBacklogTasks = $localStorage.doneBacklogTasks;
    };

    this.addDoneTasksToDoneBacklog = () => {
      let doneTasks = this.getDoneToday().slice(0);
      $localStorage.doneBacklogTasks = doneTasks.concat($localStorage.doneBacklogTasks);
      // update global pointer
      $rootScope.r.doneBacklogTasks = $localStorage.doneBacklogTasks;
    };

    this.finishDay = (clearDoneTasks, moveUnfinishedToBacklog) => {
      if (clearDoneTasks) {
        // add tasks to done backlog
        this.addDoneTasksToDoneBacklog();
        // remove done tasks from today
        this.updateToday(this.getUndoneToday());
      }

      if (moveUnfinishedToBacklog) {
        this.addTasksToTopOfBacklog(this.getUndoneToday());
        if (clearDoneTasks) {
          this.updateToday([]);
        } else {
          this.updateToday(this.getDoneToday());
        }
      }

      // also remove the current task to prevent time tracking
      this.updateCurrent(null);
    };
  }

})();
