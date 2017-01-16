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
  function Tasks($localStorage, Uid, $window, $rootScope, Dialogs, IS_ELECTRON, $mdToast, SimpleToast, Notifier, ShortSyntax, ParseDuration) {
    const IPC_EVENT_IDLE = 'WAS_IDLE';
    const IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT = 'UPDATE_TIME_SPEND';
    const IPC_EVENT_CURRENT_TASK_UPDATED = 'CHANGED_CURRENT_TASK';
    const moment = $window.moment;

    let isShowTakeBreakNotification = true;

    // SETUP HANDLERS FOR ELECTRON EVENTS
    if (IS_ELECTRON) {
      let that = this;

      // handler for time spent tracking
      window.ipcRenderer.on(IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT, (ev, timeSpentInMs) => {
        // only track if there is a task
        if ($rootScope.r.currentTask) {

          that.updateTimeSpent($rootScope.r.currentTask, timeSpentInMs);
          that.updateCurrent($rootScope.r.currentTask, true);
          that.checkTakeToTakeABreak(timeSpentInMs);

          // we need to manually call apply as this is an outside event
          $rootScope.$apply();
        }
      });

      // handler for idle event
      window.ipcRenderer.on(IPC_EVENT_IDLE, (ev, idleTime) => {
        // do not show as long as the user hasn't decided
        isShowTakeBreakNotification = false;

        Dialogs('WAS_IDLE', { idleTime: idleTime })
          .then(() => {
            // if tracked
            this.checkTakeToTakeABreak(idleTime);
            isShowTakeBreakNotification = true;
          }, () => {
            // if not tracked
            // unset currentSession.timeWorkedWithoutBreak
            $rootScope.r.currentSession.timeWorkedWithoutBreak = undefined;
            isShowTakeBreakNotification = true;
          });
      });
    }

    this.checkTakeToTakeABreak = (timeSpentInMs) => {
      if ($rootScope.r.config.isTakeABreakEnabled) {
        if (!$rootScope.r.currentSession) {
          $rootScope.r.currentSession = {};
        }
        // add or create moment duration for timeWorkedWithoutBreak
        if ($rootScope.r.currentSession.timeWorkedWithoutBreak) {
          // convert to moment to be save
          $rootScope.r.currentSession.timeWorkedWithoutBreak = moment.duration($rootScope.r.currentSession.timeWorkedWithoutBreak);
          $rootScope.r.currentSession.timeWorkedWithoutBreak.add(moment.duration({ milliseconds: timeSpentInMs }));
        } else {
          $rootScope.r.currentSession.timeWorkedWithoutBreak = moment.duration(timeSpentInMs);
        }

        if (moment.duration($rootScope.r.config.takeABreakMinWorkingTime)
            .asSeconds() < $rootScope.r.currentSession.timeWorkedWithoutBreak.asSeconds()) {

          if (isShowTakeBreakNotification) {
            let toast = $mdToast.simple()
              .textContent('Take a break! You have been working for ' + ParseDuration.toString($rootScope.r.currentSession.timeWorkedWithoutBreak) + ' without one. Go away from the computer! Makes you more productive in the long run!')
              .action('I already did!')
              .position('bottom');
            $mdToast.show(toast).then(function (response) {
              if (response === 'ok') {
                // re-add task on undo
                $rootScope.r.currentSession.timeWorkedWithoutBreak = undefined;
              }
            });

            Notifier({
              title: 'Take a break!',
              message: 'Take a break! You have been working for ' + ParseDuration.toString($rootScope.r.currentSession.timeWorkedWithoutBreak) + ' without one. Go away from the computer! Makes you more productive in the long run!',
              sound: true,
              wait: true
            });
          }
        }
      }
    };

    this.updateTimeSpent = (task, timeSpentInMs) => {
      let timeSpentCalculatedTotal;
      let timeSpentCalculatedOnDay;

      // use mysql date as it is sortable
      let todayStr = getTodayStr();

      // if not set set started pointer
      if (!task.started) {
        task.started = moment();
      }
      // also set parent task to started if there is one
      if (task.parentId) {
        let parentTask = this.getById(task.parentId);
        if (!parentTask.started) {
          parentTask.started = moment();
        }
      }

      // track total time spent
      if (task.timeSpent) {
        timeSpentCalculatedTotal = moment.duration(task.timeSpent);
        timeSpentCalculatedTotal.add(moment.duration({ milliseconds: timeSpentInMs }));
      } else {
        timeSpentCalculatedTotal = moment.duration(timeSpentInMs);
      }

      // track time spent on days
      if (!task.timeSpentOnDay) {
        task.timeSpentOnDay = {};
      }
      if (task.timeSpentOnDay[todayStr]) {
        timeSpentCalculatedOnDay = moment.duration(task.timeSpentOnDay[todayStr]);
        timeSpentCalculatedOnDay.add(moment.duration({ milliseconds: timeSpentInMs }));
      } else {
        timeSpentCalculatedOnDay = moment.duration(timeSpentInMs);
      }

      // assign values
      task.timeSpent = timeSpentCalculatedTotal;
      task.timeSpentOnDay[todayStr] = timeSpentCalculatedOnDay;

      task.lastWorkedOn = moment();

      return task;
    };

    // UTILITY
    function getTodayStr() {
      return moment().format('YYYY-MM-DD');
    }

    function deleteNullValueTasks(tasksArray) {
      return tasksArray.filter(function (item) {
        return !!item;
      });
    }

    function checkDupes(tasksArray) {
      if (tasksArray) {
        deleteNullValueTasks(tasksArray);
        let valueArr = tasksArray.map(function (item) {
          return item && item.id;
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

    this.isWorkedOnToday = (task) => {
      let todayStr = getTodayStr();
      return task && task.timeSpentOnDay && task.timeSpentOnDay[todayStr];
    };

    this.getTotalTimeWorkedOnTasksToday = () => {
      let tasks = this.getToday();
      let totalTimeSpentTasks = $window.moment.duration();
      if (tasks) {
        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];
          totalTimeSpentTasks.add(task.timeSpent);
        }
      }
      return totalTimeSpentTasks;
    };

    this.getTimeWorkedToday = () => {
      let tasks = this.getToday();
      let todayStr = getTodayStr();
      let totalTimeWorkedToday;
      if (tasks.length > 0) {
        totalTimeWorkedToday = moment.duration();
        for (let i = 0; i < tasks.length; i++) {
          let task = tasks[i];

          if (task.subTasks && task.subTasks.length) {
            for (let j = 0; j < task.subTasks.length; j++) {
              let subTask = task.subTasks[j];
              if (subTask.timeSpentOnDay && subTask.timeSpentOnDay[todayStr]) {
                totalTimeWorkedToday.add(subTask.timeSpentOnDay[todayStr]);
              }
            }
          } else {
            if (task.timeSpentOnDay && task.timeSpentOnDay[todayStr]) {
              totalTimeWorkedToday.add(task.timeSpentOnDay[todayStr]);
            }
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
