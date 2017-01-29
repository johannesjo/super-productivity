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
            SimpleToast('Jira Request failed: ' + currentRequest.clientRequest.apiMethod + ' – ' + (res && res.error));
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
          // we also add 2 seconds because of the millisecond difference
          // for issue updated and historyEntry.created
          let lastUpdate = task.originalUpdated && moment(task.originalUpdated).add(2, 'second');
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
      return $localStorage.jiraSettings && $localStorage.jiraSettings.host && $localStorage.jiraSettings.userName && $localStorage.jiraSettings.password && $localStorage.jiraSettings.password;
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

    this.updateStatus = (task, type) => {
      const defer = $q.defer();
      const that = this;

      function transitionSuccess(res) {
        that.checkUpdatesForTaskOrParent(task, true);

        // update
        task.status = type;
        defer.resolve(res);
      }

      if (task.originalKey && task.originalType === ISSUE_TYPE) {
        if ($localStorage.jiraSettings.transitions && $localStorage.jiraSettings.transitions[type] && $localStorage.jiraSettings.transitions[type] !== 'ALWAYS_ASK') {
          if ($localStorage.jiraSettings.transitions[type] === 'DO_NOT') {
            defer.reject('DO_NOT chosen');
          } else {
            if (task.status !== type) {
              this.transitionIssue(task.originalId, {
                id: $localStorage.jiraSettings.transitions[type]
              })
                .then(transitionSuccess, defer.reject);
            } else {
              defer.resolve('NO NEED TO UPDATE');
            }
          }
        } else {
          this.getTransitionsForIssue(task)
            .then((response) => {
              let transitions = response.response.transitions;
              Dialogs('JIRA_SET_IN_PROGRESS', { transitions, task, type })
                .then((transition) => {
                  this.transitionIssue(task.originalId, transition)
                    .then(transitionSuccess, defer.reject);
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

      if (task.originalKey && task.notes) {
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
          SimpleToast('Jira: Description updated for ' + task.originalKey);
        });
      } else {
        SimpleToast('Jira: Not enough parameters for updateIssueDescription.');
        return $q.reject('Jira: Not enough parameters for updateIssueDescription.');
      }
    };

    this.checkUpdatesForTicket = (task, isNoNotify) => {
      let defer = $q.defer();
      if (task && task.originalKey) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'findIssue',
          arguments: [task.originalKey, 'changelog']
        };
        this.sendRequest(request)
          .then((res) => {
              let issue = res.response;
              if (issue.fields.updated === task.originalUpdated) {
                defer.resolve(false);
              } else {
                if (!isNoNotify) {
                  // add changelog entries
                  mapAndAddChangelogToTask(task, issue);
                  task.isUpdated = true;
                }
                // extend task with new values
                angular.extend(task, mapIssue(issue));

                defer.resolve(true);
              }
            }, defer.reject
          );

        return defer.promise;
      } else {
        SimpleToast('Jira Request failed: Not a real ' + ISSUE_TYPE + ' issue.');
        return $q.reject('Not a real ' + ISSUE_TYPE + ' issue.');
      }
    };

    this.addWorklog = (originalTask) => {
      const Tasks = $injector.get('Tasks');

      // WE'RE always copying the task for add work log
      // so no data should be added back by this call!
      let task = angular.copy(originalTask);
      let comment;

      if ($localStorage.jiraSettings.isWorklogEnabled) {

        // use parent task option if enabled
        if ($localStorage.jiraSettings.isAddWorklogOnSubTaskDone) {
          if (task.parentId) {
            let parentTaskCopy = angular.copy(Tasks.getById(task.parentId));
            if (parentTaskCopy && parentTaskCopy.originalKey && parentTaskCopy.originalType === ISSUE_TYPE) {

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

        if (task.originalKey && task.originalType === ISSUE_TYPE) {
          if ($localStorage.jiraSettings.isAutoWorklog) {
            return this._addWorklog(task.originalKey, task.started, task.timeSpent);
          } else {

            let defer = $q.defer();
            Dialogs('JIRA_ADD_WORKLOG', { task, comment })
              .then((taskCopy) => {
                this._addWorklog(taskCopy.originalKey, taskCopy.started, taskCopy.timeSpent, taskCopy.comment)
                  .then((res) => {
                    SimpleToast('Jira: Updated worklog for ' + taskCopy.originalKey + ' by ' + parseInt(taskCopy.timeSpent.asMinutes()) + 'm.');
                    defer.resolve(res);
                  }, defer.reject);
              }, defer.reject);

            return defer.promise;
          }
        }
      } else {
        return $q.reject('Jira: Task or Parent Task are no Jira Tasks.');
      }
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
        SimpleToast('Jira: Not enough parameters for worklog.');
        return $q.reject('Jira: Not enough parameters for worklog.');
      }
    };

    this.getTransitionsForIssue = (task) => {
      if (task && task.originalKey) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'listTransitions',
          arguments: [task.originalKey]
        };
        return this.sendRequest(request);
      } else {
        SimpleToast('Jira Request failed: Not a real ' + ISSUE_TYPE + ' issue.');
        return $q.reject('Not a real ' + ISSUE_TYPE + ' issue.');
      }
    };

    this.transitionIssue = (issueId, transitionObj) => {
      let request = {
        config: $localStorage.jiraSettings,
        apiMethod: 'transitionIssue',
        arguments: [issueId, {
          transition: {
            id: transitionObj.id
          }
        }]
      };
      return this.sendRequest(request);
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
            SimpleToast('Jira Request timed out for ' + request.apiMethod);
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
        if (task && task.originalKey) {
          this.checkUpdatesForTicket(task, isNoNotify).then((isUpdated) => {
            if (isUpdated && !isNoNotify) {
              Notifier({
                title: 'Jira Update',
                message: '"' + task.title + '" => has been updated as it was updated on Jira.',
                sound: true,
                wait: true
              });
              SimpleToast('"' + task.title + '" => has been updated as it was updated on Jira.');
            }
          });
        }
      }
    };

    // TODO safer auth
    this.auth = () => {
    };
  }

})();
