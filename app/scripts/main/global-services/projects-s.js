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
  function Projects(LS_DEFAULTS, $localStorage, Uid, $window, SimpleToast, $injector) {
    const GLOBAL_LS_FIELDS = [
      'currentProject',
      'projects'
    ];

    const TMP_FIELDS = [
      '$$hashKey',
      '$$mdSelectId',
      'bodyClass',
    ];

    const OMITTED_LS_FIELDS = GLOBAL_LS_FIELDS.concat(TMP_FIELDS);

    this.getList = () => {
      return $localStorage.projects;
    };

    this.getAndUpdateCurrent = () => {
      let currentProject;
      if (!$localStorage.currentProject && $localStorage.projects.length > 0) {
        $localStorage.currentProject = $localStorage.projects[0];
      }

      // we need to use this, to establish an relationship between array entry and current
      if ($localStorage.currentProject) {
        currentProject = $window._.find($localStorage.projects, (project) => {
          return $localStorage.currentProject.id === project.id;
        });
        $localStorage.currentProject = currentProject;
      } else {
        return $localStorage.currentProject;
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
      if ($localStorage.projects.length > 0) {
        SimpleToast('ERROR', 'ERROR: There is already a project');
        return;
      }

      this.createNew(projectTitle, $localStorage);
    };

    this.createNew = (projectTitle, data) => {
      if (projectTitle && angular.isObject(data)) {
        // save new project
        let newProject = {
          title: projectTitle,
          id: Uid(),
          data: $window._.omit(LS_DEFAULTS, OMITTED_LS_FIELDS)
        };

        // update $localStorage.projects
        $localStorage.projects.push(newProject);

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
      const oldCurrentProject = angular.copy($localStorage.currentProject);
      const newCurrentProject = this.getById(newCurrentProjectParam.id);

      if (newCurrentProject && newCurrentProject.id && oldCurrentProject && oldCurrentProject.id !== newCurrentProject.id) {
        // when there is an old current project existing
        if (oldCurrentProject && oldCurrentProject.id) {
          // save all current project data in $localStorage.projects[oldProject]
          this.updateProjectData(oldCurrentProject.id, $localStorage);
        }
        // update with new model fields, if we change the model
        this.updateNewFields(newCurrentProject);
        // remove omitted fields if we saved them for some reason
        this.removeOmittedFields(newCurrentProject);

        // clean up $localStorage
        _.forOwn($localStorage, (val, property) => {
          if (!angular.isFunction(val) && GLOBAL_LS_FIELDS.indexOf(property) === -1) {
            $localStorage[property] = undefined;
          }
        });

        // load all other data from new project to $localStorage
        _.forOwn(newCurrentProject.data, (val, property) => {
          if (newCurrentProject.data.hasOwnProperty(property)) {
            $localStorage[property] = newCurrentProject.data[property];
          }
        });

        // update ls $localStorage current project
        $localStorage.currentProject = newCurrentProject;

        // re-init all global models
        InitGlobalModels();
      }
    };
  }

})();
