/**
 * @ngdoc service
 * @name superProductivity.Jira
 * @description
 * # Jira
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  const IPC_JIRA_CB_EVENT = 'JIRA_RESPONSE';
  const IPC_JIRA_MAKE_REQUEST_EVENT = 'JIRA';

  // it's weird!!
  const JIRA_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';

  const MAX_RESULTS = 100;
  const ISSUE_TYPE = 'JIRA';
  const SUGGESTION_FIELDS_TO_GET = [
    'summary',
    'description',
    'timeestimate',
    'timespent',
    'status',
    'attachment',
    'comment',
    'updated'
  ];

  /* @ngInject */
  class Jira {
    constructor(IS_ELECTRON, SimpleToast, Uid, $q, $localStorage, Dialogs, Notifier, $injector, $timeout, REQUEST_TIMEOUT, $log) {
      this.requestsLog = {};

      this.IS_ELECTRON = IS_ELECTRON;
      this.Uid = Uid;
      this.$q = $q;
      this.$localStorage = $localStorage;
      this.Dialogs = Dialogs;
      this.Notifier = Notifier;
      this.$injector = $injector;
      this.$timeout = $timeout;
      this.REQUEST_TIMEOUT = REQUEST_TIMEOUT;
      this.$log = $log;
      this.SimpleToast = SimpleToast;

      // set up callback listener for electron
      if (IS_ELECTRON) {
        const that = this;
        window.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
          // check if proper id is given in callback and if exists in requestLog
          if (res.requestId && that.requestsLog[res.requestId]) {
            let currentRequest = that.requestsLog[res.requestId];
            // cancel timeout for request
            that.$timeout.cancel(currentRequest.timeout);

            // resolve saved promise
            if (!res || res.error) {
              that.$log.log('FRONTEND_REQUEST', currentRequest);
              that.$log.log('RESPONSE', res);
              that.SimpleToast('ERROR', 'Jira Request failed: ' + currentRequest.clientRequest.apiMethod + ' – ' + (res && res.error));
              currentRequest.defer.reject(res);
            } else {
              currentRequest.defer.resolve(res);
            }
            // delete entry for promise afterwards
            delete that.requestsLog[res.requestId];
          }
        });
      }
    }

    // function map comments
    mapComments(issue) {
      return issue.fields.comment && issue.fields.comment.comments && issue.fields.comment.comments.map((comment) => {
          return {
            author: comment.author.name,
            body: comment.body
          };
        });
    }

    mapAttachments(issue) {
      return issue.fields.attachment && issue.fields.attachment.map((attachment) => {
          return attachment.content;
        });
    }

    mapAndAddChangelogToTask(task, issue) {
      let transformedChangelog;

      if (issue && issue.changelog) {
        transformedChangelog = [];
        let changelog = issue.changelog;
        if (changelog.histories) {
          // we also add 0.5 seconds because of the millisecond difference
          // for issue updated and historyEntry.created
          let lastUpdate = task.originalUpdated && moment(task.originalUpdated).add(0.5, 'second');
          for (let i = 0; i < changelog.histories.length; i++) {
            let history = changelog.histories[i];
            let historyCreated = moment(history.created);

            // add if newer than the last update
            if (lastUpdate && historyCreated.isAfter(lastUpdate)) {
              transformedChangelog.push({
                author: history.author.displayName,
                items: history.items,
                created: historyCreated
              });
            }
          }
        }
      }
      task.originalChangelog = transformedChangelog;
      return transformedChangelog;
    }

    mapIssue(issue) {
      return {
        title: issue.key + ' ' + issue.fields.summary,
        notes: issue.fields.description,
        originalType: ISSUE_TYPE,
        originalKey: issue.key,
        originalComments: this.mapComments(issue),
        originalId: issue.id,
        originalUpdated: issue.fields.updated,
        originalStatus: issue.fields.status,
        originalAttachment: this.mapAttachments(issue),
        originalLink: 'https://' + this.$localStorage.jiraSettings.host + '/browse/' + issue.key,
        originalEstimate: issue.fields.timeestimate && moment.duration({
          seconds: issue.fields.timeestimate
        }),
        originalTimeSpent: issue.fields.timespent && moment.duration({
          seconds: issue.fields.timespent
        }),
      };
    }

    isSufficientJiraSettings(settingsToTest) {
      if (!settingsToTest) {
        settingsToTest = this.$localStorage.jiraSettings;
      }
      return settingsToTest && settingsToTest.isJiraEnabled && settingsToTest.host && settingsToTest.userName && settingsToTest.password && settingsToTest.password;
    }

    transformIssues(response) {
      if (response) {
        let res = response.response;
        let tasks = [];

        for (let i = 0; i < res.issues.length; i++) {
          let issue = res.issues[i];
          tasks.push(this.mapIssue(issue));
        }

        return tasks;
      }
    }

    isJiraTask(task) {
      return task && task.originalType === ISSUE_TYPE;
    }

    updateStatus(task, localType) {
      const defer = this.$q.defer();

      if (!this.isSufficientJiraSettings()) {
        return this.$q.reject('Jira: Insufficient settings.');
      }

      if (this.isJiraTask(task)) {
        if (this.$localStorage.jiraSettings.transitions && this.$localStorage.jiraSettings.transitions[localType] && this.$localStorage.jiraSettings.transitions[localType] !== 'ALWAYS_ASK') {
          if (this.$localStorage.jiraSettings.transitions[localType] === 'DO_NOT') {
            defer.reject('DO_NOT chosen');
          } else {
            if (task.status !== localType) {
              this.transitionIssue(task, {
                id: this.$localStorage.jiraSettings.transitions[localType]
              }, localType)
                .then(defer.resolve, defer.reject);
            } else {
              defer.resolve('NO NEED TO UPDATE');
            }
          }
        } else {
          this.getTransitionsForIssue(task)
            .then((response) => {
              let transitions = response.response.transitions;
              this.Dialogs('JIRA_SET_IN_PROGRESS', { transitions, task, localType })
                .then((transition) => {
                  this.transitionIssue(task, transition, localType)
                    .then(defer.resolve, defer.reject);
                }, defer.reject);
            }, defer.reject);
        }
      }

      return defer.promise;
    }

    updateIssueDescription(task) {
      if (!this.isSufficientJiraSettings()) {
        return this.$q.reject('Jira: Insufficient settings.');
      }

      if (!this.$localStorage.jiraSettings.isUpdateIssueFromLocal) {
        return this.$q.reject('Jira: jiraSettings.isUpdateIssueFromLocal is deactivated');
      }

      if (this.isJiraTask(task) && task.notes) {
        let request = {
          config: this.$localStorage.jiraSettings,
          apiMethod: 'updateIssue',
          arguments: [task.originalKey, {
            fields: {
              description: task.notes
            }
          }]
        };
        return this.sendRequest(request).then(() => {
          this.SimpleToast('SUCCESS', 'Jira: Description updated for ' + task.originalKey);
        });
      } else {
        this.SimpleToast('ERROR', 'Jira: Not enough parameters for updateIssueDescription.');
        return this.$q.reject('Jira: Not enough parameters for updateIssueDescription.');
      }
    }

    checkUpdatesForTicket(task, isNoNotify) {
      let defer = this.$q.defer();
      if (!this.isSufficientJiraSettings()) {
        return this.$q.reject('Jira: Insufficient settings.');
      }

      if (this.isJiraTask(task)) {
        let request = {
          config: this.$localStorage.jiraSettings,
          apiMethod: 'findIssue',
          arguments: [task.originalKey, 'changelog']
        };
        this.sendRequest(request)
          .then((res) => {
              let issue = res.response;
              // TODO maybe this is not necessary
              // we also add 0.5 seconds because of the millisecond difference
              // for issue updated and historyEntry.created
              let lastUpdate = task.originalUpdated && moment(task.originalUpdated).add(0.5, 'second');
              if (lastUpdate && moment(issue.fields.updated).isAfter(lastUpdate)) {
                if (!isNoNotify) {
                  // add changelog entries
                  this.mapAndAddChangelogToTask(task, issue);
                  task.isUpdated = true;
                }
                // extend task with new values
                angular.extend(task, this.mapIssue(issue));

                defer.resolve(task);
              } else {
                defer.resolve(false);
              }
            }, defer.reject
          );

        return defer.promise;
      } else {
        this.SimpleToast('ERROR', 'Jira Request failed: Not a real ' + ISSUE_TYPE + ' issue.');
        return this.$q.reject('Not a real ' + ISSUE_TYPE + ' issue.');
      }
    }

    addWorklog(originalTask) {
      const that = this;

      if (!this.isSufficientJiraSettings()) {
        return this.$q.reject('Jira: Insufficient settings.');
      }

      const Tasks = this.$injector.get('Tasks');
      let defer = this.$q.defer();
      let outerTimeSpent;

      // WE'RE always copying the task for add work log
      // so no data should be added back by this call!
      let task = angular.copy(originalTask);
      let comment;

      function successHandler(res) {
        that.SimpleToast('SUCCESS', 'Jira: Updated worklog for ' + task.originalKey + ' by ' + parseInt(outerTimeSpent.asMinutes(), 10) + 'm.');

        // set original update to now to prevent showing this as task update
        task.originalUpdated = moment().format(JIRA_DATE_FORMAT);

        defer.resolve(res);
      }

      if (this.$localStorage.jiraSettings.isWorklogEnabled) {

        // use parent task option if enabled
        if (this.$localStorage.jiraSettings.isAddWorklogOnSubTaskDone) {
          if (task.parentId) {
            let parentTaskCopy = angular.copy(Tasks.getById(task.parentId));
            if (this.isJiraTask(parentTaskCopy)) {

              comment = task.title;

              parentTaskCopy.title = parentTaskCopy.originalKey + ': ' + task.title;
              parentTaskCopy.timeSpent = task.timeSpent;
              parentTaskCopy.started = task.started;

              // finally set worklog task to parent
              task = parentTaskCopy;
            }
          }
          // don't execute for tasks with sub tasks in this mode
          else if (task.subTasks && task.subTasks.length > 0) {
            return;
          }
        }

        if (this.isJiraTask(task)) {
          this.checkUpdatesForTicket(task)
            .then(() => {
              if (this.$localStorage.jiraSettings.isAutoWorklog) {
                outerTimeSpent = task.timeSpent;
                this._addWorklog(task.originalKey, moment(task.started), task.timeSpent)
                  .then(successHandler, defer.reject);
              } else {
                this.Dialogs('JIRA_ADD_WORKLOG', { task, comment })
                  .then((dialogTaskCopy) => {
                    outerTimeSpent = dialogTaskCopy.timeSpent;
                    this._addWorklog(dialogTaskCopy.originalKey, dialogTaskCopy.started, dialogTaskCopy.timeSpent, dialogTaskCopy.comment)
                      .then(successHandler, defer.reject);
                  }, defer.reject);
              }
            }, defer.reject);
        } else {
          defer.reject('Jira: Task or Parent Task are no Jira Tasks.');
        }
      }

      return defer.promise;
    }

    _addWorklog(originalKey, started, timeSpent, comment) {
      if (originalKey && started && started.toISOString && timeSpent && timeSpent.asSeconds) {
        let request = {
          config: this.$localStorage.jiraSettings,
          apiMethod: 'addWorklog',
          arguments: [
            originalKey,
            {
              started: started.format(JIRA_DATE_FORMAT),
              timeSpentSeconds: timeSpent.asSeconds(),
              comment: comment,
            }
          ]
        };
        return this.sendRequest(request);
      } else {
        this.SimpleToast('ERROR', 'Jira: Not enough parameters for worklog.');
        return this.$q.reject('Jira: Not enough parameters for worklog.');
      }
    }

    getTransitionsForIssue(task) {
      if (!this.isSufficientJiraSettings()) {
        return this.$q.reject('Jira: Insufficient settings.');
      }

      if (this.isJiraTask(task)) {
        let request = {
          config: this.$localStorage.jiraSettings,
          apiMethod: 'listTransitions',
          arguments: [task.originalKey]
        };
        return this.sendRequest(request);
      } else {
        this.SimpleToast('ERROR', 'Jira Request failed: Not a real ' + ISSUE_TYPE + ' issue.');
        return this.$q.reject('Not a real ' + ISSUE_TYPE + ' issue.');
      }
    }

    transitionIssue(task, transitionObj, localType) {
      let defer = this.$q.defer();
      const that = this;

      if (!this.isSufficientJiraSettings()) {
        return this.$q.reject('Jira: Insufficient settings.');
      }

      function transitionSuccess(res) {
        // update
        task.status = localType;
        task.originalStatus = transitionObj;

        // set original update to now to prevent showing this as task update
        task.originalUpdated = moment().format(JIRA_DATE_FORMAT);

        that.SimpleToast('SUCCESS', `Jira: Updated task status to "${(transitionObj.name || localType)}"`);
        defer.resolve(res);
      }

      this.checkUpdatesForTicket(task)
        .then(() => {
          let request = {
            config: this.$localStorage.jiraSettings,
            apiMethod: 'transitionIssue',
            arguments: [task.originalId, {
              transition: {
                id: transitionObj.id
              }
            }]
          };
          this.sendRequest(request)
            .then(transitionSuccess, defer.reject);
        });

      return defer.promise;
    }

    getSuggestions() {
      let options = {
        maxResults: MAX_RESULTS,
        fields: SUGGESTION_FIELDS_TO_GET
      };

      if (this.isSufficientJiraSettings() && this.$localStorage.jiraSettings.jqlQuery) {
        let request = {
          config: this.$localStorage.jiraSettings,
          apiMethod: 'searchJira',
          arguments: [this.$localStorage.jiraSettings.jqlQuery, options]
        };
        return this.sendRequest(request);
      } else {
        this.SimpleToast('ERROR', 'Jira: Insufficient settings. Please define a jqlQuery');
        return this.$q.reject('Jira: Insufficient settings');
      }
    }

    getAutoAddedIssues() {
      let defer = this.$q.defer();

      let options = {
        maxResults: MAX_RESULTS,
        fields: SUGGESTION_FIELDS_TO_GET
      };

      if (this.isSufficientJiraSettings() && this.$localStorage.jiraSettings.jqlQueryAutoAdd) {
        let request = {
          config: this.$localStorage.jiraSettings,
          apiMethod: 'searchJira',
          arguments: [this.$localStorage.jiraSettings.jqlQueryAutoAdd, options]
        };
        this.sendRequest(request)
          .then((res) => {
            defer.resolve(this.transformIssues(res));
          }, defer.reject);
      } else {
        this.SimpleToast('ERROR', 'Jira: Insufficient settings. Please define a jqlQuery for auto adding issues');
        defer.reject('Jira: Insufficient settings');
      }

      return defer.promise;
    }

    sendRequest(request) {
      if (!this.$localStorage.jiraSettings) {
        this.$log.log('NO SETTINGS DEFINED');
        return;
      }

      if (this.IS_ELECTRON) {
        // assign uuid to request to know which responsive belongs to which promise
        request.requestId = this.Uid();
        let defer = this.$q.defer();
        // save to request log
        this.requestsLog[request.requestId] = {
          defer,
          requestMethod: request.apiMethod,
          clientRequest: request,
          timeout: this.$timeout(() => {
            this.SimpleToast('ERROR', 'Jira Request timed out for ' + request.apiMethod);
            // delete entry for promise
            delete this.requestsLog[request.requestId];
          }, this.REQUEST_TIMEOUT)
        };

        // send to electron
        window.ipcRenderer.send(IPC_JIRA_MAKE_REQUEST_EVENT, request);

        return defer.promise;
      } else {
        return this.$q.when(null);
      }
    }

    checkForNewAndAddToBacklog() {
      const Tasks = this.$injector.get('Tasks');

      if (this.isSufficientJiraSettings() && this.$localStorage.jiraSettings.isEnabledAutoAdd) {
        this.getAutoAddedIssues()
          .then((issues) => {
            _.each(issues, (issue) => {
              if (!Tasks.isTaskWithOriginalIdExistant(issue.originalId)) {
                const task = Tasks.createTask(issue);
                // the second param is the updateFromRemote flag
                Tasks.addNewToTopOfBacklog(task, true);
              }
            });
          });
      }
    }

    checkForUpdates(tasks) {
      const TasksUtil = this.$injector.get('TasksUtil');
      const defer = this.$q.defer();

      let tasksToPoll = TasksUtil.flattenTasks(tasks, this.isJiraTask, this.isJiraTask);
      // execute requests sequentially to have a little more time
      let pollPromise = tasksToPoll.reduce((promise, task) =>
        promise.then(() =>
          this.checkUpdatesForTicket(task)
            .then((isUpdated) => {
              this.taskIsUpdatedHandler(isUpdated, task);
            }, defer.reject)
        ), Promise.resolve()
      );

      pollPromise
        .then(() => {
          defer.resolve();
        });

      return defer.promise;
    }

    taskIsUpdatedHandler(updatedTask) {
      if (updatedTask) {
        this.Notifier({
          title: 'Jira Update',
          message: '"' + updatedTask.title + '" => has been updated as it was updated on Jira.',
          sound: true,
          wait: true
        });
        this.SimpleToast('CUSTOM', '"' + updatedTask.title + '" => has been updated as it was updated on Jira.', 'update');
      }
    }

    checkUpdatesForTaskOrParent(task, isNoNotify) {
      const Tasks = this.$injector.get('Tasks');
      if (task) {
        if (!task.originalKey && task.parentId) {
          let parentTask = Tasks.getById(task.parentId);
          if (parentTask.originalKey) {
            // set task to parent task
            task = parentTask;
          }
        }
        if (this.isJiraTask(task)) {
          this.checkUpdatesForTicket(task, isNoNotify).then((updatedTask) => {
            this.taskIsUpdatedHandler(updatedTask);
          });
        }
      }
    }
  }

  // hacky fix for ff
  Jira.$$ngIsClass = true;

  angular
    .module('superProductivity')
    .service('Jira', Jira);
})();
