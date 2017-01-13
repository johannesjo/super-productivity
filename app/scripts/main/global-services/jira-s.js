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
  function Jira(Uid, $q, $localStorage, $window, Dialogs, IS_ELECTRON, SimpleToast) {
    const IPC_JIRA_CB_EVENT = 'JIRA_RESPONSE';
    const IPC_JIRA_MAKE_REQUEST_EVENT = 'JIRA';

    // it's weird!!
    const JIRA_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';

    const MAX_RESULTS = 100;
    const ISSUE_TYPE = 'JIRA';
    const FIELDS_TO_GET = [
      'summary',
      'description',
      'timeestimate',
      'timespent',
      'status',
      'attachment',
      'comment',
      'updated'
    ];

    this.requestsLog = {};

    // set up callback listener for electron
    if (IS_ELECTRON) {
      window.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
        if (res.requestId) {
          // resolve saved promise
          if (!res || res.error) {
            console.log(res);
            SimpleToast('Jira Request failed: ' + (res && res.error));
            this.requestsLog[res.requestId].reject(res);
          } else {
            this.requestsLog[res.requestId].resolve(res);
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
        originalEstimate: issue.fields.timeestimate && $window.moment.duration({
          seconds: issue.fields.timeestimate
        }),
        originalTimeSpent: issue.fields.timespent && $window.moment.duration({
          seconds: issue.fields.timespent
        }),
      };
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
      if (task.originalKey && task.originalType === ISSUE_TYPE) {
        if ($localStorage.jiraSettings.transitions && $localStorage.jiraSettings.transitions[type]) {
          if ($localStorage.jiraSettings.transitions[type] === 'DO_NOT') {
            return $q.reject('DO_NOT chosen');
          } else {
            if (task.status !== type) {
              return this.transitionIssue(task.originalId, {
                id: $localStorage.jiraSettings.transitions[type]
              })
                .then(() => {
                  // update
                  task.status = type;
                });
            } else {
              return $q.resolve('NO NEED TO UPDATE');
            }
          }
        } else {
          let defer = $q.defer();
          this.getTransitionsForIssue(task)
            .then((response) => {
              let transitions = response.response.transitions;
              Dialogs('JIRA_SET_IN_PROGRESS', { transitions, task, type })
                .then((transition) => {
                  defer.resolve(transition);
                  this.transitionIssue(task.originalId, transition)
                    .then(defer.resolve, defer.reject);
                }, defer.reject);
            }, defer.reject);
          return defer.promise;
        }
      }
    };

    this.checkUpdatesForTicket = (task) => {
      let defer = $q.defer();
      if (task && task.originalKey) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'findIssue',
          arguments: [task.originalKey]
        };
        this.sendRequest(request)
          .then((res) => {
              let issue = res.response;
              if (issue.fields.updated === task.originalUpdated) {
                defer.resolve(false);
              } else {
                // extend task with new values
                angular.extend(task, mapIssue(issue));
                defer.resolve(true);
                task.isUpdated = true;
              }
            }, defer.reject
          );

        return defer.promise;
      } else {
        SimpleToast('Jira Request failed: Not a real ' + ISSUE_TYPE + ' issue.');
        return $q.reject('Not a real ' + ISSUE_TYPE + ' issue.');
      }
    };

    this.addWorklog = (task) => {

      if (task.originalKey && task.originalType === ISSUE_TYPE) {
        if ($localStorage.jiraSettings.isWorklogEnabled) {
          if ($localStorage.jiraSettings.isAutoWorklog) {
            return this._addWorklog(task.originalKey, task.started, task.timeSpent);
          } else {

            let defer = $q.defer();

            Dialogs('JIRA_ADD_WORKLOG', { task })
              .then((taskCopy) => {
                this._addWorklog(taskCopy.originalKey, taskCopy.started, taskCopy.timeSpent, taskCopy.comment)
                  .then(defer.resolve, defer.reject);
              }, defer.reject);

            return defer.promise;
          }
        }
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
            comment: comment,
            //timeSpentSeconds: 12000
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
        fields: FIELDS_TO_GET
      };

      if ($localStorage.jiraSettings && $localStorage.jiraSettings.userName && $localStorage.jiraSettings.password && $localStorage.jiraSettings.password && $localStorage.jiraSettings.jqlQuery) {
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
        console.log('NO SETTINGS DEFINED');
        return;
      }

      if (IS_ELECTRON) {
        // assign uuid to request to know which responsive belongs to which promise
        request.requestId = Uid();
        let defer = $q.defer();
        // save to request log
        this.requestsLog[request.requestId] = defer;
        // send to electron
        window.ipcRenderer.send(IPC_JIRA_MAKE_REQUEST_EVENT, request);

        return defer.promise;
      } else {
        return $q.when(null);
      }
    };

    // TODO safer auth
    this.auth = () => {
    };
  }

})();
