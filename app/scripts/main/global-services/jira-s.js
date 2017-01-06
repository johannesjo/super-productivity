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
  function Jira($q, $localStorage) {
    const IPC_JIRA_CB_EVENT = 'JIRA_RESPONSE';
    const IPC_JIRA_MAKE_REQUEST_EVENT = 'JIRA';

    this.requestsLog = {};

    if (angular.isDefined(window.ipcRenderer)) {
      window.ipcRenderer.on(IPC_JIRA_CB_EVENT, (ev, res) => {
        console.log('RES', res);

        if (res.requestId) {
          // resolve saved promise
          this.requestsLog[res.requestId].resolve(res);
          // delete entry for promise afterwards
          delete this.requestsLog[res.requestId];
        }
      });
    }

    this.getSuggestions = () => {
      let testRequest = {
        config: $localStorage.jiraSettings,
        apiMethod: 'searchJira',
        arguments: [$localStorage.jiraSettings.jqlQuery, false],
        requestId: Math.random().toString(36).substr(2, 10)
      };

      return this.sendRequest(testRequest);
    };

    this.transformIssues = (response) => {
      if (response) {
        let res = response.response;
        let tasks = [];

        for (let i = 0; i < res.issues.length; i++) {
          let issue = res.issues[i];
          // TODO try to get estimated as well
          tasks.push({
            title: issue.key + ' ' + issue.fields.summary,
            notes: issue.fields.description,
            originalKey: issue.key,
            originalLink: 'https://' + $localStorage.jiraSettings.host + '/browse/' + issue.key
          });
        }

        return tasks;
      }
    };

    this.sendRequest = (request) => {
      if (!$localStorage.jiraSettings) {
        console.log('NO SETTINGS DEFINED');
        return;
      }

      if (angular.isDefined(window.ipcRenderer)) {
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
