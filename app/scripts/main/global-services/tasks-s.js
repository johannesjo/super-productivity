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
  function Tasks($localStorage, Uid, $window, $rootScope, Dialogs, IS_ELECTRON, SimpleToast, ShortSyntax) {
    const IPC_EVENT_IDLE = 'WAS_IDLE';
    const IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT = 'UPDATE_TIME_SPEND';
    const IPC_EVENT_CURRENT_TASK_UPDATED = 'CHANGED_CURRENT_TASK';
    const moment = $window.moment;

    // SETUP HANDLERS FOR ELECTRON EVENTS
    if (IS_ELECTRON) {
      let that = this;

      // handler for time spent tracking
      window.ipcRenderer.on(IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT, (ev, timeSpent) => {
        // only track if there is a task
        if ($rootScope.r.currentTask) {
          let timeSpentCalculatedTotal;
          let timeSpentCalculatedOnDay;

          // use mysql date as it is sortable
          let todayStr = getTodayStr();

          // track total time spent
          if ($rootScope.r.currentTask.timeSpent) {
            timeSpentCalculatedTotal = moment.duration($rootScope.r.currentTask.timeSpent);
            timeSpentCalculatedTotal.add(moment.duration({ milliseconds: timeSpent }));
          } else {
            timeSpentCalculatedTotal = moment.duration(timeSpent);
          }

          // track time spent on days
          if (!$rootScope.r.currentTask.timeSpentOnDay) {
            $rootScope.r.currentTask.timeSpentOnDay = {};
          }

          if ($rootScope.r.currentTask.timeSpentOnDay[todayStr]) {
            timeSpentCalculatedOnDay = moment.duration($rootScope.r.currentTask.timeSpentOnDay[todayStr]);
            timeSpentCalculatedOnDay.add(moment.duration({ milliseconds: timeSpent }));
          } else {
            timeSpentCalculatedOnDay = moment.duration(timeSpent);
          }

          // assign values
          $rootScope.r.currentTask.timeSpent = timeSpentCalculatedTotal;
          $rootScope.r.currentTask.timeSpentOnDay[todayStr] = timeSpentCalculatedOnDay;

          $rootScope.r.currentTask.lastWorkedOn = moment();

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
    function getTodayStr() {
      return moment().format('YYYY-MM-DD');
    }

    function checkDupes(tasksArray) {
      if (tasksArray) {
        let valueArr = tasksArray.map(function (item) {
          return item.id;
        });
        let dupeIds = [];
        let hasDupe = valueArr.some(function (item, idx) {
          if (valueArr.indexOf(item) !== idx) {
            dupeIds.push(item);
          }
          return valueArr.indexOf(item) !== idx;
        });
        if (dupeIds.length) {
          let firstDupe = $window._.find(tasksArray, (task) => {
            return dupeIds.indexOf(task.id) > -1;
          });
          console.log(firstDupe);

          SimpleToast('!!! Dupes detected in data for the ids: ' + dupeIds.join(', ') + '. First task title is "' + firstDupe.title + '" !!!', 60000);
        }
        return hasDupe;
      }
    }

    this.calcTotalEstimate = (tasks) => {
      let totalEstimate;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalEstimate = moment.duration();

        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          totalEstimate.add(task.timeEstimate);
        }
      }
      return totalEstimate;
    };

    this.calcTotalTimeSpent = (tasks) => {
      let totalTimeSpent;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalTimeSpent = moment.duration();

        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          if (task && task.timeSpent) {
            totalTimeSpent.add(task.timeSpent);
          }
        }
      }
      return totalTimeSpent;
    };

    this.calcRemainingTime = (tasks) => {
      let totalRemaining;
      if (angular.isArray(tasks) && tasks.length > 0) {
        totalRemaining = moment.duration();

        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          if (task) {
            if (task.timeSpent && task.timeEstimate) {
              let timeSpentMilliseconds = moment.duration(task.timeSpent).asMilliseconds();
              let timeEstimateMilliseconds = moment.duration(task.timeEstimate).asMilliseconds();
              if (timeSpentMilliseconds < timeEstimateMilliseconds) {
                totalRemaining.add(moment.duration({ milliseconds: timeEstimateMilliseconds - timeSpentMilliseconds }));
              }
            } else if (task.timeEstimate) {
              totalRemaining.add(task.timeEstimate);
            }
          }
        }
      }
      return totalRemaining;

    };

    // GET DATA
    this.getCurrent = () => {
      let currentTask;
      let subTaskMatch;

      // TODO check if this is even required
      if ($localStorage.currentTask) {
        currentTask = $window._.find($localStorage.tasks, (task) => {
          if (task.subTasks) {
            let subTaskMatchTmp = $window._.find(task.subTasks, { id: $localStorage.currentTask.id });
            if (subTaskMatchTmp) {
              subTaskMatch = subTaskMatchTmp;
            }
          }
          return task.id === $localStorage.currentTask.id;
        });

        $localStorage.currentTask = $rootScope.r.currentTask = currentTask || subTaskMatch;
      }
      return $rootScope.r.currentTask;
    };

    this.getById = (taskId) => {
      return $window._.find($rootScope.r.tasks, ['id', taskId]) || $window._.find($rootScope.r.backlogTasks, ['id', taskId]) || $window._.find($rootScope.r.doneBacklogTasks, ['id', taskId]);
    };

    this.getBacklog = () => {
      checkDupes($localStorage.backlogTasks);
      return $localStorage.backlogTasks;
    };

    this.getDoneBacklog = () => {
      checkDupes($localStorage.doneBacklogTasks);
      return $localStorage.doneBacklogTasks;
    };

    this.getToday = () => {
      checkDupes($localStorage.tasks);
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
        totalTimeWorkedToday = moment.duration();
        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          if (task.timeSpentOnDay && task.timeSpentOnDay[todayStr]) {
            totalTimeWorkedToday.add(task.timeSpentOnDay[todayStr]);
          }
        }
      }
      return totalTimeWorkedToday;
    };

    // UPDATE DATA
    this.updateCurrent = (task, isCallFromTimeTracking) => {
      // calc progress
      if (task && task.timeSpent && task.timeEstimate) {
        if (moment.duration().format && angular.isFunction(moment.duration().format)) {
          task.progress = parseInt(moment.duration(task.timeSpent)
              .format('ss') / moment.duration(task.timeEstimate).format('ss') * 100, 10);
        }
      }

      // check if in electron context
      if (window.isElectron) {
        if (!isCallFromTimeTracking) {
          if (task && task.originalKey) {
            //Jira.markAsInProgress(task);
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

    this.updateTimeSpentToday = (task, val) => {
      // add when set and not equal to current value
      if (val) {
        let todayStr = getTodayStr();
        task.lastWorkedOn = moment();
        task.timeSpentOnDay = {};
        task.timeSpentOnDay[todayStr] = val;
      } else {
        // remove when unset
        task.timeSpentOnDay = {};
        if (task.lastWorkedOn) {
          delete task.lastWorkedOn;
        }
        if (task.timeSpentOnDay) {
          delete task.timeSpentOnDay;
        }
      }
    };

    this.addToday = (task) => {
      if (task && task.title) {
        $localStorage.tasks.push(this.createTask(task));

        // update global pointer for today tasks
        $rootScope.r.tasks = $localStorage.tasks;

        return true;
      }
    };

    this.createTask = (task) => {
      let transformedTask = {
        title: task.title,
        id: Uid(),
        created: moment(),
        notes: task.notes,
        parentId: task.parentId,
        timeEstimate: task.timeEstimate || task.originalEstimate,
        timeSpent: task.timeSpent || task.originalTimeSpent,
        originalId: task.originalId,
        originalKey: task.originalKey,
        originalType: task.originalType,
        originalLink: task.originalLink,
        originalStatus: task.originalStatus,
        originalEstimate: task.originalEstimate,
        originalTimeSpent: task.originalTimeSpent,
        originalAttachment: task.originalAttachment,
        originalComments: task.originalComments,
        originalUpdated: task.originalUpdated
      };
      return ShortSyntax(transformedTask);
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
