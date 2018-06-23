/**
 * @ngdoc service
 * @name superProductivity.$rootScope
 * @description
 * # $rootScope
 * Service in the superProductivity.
 */

(() => {
  'use strict';

  const PREFIX = 'ngStorage-';

  class AppStorage {
    /* @ngInject */
    constructor(LS_DEFAULTS, SAVE_APP_STORAGE_POLL_INTERVAL, TMP_FIELDS, $interval, $rootScope, ON_DEMAND_LS_FIELDS, ON_DEMAND_LS_FIELDS_FOR_PROJECT, IS_ELECTRON, SimpleToast, EV, $injector) {
      this.PROJECTS_KEY = 'projects';
      this.DONE_BACKLOG_TASKS_KEY = 'doneBacklogTasks';
      this.LS_DEFAULTS = LS_DEFAULTS;
      this.TMP_FIELDS = TMP_FIELDS;
      this.SAVE_APP_STORAGE_POLL_INTERVAL = SAVE_APP_STORAGE_POLL_INTERVAL;
      this.ON_DEMAND_LS_FIELDS = ON_DEMAND_LS_FIELDS;
      this.ON_DEMAND_LS_FIELDS_FOR_PROJECT = ON_DEMAND_LS_FIELDS_FOR_PROJECT;
      this.IS_ELECTRON = IS_ELECTRON;
      this.EV = EV;
      this.$rootScope = $rootScope;
      this.$injector = $injector;
      this.SimpleToast = SimpleToast;
      this.$interval = $interval;
      this.serializer = angular.toJson;
      this.deserializer = angular.fromJson;

      this.setupPollingForSavingCurrentState();

      // this is really nice for debugging but we don't want to use it for
      // actual saving the data as it is costly to run
      //window.watch(this.s, function(prop, action, difference, oldvalue) {
      //  console.log(prop, action, difference, oldvalue);
      //}, 5);
    }

    getCompleteBackupData() {
      const data = angular.copy(this.getCurrentAppState());
      // also add projects data
      data[this.PROJECTS_KEY] = this.getProjects();
      // also add backlog tasks
      data[this.DONE_BACKLOG_TASKS_KEY] = this.getDoneBacklogTasks();
      return data;
    }

    setupPollingForSavingCurrentState() {
      this.updateLsInterval = this.$interval(() => {
        this.saveToLs();
      }, this.SAVE_APP_STORAGE_POLL_INTERVAL);
    }

    // gets the current state of the app excluding tmp variables and the projects
    getCurrentAppState() {
      const currentState = {};
      for (let key in this.LS_DEFAULTS) {
        const isNoTmpField = (this.TMP_FIELDS.indexOf(key) === -1);
        const isNoOnDemand = (this.ON_DEMAND_LS_FIELDS.indexOf(key) === -1);
        const isNotProjects = (key !== this.PROJECTS_KEY);
        // make mobile safari happy
        if (!this.$rootScope.r) {
          this.$rootScope.r = {};
        }
        if (this.LS_DEFAULTS.hasOwnProperty(key) && isNoOnDemand && isNoTmpField && isNotProjects) {
          currentState[key] = this.$rootScope.r[key];
        }
      }
      return currentState;
    }

    getDoneBacklogTasks(projectId) {
      const projects = this.getProjects();
      projectId = projectId || this.$rootScope.r.currentProject && this.$rootScope.r.currentProject.id;

      if (projects && projectId) {
        const currentProject = _.find(projects, ['id', projectId]);
        return currentProject.data[this.DONE_BACKLOG_TASKS_KEY];
      } else {
        return this.getLsItem(this.DONE_BACKLOG_TASKS_KEY);
      }
    }

    saveDoneBacklogTasks(doneBacklogTasks, projectId) {
      if (Array.isArray(doneBacklogTasks)) {
        const projects = this.getProjects();
        projectId = projectId || this.$rootScope.r.currentProject && this.$rootScope.r.currentProject.id;

        // we also need to save the backlog tasks to the current project
        if (projects && projectId) {
          const currentProject = _.find(projects, ['id', projectId]);

          currentProject.data[this.DONE_BACKLOG_TASKS_KEY] = doneBacklogTasks;
          this.saveProjects(projects);
        } else {
          this.saveLsItem(doneBacklogTasks, this.DONE_BACKLOG_TASKS_KEY);
        }
      }
    }

    saveToLs() {
      const currentState = this.getCurrentAppState();
      for (let key in currentState) {
        this.saveLsItem(currentState[key], key);
      }
    }

    loadLsDataToApp() {
      const Projects = this.$injector.get('Projects');
      const InitGlobalModels = this.$injector.get('InitGlobalModels');
      // sync initially
      this.$rootScope.r = this.getCurrentLsWithReducedProjects();
      Projects.getAndUpdateCurrent();
      InitGlobalModels();
    }

    importData(data) {
      this.SimpleToast('CUSTOM', 'Data updated from the outside. Updating...', 'update');

      try {
        // cancel saving current app data to ls
        if (this.updateLsInterval) {
          this.$interval.cancel(this.updateLsInterval);
        }

        _.forOwn(data, (val, key) => {
          this.saveLsItem(val, key);
        });
        this.loadLsDataToApp();

        this.$rootScope.$broadcast(this.EV.COMPLETE_DATA_RELOAD);
        this.SimpleToast('SUCCESS', 'Successfully imported data.');

      } catch (e) {
        console.error(e);
        this.SimpleToast('ERROR', 'Something went wrong importing your data.');
      }
    }

    getProjects() {
      return this.getLsItem(this.PROJECTS_KEY);
    }

    saveProjects(data) {
      this.saveLsItem(data, this.PROJECTS_KEY);
    }

    getLsItem(key) {
      const lsStr = window.localStorage.getItem(PREFIX + key);
      if (lsStr) {
        return this.deserializer(lsStr);
      }
    }

    saveLsItem(data, key) {
      const strToSave = data ? this.serializer(data) : '';
      window.localStorage.setItem(PREFIX + key, strToSave);
    }

    makeProjectsSimple(projects) {
      // remove on demand fields
      _.each(projects, (project) => {
        _.forOwn(project, (val, prop) => {
          if (this.ON_DEMAND_LS_FIELDS_FOR_PROJECT.indexOf(prop) !== -1) {
            delete project[prop];
          }
        });
      });
      return projects;
    }

    getDefaultsForDeepObject(newConfigObj, originalConfigObj) {
      if (!originalConfigObj) {
        return newConfigObj;
      }

      const keys = Object.keys(originalConfigObj);
      const newObj = {};

      keys.forEach((key) => {
        const item = newConfigObj[key];

        // reassign to original value, but only when the item is undefined
        if (item === undefined) {
          newObj[key] = originalConfigObj[key];
        } else {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            newObj[key] = this.getDefaultsForDeepObject(item, originalConfigObj[key]);
          } else {
            newObj[key] = newConfigObj[key];
          }

        }
      });

      return newObj;
    }

    getCurrentLsWithReducedProjects() {
      const data = {};
      const keys = Object.keys(this.LS_DEFAULTS);

      keys.forEach((key) => {
        const item = this.getLsItem(key);

        // reassign to original value, but only when the item is undefined
        if (item === undefined) {
          data[key] = this.LS_DEFAULTS[key];

        } else {
          // deep check object defaults
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            data[key] = this.getDefaultsForDeepObject(item, this.LS_DEFAULTS[key]);
          } else {
            data[key] = item;
          }

          if (key === this.PROJECTS_KEY) {
            const projects = data[key];
            this.makeProjectsSimple(projects);
          }
        }
      });

      return data;
    }
  }

  angular
    .module('superProductivity')
    .service('AppStorage', AppStorage);

  // hacky fix for ff
  AppStorage.$$ngIsClass = true;
})();
