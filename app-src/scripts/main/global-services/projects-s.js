/**
 * @ngdoc service
 * @name superProductivity.Projects
 * @description
 * # Projects
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('Projects', Projects);

  /* @ngInject */
  function Projects(LS_DEFAULTS, $rootScope, Uid, $window, SimpleToast, $injector, GLOBAL_LS_FIELDS, EV_PROJECT_CHANGED) {
    const TMP_FIELDS = [
      '$$hashKey',
      '$$mdSelectId',
      'bodyClass',
    ];

    const OMITTED_LS_FIELDS = GLOBAL_LS_FIELDS.concat(TMP_FIELDS);

    this.getList = () => {
      return $rootScope.r && $rootScope.r.projects;
    };

    this.getAndUpdateCurrent = () => {
      let currentProject;
      if (!$rootScope.r.currentProject && $rootScope.r.projects.length > 0) {
        $rootScope.r.currentProject = $rootScope.r.projects[0];
      }

      // we need to use this, to establish an relationship between array entry and current
      if ($rootScope.r.currentProject) {
        currentProject = $window._.find($rootScope.r.projects, (project) => {
          return $rootScope.r.currentProject.id === project.id;
        });
        $rootScope.r.currentProject = currentProject;
      } else {
        return $rootScope.r.currentProject;
      }

      return currentProject;
    };

    this.getById = (projectId) => {
      let projects = this.getList();
      return _.find(projects, ['id', projectId]);
    };

    this.updateProjectData = (projectToUpdateId, data) => {
      let projects = this.getList();
      let projectToUpdate = $window._.find(projects, (project) => {
        return project.id === projectToUpdateId;
      });

      // prevent circular data structure via omit
      projectToUpdate.data = $window._.omit(data, OMITTED_LS_FIELDS);
    };

    this.createNewFromCurrent = (projectTitle) => {
      if ($rootScope.r.projects.length > 0) {
        SimpleToast('ERROR', 'ERROR: There is already a project');
        return;
      }

      this.createNew(projectTitle, $rootScope.r);
    };

    this.createNew = (projectTitle, data) => {
      if (projectTitle && angular.isObject(data)) {
        // save new project
        let newProject = {
          title: projectTitle,
          id: Uid(),
          data: $window._.omit(LS_DEFAULTS, OMITTED_LS_FIELDS)
        };

        // update $rootScope.r.projects
        $rootScope.r.projects.push(newProject);

        // update data for current new project from current data
        this.updateProjectData(newProject.id, data);

        // switch to new project
        this.changeCurrent(newProject);
      }
    };

    // we need to do this add new fields
    this.updateNewFields = (project) => {
      if (project) {
        for (let property in LS_DEFAULTS) {
          if (LS_DEFAULTS.hasOwnProperty(property) && !project.data.hasOwnProperty(property) && OMITTED_LS_FIELDS.indexOf(property) === -1) {
            project.data[property] = LS_DEFAULTS[property];
          }
        }
      }
    };

    this.removeOmittedFields = (newCurrentProject) => {
      if (newCurrentProject) {
        for (let property in newCurrentProject.data) {
          if (newCurrentProject.data.hasOwnProperty(property) && OMITTED_LS_FIELDS.indexOf(property) > -1) {
            delete newCurrentProject.data[property];
          }
        }
      }
    };

    this.changeCurrent = (newCurrentProjectParam) => {
      const InitGlobalModels = $injector.get('InitGlobalModels');
      const oldCurrentProject = angular.copy($rootScope.r.currentProject);
      const newCurrentProject = this.getById(newCurrentProjectParam.id);

      if (newCurrentProject && newCurrentProject.id && oldCurrentProject && oldCurrentProject.id !== newCurrentProject.id) {
        // when there is an old current project existing
        if (oldCurrentProject && oldCurrentProject.id) {
          // save all current project data in $rootScope.r.projects[oldProject]
          this.updateProjectData(oldCurrentProject.id, $rootScope.r);
        }
        // update with new model fields, if we change the model
        this.updateNewFields(newCurrentProject);
        // remove omitted fields if we saved them for some reason
        this.removeOmittedFields(newCurrentProject);

        // clean up $rootScope.r
        _.forOwn($rootScope, (val, property) => {
          if (!angular.isFunction(val) && GLOBAL_LS_FIELDS.indexOf(property) === -1) {
            $rootScope.r[property] = undefined;
          }
        });

        // load all other data from new project to $rootScope.r
        _.forOwn(newCurrentProject.data, (val, property) => {
          if (newCurrentProject.data.hasOwnProperty(property)) {
            $rootScope.r[property] = newCurrentProject.data[property];
          }
        });

        // update ls $rootScope.r current project
        $rootScope.r.currentProject = newCurrentProject;
        $rootScope.$broadcast(EV_PROJECT_CHANGED);
        // re-init all global models
        InitGlobalModels();
      }
    };
  }

})();
