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
  function Tasks($localStorage, $q, $window, $rootScope) {
    const IPC_EVENT_UPDATE = 'LS_UPDATE';
    const IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT = 'UPDATE_TIME_SPEND';

    $localStorage.$default({
      currentTask: null,
      tasks: [],
      backlogTasks: []
    });

    // UTILITY

    if (angular.isDefined(window.ipcRenderer)) {
      window.ipcRenderer.on(IPC_EVENT_UPDATE_TIME_SPEND_FOR_CURRENT, (ev, timeSpend) => {
        let timeSpendCalculated;
        let currentInAllTasks = $window._.find($localStorage.tasks, { id: $localStorage.currentTask.id });

        if ($localStorage.currentTask.timeSpend) {
          timeSpendCalculated = $window.moment.duration($localStorage.currentTask.timeSpend);
          timeSpendCalculated.add($window.moment.duration({ milliseconds: timeSpend }));
        } else {
          timeSpendCalculated = $window.moment.duration(timeSpend);
        }

        currentInAllTasks.timeSpend = timeSpendCalculated;
        $localStorage.currentTask.timeSpend = timeSpendCalculated;

        // we need to manually call apply as this is an outside event
        $rootScope.$apply();

      });
    }

    this.updateElectronStorage = () => {
      if (angular.isDefined(window.ipcRenderer)) {
        window.ipcRenderer.send(IPC_EVENT_UPDATE, {
          currentTask: $localStorage.currentTask,
          tasks: $localStorage.tasks,
          backlogTasks: $localStorage.backlogTasks
        });
      }
    };

    // GET DATA
    this.getCurrent = () => {
      return $q.when($localStorage.currentTask);
    };

    this.getBacklog = () => {
      return $q.when($localStorage.backlogTasks);
    };

    this.getToday = () => {
      return $q.when($localStorage.tasks);
    };

    // UPDATE DATA
    this.updateCurrent = (task) => {
      $localStorage.currentTask = task;
      this.updateElectronStorage();
      return $q.when({});
    };

    this.updateToday = (tasks) => {
      $localStorage.tasks = tasks;
      this.updateElectronStorage();
      return $q.when({});
    };

    this.updateBacklog = (tasks) => {
      $localStorage.backlogTasks = tasks;
      this.updateElectronStorage();
      return $q.when({});
    };

    // AngularJS will instantiate a singleton by calling "new" on this function
  }

})();
