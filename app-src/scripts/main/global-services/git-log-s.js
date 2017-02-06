/**
 * @ngdoc service
 * @name superProductivity.GitLog
 * @description
 * # GitLog
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('GitLog', GitLog);

  /* @ngInject */
  function GitLog($q, Uid, $localStorage, IS_ELECTRON) {

    // AngularJS will instantiate a singleton by calling "new" on this function const IPC_JIRA_CB_EVENT = 'JIRA_RESPONSE';
    const IPC_GIT_LOG_EVENT = 'GIT_LOG';
    const IPC_GIT_LOG_CB = 'GIT_LOG_RESPONSE';

    this.requestsLog = {};

    // set up callback listener for electron
    if (IS_ELECTRON) {
      window.ipcRenderer.on(IPC_GIT_LOG_CB, (ev, res) => {
        if (res.requestId) {
          // resolve saved promise
          if (!res || res.error) {
            this.requestsLog[res.requestId].reject(res);
          } else {
            this.requestsLog[res.requestId].resolve(res.stdout);
          }
          // delete entry for promise afterwards
          delete this.requestsLog[res.requestId];
        }
      });
    }

    this.get = (cwd) => {
      if (IS_ELECTRON && $localStorage.git && $localStorage.git.projectDir) {
        let uid = Uid();
        let defer = $q.defer();
        // save to request log
        this.requestsLog[uid] = defer;
        // send to electron
        window.ipcRenderer.send(IPC_GIT_LOG_EVENT, {
          requestId: uid,
          cwd: cwd
        });
        return defer.promise;
      } else {
        return $q.when(null);
      }
    };
  }

})();
