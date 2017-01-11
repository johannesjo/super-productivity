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
  function Jira(Uid, $q, $localStorage, $window, Dialogs, IS_ELECTRON) {
    const IPC_JIRA_CB_EVENT = 'JIRA_RESPONSE';
    const IPC_JIRA_MAKE_REQUEST_EVENT = 'JIRA';

    const MAX_RESULTS = 100;
    const ISSUE_TYPE = 'JIRA';
    const FIELDS_TO_GET = [
      'summary',
      'description',
      'timeestimate',
      'timespent',
      'status',
      'attachment'
    ];

    this.requestsLog = {};

    // set up callback listener for electron
    if (IS_ELECTRON) {
      window.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
        if (res.requestId) {
          // resolve saved promise
          if (!res || res.error) {
            console.log(res);
            this.requestsLog[res.requestId].reject(res);
          } else {
            this.requestsLog[res.requestId].resolve(res);
          }
          // delete entry for promise afterwards
          delete this.requestsLog[res.requestId];
        }
      });
    }

    this.updateStatus = (task, type) => {
      if (task.originalKey && task.originalType === ISSUE_TYPE) {
        if ($localStorage.jiraSettings.transitions && $localStorage.jiraSettings.transitions[type]) {
          if ($localStorage.jiraSettings.transitions[type] === 'DO_NOT') {
            return $q.reject('DO_NOT chosen');
          } else {
            console.log($localStorage.jiraSettings.transitions[type]);

            return this.transitionIssue(task.originalId, {
              id: $localStorage.jiraSettings.transitions[type]
            });
          }
        } else {
          // TODO the promise handling and setting up should be better
          let defer = $q.defer();
          this.getTransitionsForIssue(task).then((response) => {
            let transitions = response.response.transitions;
            return Dialogs('JIRA_SET_IN_PROGRESS', { transitions, task, type }).then((transition) => {
              defer.resolve(transition);
              this.transitionIssue(task.originalId, transition);
            });
          });
          return defer.promise;
        }
      }
    };

    this.transformIssues = (response) => {
      if (response) {
        let res = response.response;
        let tasks = [];

        for (let i = 0; i < res.issues.length; i++) {
          let issue = res.issues[i];
          let newTask = {
            title: issue.key + ' ' + issue.fields.summary,
            notes: issue.fields.description,
            originalType: ISSUE_TYPE,
            originalKey: issue.key,
            originalId: issue.id,
            originalStatus: issue.fields.status,
            originalAttachment: issue.fields.attachment,
            originalLink: 'https://' + $localStorage.jiraSettings.host + '/browse/' + issue.key,
            originalEstimate: issue.fields.timeestimate && $window.moment.duration({
              seconds: issue.fields.timeestimate
            }),
            originalTimeSpent: issue.fields.timespent && $window.moment.duration({
              seconds: issue.fields.timespent
            }),
          };

          tasks.push(newTask);
        }

        return tasks;
      }
    };

    this.getTransitionsForIssue = (task) => {
      if (task && task.originalKey) {
        let request = {
          config: $localStorage.jiraSettings,
          apiMethod: 'listTransitions',
          arguments: [task.originalKey],
          requestId: Uid()
        };
        return this.sendRequest(request);
      } else {
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
        }],
        requestId: Uid()
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
          arguments: [$localStorage.jiraSettings.jqlQuery, options],
          requestId: Uid()
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
