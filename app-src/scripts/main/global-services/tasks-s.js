/**
 * @ngdoc service
 * @name superProductivity.Tasks
 * @description
 * # Tasks
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  const IPC_EVENT_IDLE = 'WAS_IDLE';
  const IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT = 'UPDATE_TIME_SPEND';
  const IPC_EVENT_CURRENT_TASK_UPDATED = 'CHANGED_CURRENT_TASK';
  const IPC_EVENT_TASK_MARK_AS_DONE = 'TASK_MARK_AS_DONE';
  const IPC_EVENT_TASK_START = 'TASK_START';
  const IPC_EVENT_TASK_PAUSE = 'TASK_PAUSE';

  /* @ngInject */
  class Tasks {

    constructor($localStorage, Uid, $rootScope, Dialogs, IS_ELECTRON, ShortSyntax, TasksUtil, Jira, TakeABreakReminder, SimpleToast) {
      this.$localStorage = $localStorage;
      this.Uid = Uid;
      this.$rootScope = $rootScope;
      this.Dialogs = Dialogs;
      this.ShortSyntax = ShortSyntax;
      this.TasksUtil = TasksUtil;
      this.IS_ELECTRON = IS_ELECTRON;
      this.SimpleToast = SimpleToast;
      this.Jira = Jira;

      // SETUP HANDLERS FOR ELECTRON EVENTS
      if (IS_ELECTRON) {
        let that = this;
        let isIdleDialogOpen = false;

        // handler for time spent tracking
        window.ipcRenderer.on(IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT, (ev, evData) => {
          if (!isIdleDialogOpen) {
            // only track if there is a task
            if (that.$localStorage.currentTask) {
              let timeSpentInMs = evData.timeSpentInMs;
              let idleTimeInMs = evData.idleTimeInMs;

              TakeABreakReminder.check(timeSpentInMs, idleTimeInMs);

              // track
              that.addTimeSpent(that.$localStorage.currentTask, timeSpentInMs);

              // update indicator
              window.ipcRenderer.send(IPC_EVENT_CURRENT_TASK_UPDATED, {
                current: that.$localStorage.currentTask,
                lastCurrent: that.lastCurrentTask
              });

              // we need to manually call apply as that is an outside event
              that.$rootScope.$apply();
            }
          }
        });

        // handler for idle event
        window.ipcRenderer.on(IPC_EVENT_IDLE, (ev, params) => {
          const idleTime = params.idleTimeInMs;
          const minIdleTimeInMs = params.minIdleTimeInMs;

          // do not show as long as the user hasn't decided
          TakeABreakReminder.isShown = false;

          if (!isIdleDialogOpen) {
            isIdleDialogOpen = true;
            that.Dialogs('WAS_IDLE', { idleTime, minIdleTimeInMs })
              .then(() => {
                // if tracked
                TakeABreakReminder.isShown = true;
                isIdleDialogOpen = false;
              }, () => {
                // if not tracked
                // unset currentSession.timeWorkedWithoutBreak
                that.$localStorage.currentSession.timeWorkedWithoutBreak = undefined;
                TakeABreakReminder.isShown = true;
                isIdleDialogOpen = false;
              });
          }
        });

        // handlers for dbus events
        window.ipcRenderer.on(IPC_EVENT_TASK_MARK_AS_DONE, () => {
          if (that.$localStorage.currentTask) {
            that.markAsDone(that.$localStorage.currentTask);
            that.$rootScope.$apply();
          } else if (that.lastCurrentTask) {
            that.markAsDone(that.lastCurrentTask);
            that.$rootScope.$apply();
          }
        });
        window.ipcRenderer.on(IPC_EVENT_TASK_START, () => {
          if (!that.$localStorage.currentTask && that.lastCurrentTask) {
            that.updateCurrent(that.lastCurrentTask);
            that.$rootScope.$apply();
          } else {

          }
        });
        window.ipcRenderer.on(IPC_EVENT_TASK_PAUSE, () => {
          if (that.$localStorage.currentTask) {
            that.updateCurrent(undefined);
            that.$rootScope.$apply();
          }
        });
      }
    }

    // GET DATA
    getCurrent() {
      let currentTask;
      let subTaskMatch;

      // we want the current task to be a reference to the tasks array
      if (this.$localStorage.currentTask) {
        currentTask = _.find(this.$localStorage.tasks, (task) => {
          if (task.subTasks) {
            let subTaskMatchTmp = _.find(task.subTasks, { id: this.$localStorage.currentTask.id });
            if (subTaskMatchTmp) {
              subTaskMatch = subTaskMatchTmp;
            }
          }
          return task.id === this.$localStorage.currentTask.id;
        });

        this.$localStorage.currentTask = currentTask || subTaskMatch;
      }
      return this.$localStorage.currentTask;
    }

    getById(taskId) {
      return _.find(this.$localStorage.tasks, ['id', taskId]) || _.find(this.$localStorage.backlogTasks, ['id', taskId]) || _.find(this.$localStorage.doneBacklogTasks, ['id', taskId]);
    }

    isTaskWithOriginalIdExistant(originalId) {
      const allTasks = this.TasksUtil.flattenTasks(this.getAllTasks());
      return !!_.find(allTasks, ['originalId', originalId]);
    }

    getBacklog() {
      this.TasksUtil.checkDupes(this.$localStorage.backlogTasks);
      this.TasksUtil.convertDurationStringsToMomentForList(this.$localStorage.backlogTasks);
      return this.$localStorage.backlogTasks;
    }

    getDoneBacklog() {
      this.TasksUtil.checkDupes(this.$localStorage.doneBacklogTasks);
      this.TasksUtil.convertDurationStringsToMomentForList(this.$localStorage.doneBacklogTasks);
      return this.$localStorage.doneBacklogTasks;
    }

    getToday() {
      this.TasksUtil.checkDupes(this.$localStorage.tasks);
      this.TasksUtil.convertDurationStringsToMomentForList(this.$localStorage.tasks);
      return this.$localStorage.tasks;
    }

    getAllTasks() {
      const todaysT = this.getToday();
      const backlogT = this.getBacklog();
      const doneBacklogT = this.getDoneBacklog();

      return _.concat(todaysT, backlogT, doneBacklogT);
    }

    getCompleteWorkLog() {
      const allTasks = this.TasksUtil.flattenTasks(this.getAllTasks());
      const worklog = {};
      _.each(allTasks, (task) => {
        if (task.timeSpentOnDay) {
          _.forOwn(task.timeSpentOnDay, (val, dateStr) => {
            if (task.timeSpentOnDay[dateStr]) {
              const split = dateStr.split('-');
              const year = parseInt(split[0], 10);
              const month = parseInt(split[1], 10);
              const day = parseInt(split[2], 10);

              if (!worklog[year]) {
                worklog[year] = {
                  timeSpent: moment.duration(),
                  entries: {}
                };
              }
              if (!worklog[year].entries[month]) {
                worklog[year].entries[month] = {
                  timeSpent: moment.duration(),
                  entries: {}
                };
              }
              if (!worklog[year].entries[month].entries[day]) {
                worklog[year].entries[month].entries[day] = {
                  timeSpent: moment.duration(),
                  entries: [],
                  dateStr: dateStr,
                  id: this.Uid()
                };
              }

              worklog[year].entries[month].entries[day].timeSpent = worklog[year].entries[month].entries[day].timeSpent.add(task.timeSpentOnDay[dateStr]);
              worklog[year].entries[month].entries[day].entries.push({
                task: task,
                timeSpent: moment.duration(task.timeSpentOnDay[dateStr])
              });
            }
          });
        }
      });

      // calculate time spent totals once too
      _.forOwn(worklog, (val, key) => {
        let year = worklog[key];
        _.forOwn(year.entries, (val, key) => {
          let month = year.entries[key];
          _.forOwn(month.entries, (val, key) => {
            let day = month.entries[key];
            month.timeSpent = month.timeSpent.add(day.timeSpent);
          });

          year.timeSpent = year.timeSpent.add(month.timeSpent);
        });
      });

      return worklog;
    }

    getUndoneToday(isSubTasksInsteadOfParent) {
      let undoneTasks;

      // get flattened result of all undone tasks including subtasks
      if (isSubTasksInsteadOfParent) {
        // get all undone tasks tasks
        undoneTasks = this.TasksUtil.flattenTasks(this.$localStorage.tasks, (parentTask) => {
          return parentTask && !parentTask.isDone;
        }, (subTask) => {
          return !subTask.isDone;
        });
      }

      // just get parent undone tasks
      else {
        undoneTasks = _.filter(this.$localStorage.tasks, (task) => {
          return task && !task.isDone;
        });
      }

      return undoneTasks;
    }

    getDoneToday() {
      return _.filter(this.$localStorage.tasks, (task) => {
        return task && task.isDone;
      });
    }

    getTotalTimeWorkedOnTasksToday() {
      let tasks = this.getToday();
      let totalTimeSpentTasks = moment.duration();
      if (tasks) {
        _.each(tasks, (task) => {
          totalTimeSpentTasks.add(task.timeSpent);
        });
      }
      return totalTimeSpentTasks;
    }

    getTimeWorkedToday() {
      let tasks = this.getToday();
      let todayStr = this.TasksUtil.getTodayStr();
      let totalTimeWorkedToday;
      if (tasks.length > 0) {
        totalTimeWorkedToday = moment.duration();
        _.each(tasks, (task) => {
          if (task.subTasks && task.subTasks.length) {
            _.each(task.subTasks, (subTask) => {
              if (subTask.timeSpentOnDay && subTask.timeSpentOnDay[todayStr]) {
                totalTimeWorkedToday.add(subTask.timeSpentOnDay[todayStr]);
              }
            });
          } else {
            if (task.timeSpentOnDay && task.timeSpentOnDay[todayStr]) {
              totalTimeWorkedToday.add(task.timeSpentOnDay[todayStr]);
            }
          }
        });
      }
      return totalTimeWorkedToday;
    }

    // UPDATE DATA
    addToday(task) {
      if (task && task.title) {
        this.$localStorage.tasks.unshift(this.createTask(task));
        this.updateTodayVm();
        this.SimpleToast('SUCCESS', 'Task "' + task.title + '" created.', 200);
      }
    }

    createTask(task) {
      let transformedTask = {
        title: task.title,
        id: this.Uid(),
        created: moment(),
        notes: angular.isString(task.notes) && task.notes.trim().length > 0 && task.notes,
        parentId: task.parentId,
        timeEstimate: task.timeEstimate || task.originalEstimate,
        timeSpent: task.timeSpent || task.originalTimeSpent,
        originalId: task.originalId,
        originalKey: task.originalKey,
        originalType: task.originalType,
        originalAssigneeKey: task.originalAssigneeKey,
        originalLink: task.originalLink,
        originalStatus: task.originalStatus,
        originalEstimate: task.originalEstimate,
        originalTimeSpent: task.originalTimeSpent,
        originalAttachment: task.originalAttachment,
        originalComments: task.originalComments,
        originalUpdated: task.originalUpdated
      };

      // check if new task on parent to copy over time tracking data
      if (!transformedTask.title || transformedTask.title.trim() === '' && transformedTask.parentId) {
        const parentTask = this.getById(transformedTask.parentId);
        if ((!parentTask.subTasks || parentTask.subTasks.length === 0)) {
          transformedTask.timeSpent = parentTask.timeSpent;
          transformedTask.timeSpentOnDay = parentTask.timeSpentOnDay;
          transformedTask.timeEstimate = parentTask.timeEstimate;
        }
      }

      transformedTask.progress = this.TasksUtil.calcProgress(task);
      return this.ShortSyntax(transformedTask);
    }

    markAsDone(task) {
      const parentTask = task.parentId && this.getById(task.parentId);

      // unset current task first
      this.updateCurrent(undefined);

      task.isDone = true;
      task.doneDate = moment();

      if (this.IS_ELECTRON) {
        // add worklog before marking the task as done
        if (this.TasksUtil.isJiraTask(task)) {
          this.Jira.addWorklog(task).then(() => {
            this.Jira.updateStatus(task, 'DONE');
          }, () => {
            this.Jira.updateStatus(task, 'DONE');
          });
        }
        // when we have a child task of a jira ticket, we just want to add a worklog
        // we pass the child task for that, as we might want to use its data for the worklog
        else if (this.TasksUtil.isJiraTask(parentTask)) {
          this.Jira.addWorklog(task);
        }
      }
      this.selectNextTask(task);
    }

    updateCurrent(task, isCallFromTimeTracking) {
      const isCurrentTaskChanged = this.TasksUtil.isTaskChanged(task, this.$localStorage.currentTask);
      const that = this;
      this.lastCurrentTask = this.$localStorage.currentTask;

      function moveInProgress(task) {
        if (isCurrentTaskChanged) {
          if (that.TasksUtil.isJiraTask(task)) {
            that.Jira.updateStatus(task, 'IN_PROGRESS');
          }
        }
      }

      // update totalTimeSpent for buggy macos
      if (task) {
        task.timeSpent = this.TasksUtil.calcTotalTimeSpentOnTask(task);

        if (isCurrentTaskChanged) {
          this.SimpleToast('CUSTOM', 'Started task "' + task.title + '"', 'play_circle_outline');
        }

        // check if in electron context
        if (this.IS_ELECTRON) {
          if (!isCallFromTimeTracking) {
            const parentTask = task.parentId && this.getById(task.parentId);

            // check for updates first
            if (this.TasksUtil.isJiraTask(task) || this.TasksUtil.isJiraTask(parentTask)) {
              // find out if current or parent is the task we want to handle
              let jiraTaskToHandle = task;
              if (!this.TasksUtil.isJiraTask(task) && this.TasksUtil.isJiraTask(parentTask)) {
                jiraTaskToHandle = parentTask;
              }

              this.Jira.checkUpdatesForTaskOrParent(task)
                .then(() => {
                  if (!jiraTaskToHandle.originalAssigneeKey || jiraTaskToHandle.originalAssigneeKey !== this.$localStorage.jiraSettings.userName) {
                    // ask if to assign to yourself or just ignore it
                    this.Dialogs('JIRA_ASSIGN_TICKET', { task: jiraTaskToHandle })
                      .then(() => {
                        moveInProgress(jiraTaskToHandle);
                      }, () => {
                        this.updateCurrent(undefined);
                      });
                  } else {
                    // just move in progress
                    moveInProgress(jiraTaskToHandle);
                  }
                });
            }
          }
        }
      }

      if (this.IS_ELECTRON) {
        window.ipcRenderer.send(IPC_EVENT_CURRENT_TASK_UPDATED, {
          current: task,
          lastCurrent: this.lastCurrentTask
        });
      }

      this.$rootScope.r.currentTask = this.$localStorage.currentTask = task;
    }

    removeTimeSpent(task, timeSpentToRemoveAsMoment) {
      const TODAY_STR = this.TasksUtil.getTodayStr();
      let timeSpentToRemoveInMs;
      let timeSpentCalculatedOnDay;
      let parentTask;

      if (timeSpentToRemoveAsMoment.asMilliseconds) {
        timeSpentToRemoveInMs = timeSpentToRemoveAsMoment.asMilliseconds();
      } else {
        timeSpentToRemoveInMs = timeSpentToRemoveAsMoment;
      }

      // track time spent on days
      if (!task.timeSpentOnDay) {
        task.timeSpentOnDay = {};
      }
      if (task.timeSpentOnDay[TODAY_STR]) {
        // convert to moment again in case it messed up
        timeSpentCalculatedOnDay = moment.duration(task.timeSpentOnDay[TODAY_STR]);
        timeSpentCalculatedOnDay.subtract(timeSpentToRemoveInMs, 'milliseconds');
        if (timeSpentCalculatedOnDay.asSeconds() > 0) {
          task.timeSpentOnDay[TODAY_STR] = timeSpentCalculatedOnDay;
        } else {
          delete task.timeSpentOnDay[TODAY_STR];
        }
      }

      // do the same for the parent, in case the sub tasks are deleted
      if (task.parentId) {
        // TODO calc parent task timeSpent
        parentTask = this.getById(task.parentId);
        parentTask.timeSpentOnDay = this.TasksUtil.mergeTotalTimeSpentOnDayFrom(parentTask.subTasks);
        parentTask.progress = this.TasksUtil.calcProgress(parentTask);
      }

      // track total time spent
      task.timeSpent = this.TasksUtil.calcTotalTimeSpentOnTask(task);
      task.progress = this.TasksUtil.calcProgress(task);

      return task;
    }

    addTimeSpent(task, timeSpentInMsOrMomentDuration) {
      // use mysql date as it is sortable
      const TODAY_STR = this.TasksUtil.getTodayStr();
      let timeSpentCalculatedOnDay;
      let timeSpentInMs;
      let parentTask;

      if (timeSpentInMsOrMomentDuration.asMilliseconds) {
        timeSpentInMs = timeSpentInMsOrMomentDuration.asMilliseconds();
      } else {
        timeSpentInMs = timeSpentInMsOrMomentDuration;
      }

      // if not set set started pointer
      if (!task.started) {
        task.started = moment();
      }

      // track time spent on days
      if (!task.timeSpentOnDay) {
        task.timeSpentOnDay = {};
      }
      if (task.timeSpentOnDay[TODAY_STR]) {
        timeSpentCalculatedOnDay = moment.duration(task.timeSpentOnDay[TODAY_STR]);
        timeSpentCalculatedOnDay.add(moment.duration({ milliseconds: timeSpentInMs }));
      } else {
        timeSpentCalculatedOnDay = moment.duration({ milliseconds: timeSpentInMs });
      }

      // assign values
      task.timeSpentOnDay[TODAY_STR] = timeSpentCalculatedOnDay;
      task.lastWorkedOn = moment();

      // do the same for the parent, in case the sub tasks are deleted
      if (task.parentId) {
        parentTask = this.getById(task.parentId);
        // also set parent task to started if there is one
        if (!parentTask.started) {
          parentTask.started = moment();
        }

        // also track time spent on day for parent task
        // TODO calc parent task timeSpent
        parentTask.timeSpentOnDay = this.TasksUtil.mergeTotalTimeSpentOnDayFrom(parentTask.subTasks);
        parentTask.lastWorkedOn = moment();
        parentTask.progress = this.TasksUtil.calcProgress(parentTask);
      }

      // track total time spent
      task.timeSpent = this.TasksUtil.calcTotalTimeSpentOnTask(task);
      task.progress = this.TasksUtil.calcProgress(task);

      return task;
    }

    updateEstimate(task, estimate) {
      task.timeEstimate = estimate;
      task.progress = this.TasksUtil.calcProgress(task);
      if (task.parentId) {
        let parentTask = this.getById(task.parentId);
        parentTask.progress = this.TasksUtil.calcProgress(parentTask);
      }
    }

    updateTimeSpentOnDay(task, timeSpentOnDay) {
      if (!angular.isObject(timeSpentOnDay)) {
        throw 'timeSpentOnDay should be an object';
      }

      let totalTimeSpent = moment.duration();
      _.forOwn(timeSpentOnDay, (val, dateStr) => {
        if (timeSpentOnDay[dateStr]) {
          let momentVal = moment.duration(timeSpentOnDay[dateStr]);
          if (momentVal.asSeconds() < 1) {
            delete timeSpentOnDay[dateStr];
          } else {
            totalTimeSpent.add(momentVal);
          }
        } else {
          // clean empty
          delete timeSpentOnDay[dateStr];
        }
      });
      task.timeSpentOnDay = timeSpentOnDay;
      task.timeSpent = totalTimeSpent;
      task.progress = this.TasksUtil.calcProgress(task);

      // TODO this is not clear and probably buggy
      //if (task.parentId) {
      //  const parentTask = this.getById(task.parentId);
      //  // also track time spent on day for parent task
      //  parentTask.progress = this.TasksUtil.calcProgress(parentTask);
      //}
    }

    updateToday(tasks) {
      this.$localStorage.tasks = tasks;
      this.updateTodayVm();
    }

    updateTodayVm() {
      this.$rootScope.r.tasks = this.$localStorage.tasks;
    }

    updateBacklog(tasks) {
      this.$localStorage.backlogTasks = tasks;
      this.updateBacklogVm();
    }

    updateBacklogVm() {
      this.$rootScope.r.backlogTasks = this.$localStorage.backlogTasks;
    }

    addNewToTopOfBacklog(task, isRemoteUpdate) {
      if (task && task.title) {
        this.$localStorage.backlogTasks.unshift(this.createTask(task));

        if (isRemoteUpdate) {
          this.SimpleToast('CUSTOM', 'Task "' + task.title + '" imported and added to backlog.', 'import_export');
        } else {
          this.SimpleToast('SUCCESS', 'Task "' + task.title + '" created and added to backlog.');
        }
      }
    }

    moveTask(task, fromArray, toArray) {
      const index = _.findIndex(fromArray, ['id', task.id]);
      if (index >= 0) {
        fromArray.splice(index, 1);
        toArray.unshift(task);
      }
    }

    moveTaskFromBackLogToToday(task) {
      this.moveTask(task, this.$localStorage.backlogTasks, this.$localStorage.tasks);
    }

    moveTaskFromTodayToBackLog(task) {
      this.moveTask(task, this.$localStorage.tasks, this.$localStorage.backlogTasks);
    }

    addTasksToTopOfBacklog(tasks) {
      this.$localStorage.backlogTasks = tasks.concat(this.$localStorage.backlogTasks);
    }

    updateDoneBacklog(tasks) {
      this.$localStorage.doneBacklogTasks = tasks;
    }

    clearBacklog() {
      // we want to keep the original reference intact so we use length
      // @see: http://stackoverflow.com/questions/1232040/how-do-i-empty-an-array-in-javascript
      this.$localStorage.backlogTasks.length = 0;
      this.SimpleToast('SUCCESS', 'Backlog deleted!');
    }

    addDoneTasksToDoneBacklog() {
      let doneTasks = this.getDoneToday().slice(0);
      this.$localStorage.doneBacklogTasks = doneTasks.concat(this.$localStorage.doneBacklogTasks);
    }

    // SPECIAL METHODS
    // -----------------------------------
    finishDay(clearDoneTasks, moveUnfinishedToBacklog) {
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
      this.updateCurrent(undefined);
    }

    selectNextTask(finishedCurrentTask) {
      if (finishedCurrentTask && finishedCurrentTask.isDone) {
        // if sub task try to select the next undone sub task of the same parent
        if (finishedCurrentTask.parentId) {
          let parentTask = this.getById(finishedCurrentTask.parentId);
          if (parentTask.subTasks && parentTask.subTasks.length) {
            // if there is one it will be the next current otherwise it will be no task
            this.updateCurrent(_.find(parentTask.subTasks, (task) => {
              // NOTE: we don't use the short syntax here, as we also want to account
              // for the property not being set yet
              return !task.isDone;
            }));
            // otherwise do nothing as it isn't obvious what to do next
            // TODO maybe open toast asking if the parent task should also be marked as done
          }
        } else {
          let undoneTasks = this.getUndoneToday();
          // go to daily planner if there are no undone tasks left
          if (!undoneTasks || undoneTasks.length === 0) {
            // $state.go('daily-planner');
          } else {
            this.updateCurrent(this.TasksUtil.getNextUndone(undoneTasks));
          }
        }
      }
    }

    collapseNotes(tasks) {
      tasks.forEach((task) => {
        delete task.showNotes;
      });
    }

    collapseSubTasks(tasks) {
      tasks.forEach((task) => {
        if (task.subTasks) {
          if (!this.$localStorage.currentTask || !(task.subTasks.find((task) => this.$localStorage.currentTask.id === task.id))) {
            task.isHideSubTasks = true;
          }
        } else if (task.isHideSubTasks) {
          delete task.isHideSubTasks;
        }
      });
    }

    addLocalAttachment(task, attachment) {
      if (!task.localAttachments) {
        task.localAttachments = [];
      }

      task.localAttachments.push(attachment);
    }
  }

  // hacky fix for ff
  Tasks.$$ngIsClass = true;

  angular
    .module('superProductivity')
    .service('Tasks', Tasks);

})();
