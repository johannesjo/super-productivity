/**
 * @ngdoc service
 * @name superProductivity.Jira
 * @description
 * # Jira
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Jira', Jira);

  /* @ngInject */
  function Jira(Uid, $q, $localStorage, $window, Dialogs, IS_ELECTRON, SimpleToast, Notifier, $injector, $timeout, REQUEST_TIMEOUT, $log) {
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

    const moment = $window.moment;

    this.requestsLog = {};

    // set up callback listener for electron
    if (IS_ELECTRON) {
      window.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
        // check if proper id is given in callback and if exists in requestLog
        if (res.requestId && this.requestsLog[res.requestId]) {
          let currentRequest = this.requestsLog[res.requestId];
          // cancel timeout for request
          $timeout.cancel(currentRequest.timeout);

          // resolve saved promise
          if (!res || res.error) {
            $log.log('FRONTEND_REQUEST', currentRequest);
            $log.log('RESPONSE', res);
            SimpleToast('ERROR', 'Jira Request failed: ' + currentRequest.clientRequest.apiMethod + ' – ' + (res && res.error));
            currentRequest.defer.reject(res);
          } else {
            currentRequest.defer.resolve(res);
          }
          // delete entry for promise afterwards
          delete this.requestsLog[res.requestId];
        }
      });
    }

    // function map comments
    function mapComments(issue) {
      return issue.fields.comment && issue.fields.comment.comments && issue.fields.comment.comments.map((comment) => {
          return '[' + comment.author.name + ']: ' + comment.body;
        });
    }

    function mapAttachments(issue) {
      return issue.fields.attachment && issue.fields.attachment.map((attachment) => {
          return attachment.content;
        });
    }

    function mapAndAddChangelogToTask(task, issue) {
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

    function mapIssue(issue) {
      return {
        title: issue.key + ' ' + issue.fields.summary,
        notes: issue.fields.description,
        originalType: ISSUE_TYPE,
        originalKey: issue.key,
        originalComments: mapComments(issue),
        originalId: issue.id,
        originalUpdated: issue.fields.updated,
        originalStatus: issue.fields.status,
        originalAttachment: mapAttachments(issue),
        originalLink: 'https://' + $localStorage.jiraSettings.host + '/browse/' + issue.key,
        originalEstimate: issue.fields.timeestimate && moment.duration({
          seconds: issue.fields.timeestimate
        }),
        originalTimeSpent: issue.fields.timespent && moment.duration({
          seconds: issue.fields.timespent
        }),
      };
    }

    function isSufficientJiraSettings() {
      return $localStorage.jiraSettings && $localStorage.jiraSettings.isJiraEnabled && $localStorage.jiraSettings.host && $localStorage.jiraSettings.userName && $localStorage.jiraSettings.password && $localStorage.jiraSettings.password;
    }

    this.transformIssues = (response) => {
      if (response) {
        let res = response.response;
        let tasks = [];

        for (let i = 0; i < res.issues.length; i++) {
          let issue = res.issues[i];
          tasks.push(mapIssue(issue));
        }

        return tasks;
      }
    };

    this.isJiraTask = (task) => {
      return task && task.originalType === ISSUE_TYPE;
    };

    this.updateStatus = (task, localType) => {
      const defer = $q.defer();

      if (this.isJiraTask(task)) {
        if ($localStorage.jiraSettings.transitions && $localStorage.jiraSettings.transitions[localType] && $localStorage.jiraSettings.transitions[localType] !== 'ALWAYS_ASK') {
          if ($localStorage.jiraSettings.transitions[localType] === 'DO_NOT') {
            defer.reject('DO_NOT chosen');
          } else {
            if (task.status !== localType) {
              this.transitionIssue(task, {
                id: $localStorage.jiraSettings.transitions[localType]
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
              Dialogs('JIRA_SET_IN_PROGRESS', { transitions, task, localType })
                .then((transition) => {
                  this.transitionIssue(task, transition, localType)
                    .then(defer.resolve, defer.reject);
                }, defer.reject);
            }, defer.reject);
        }
      }

      return defer.promise;
    };

    this.updateIssueDescription = (task) => {
      if (!$localStorage.jiraSettings.isUpdateIssueFromLocal) {
        return $q.reject('Jira: jiraSettings.isUpdateIssueFromLocal is deactivated');
      }

      if (this.isJiraTask(task) && task.notes) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'updateIssue',
          arguments: [task.originalKey, {
            fields: {
              description: task.notes
            }
          }]
        };
        return this.sendRequest(request).then(() => {
          SimpleToast('SUCCESS', 'Jira: Description updated for ' + task.originalKey);
        });
      } else {
        SimpleToast('ERROR', 'Jira: Not enough parameters for updateIssueDescription.');
        return $q.reject('Jira: Not enough parameters for updateIssueDescription.');
      }
    };

    this.checkUpdatesForTicket = (task, isNoNotify) => {
      let defer = $q.defer();
      if (this.isJiraTask(task)) {
        let request = {
          config: $localStorage.jiraSettings,
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
                  mapAndAddChangelogToTask(task, issue);
                  task.isUpdated = true;
                }
                // extend task with new values
                angular.extend(task, mapIssue(issue));

                defer.resolve(task);
              } else {
                defer.resolve(false);
              }
            }, defer.reject
          );

        return defer.promise;
      } else {
        SimpleToast('ERROR', 'Jira Request failed: Not a real ' + ISSUE_TYPE + ' issue.');
        return $q.reject('Not a real ' + ISSUE_TYPE + ' issue.');
      }
    };

    this.addWorklog = (originalTask) => {
      const Tasks = $injector.get('Tasks');
      let defer = $q.defer();
      let outerTimeSpent;

      // WE'RE always copying the task for add work log
      // so no data should be added back by this call!
      let task = angular.copy(originalTask);
      let comment;

      function successHandler(res) {
        SimpleToast('SUCCESS', 'Jira: Updated worklog for ' + task.originalKey + ' by ' + parseInt(outerTimeSpent.asMinutes()) + 'm.');

        // set original update to now to prevent showing this as task update
        task.originalUpdated = moment().format(JIRA_DATE_FORMAT);

        defer.resolve(res);
      }

      if ($localStorage.jiraSettings.isWorklogEnabled) {

        // use parent task option if enabled
        if ($localStorage.jiraSettings.isAddWorklogOnSubTaskDone) {
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
              if ($localStorage.jiraSettings.isAutoWorklog) {
                outerTimeSpent = task.timeSpent;
                this._addWorklog(task.originalKey, moment(task.started), task.timeSpent)
                  .then(successHandler, defer.reject);
              } else {
                Dialogs('JIRA_ADD_WORKLOG', { task, comment })
                  .then((dialogTaskCopy) => {
                    outerTimeSpent = dialogTaskCopy.timeSpent;
                    this._addWorklog(dialogTaskCopy.originalKey, dialogTaskCopy.started, dialogTaskCopy.timeSpent, dialogTaskCopy.comment)
                      .then(successHandler, defer.reject);
                  }, defer.reject);
              }
            }, defer.reject);
        }
      } else {
        defer.reject('Jira: Task or Parent Task are no Jira Tasks.');
      }

      return defer.promise;
    };

    this._addWorklog = (originalKey, started, timeSpent, comment) => {
      if (originalKey && started && started.toISOString && timeSpent && timeSpent.asSeconds) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'addWorklog',
          arguments: [originalKey, {
            started: started.format(JIRA_DATE_FORMAT),
            timeSpentSeconds: timeSpent.asSeconds(),
            comment: comment
          }]
        };
        return this.sendRequest(request);
      } else {
        SimpleToast('ERROR', 'Jira: Not enough parameters for worklog.');
        return $q.reject('Jira: Not enough parameters for worklog.');
      }
    };

    this.getTransitionsForIssue = (task) => {
      if (this.isJiraTask(task)) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'listTransitions',
          arguments: [task.originalKey]
        };
        return this.sendRequest(request);
      } else {
        SimpleToast('ERROR', 'Jira Request failed: Not a real ' + ISSUE_TYPE + ' issue.');
        return $q.reject('Not a real ' + ISSUE_TYPE + ' issue.');
      }
    };

    this.transitionIssue = (task, transitionObj, localType) => {
      let defer = $q.defer();

      function transitionSuccess(res) {
        // update
        task.status = localType;
        task.originalStatus = transitionObj;

        // set original update to now to prevent showing this as task update
        task.originalUpdated = moment().format(JIRA_DATE_FORMAT);

        SimpleToast('SUCCESS', 'Jira: Updated task status to \'' + (transitionObj.name || localType) + '\'');
        defer.resolve(res);
      }

      this.checkUpdatesForTicket(task)
        .then(() => {
          let request = {
            config: $localStorage.jiraSettings,
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
    };

    this.getSuggestions = () => {
      let options = {
        maxResults: MAX_RESULTS,
        fields: SUGGESTION_FIELDS_TO_GET
      };

      if (isSufficientJiraSettings() && $localStorage.jiraSettings.jqlQuery) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'searchJira',
          arguments: [$localStorage.jiraSettings.jqlQuery, options]
        };
        return this.sendRequest(request);
      } else {
        return $q.reject('Insufficient settings');
      }
    };

    this.sendRequest = (request) => {
      if (!$localStorage.jiraSettings) {
        $log.log('NO SETTINGS DEFINED');
        return;
      }

      if (IS_ELECTRON) {
        // assign uuid to request to know which responsive belongs to which promise
        request.requestId = Uid();
        let defer = $q.defer();
        // save to request log
        this.requestsLog[request.requestId] = {
          defer,
          requestMethod: request.apiMethod,
          clientRequest: request,
          timeout: $timeout(() => {
            SimpleToast('ERROR', 'Jira Request timed out for ' + request.apiMethod);
            // delete entry for promise
            delete this.requestsLog[request.requestId];
          }, REQUEST_TIMEOUT)
        };

        // send to electron
        window.ipcRenderer.send(IPC_JIRA_MAKE_REQUEST_EVENT, request);

        return defer.promise;
      } else {
        return $q.when(null);
      }
    };

    this.checkForUpdates = (tasks) => {
      const TasksUtil = $injector.get('TasksUtil');
      const defer = $q.defer();

      let tasksToPoll = TasksUtil.flattenTasks(tasks, this.isJiraTask, this.isJiraTask);
      // execute requests sequentially to have a little more time
      let pollPromise = tasksToPoll.reduce((promise, task) =>
        promise.then(() =>
          this.checkUpdatesForTicket(task)
            .then((isUpdated) => {
              taskIsUpdatedHandler(isUpdated, task);
            }, defer.reject)
        ), Promise.resolve()
      );

      pollPromise
        .then(() => {
          defer.resolve();
        });

      return defer.promise;
    };

    function taskIsUpdatedHandler(updatedTask) {
      if (updatedTask) {
        Notifier({
          title: 'Jira Update',
          message: '"' + updatedTask.title + '" => has been updated as it was updated on Jira.',
          sound: true,
          wait: true
        });
        SimpleToast('"' + updatedTask.title + '" => has been updated as it was updated on Jira.');
      }
    }

    this.checkUpdatesForTaskOrParent = (task, isNoNotify) => {
      const Tasks = $injector.get('Tasks');
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
            taskIsUpdatedHandler(updatedTask);
          });
        }
      }
    };

    // TODO safer auth
    this.auth = () => {
    };
  }

})();
