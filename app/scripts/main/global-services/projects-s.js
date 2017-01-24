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
  function Projects(LS_DEFAULTS, $localStorage, $rootScope, Uid, $window, SimpleToast) {
    const OMITTED_LS_FIELDS = ['currentProject', 'tomorrowsNote', 'projects', '$$hashKey', '$$mdSelectId', 'bodyClass'];

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
        $rootScope.r.currentProject = $localStorage.currentProject = currentProject;
      } else {
        $rootScope.r.currentProject = $localStorage.currentProject;
        return $rootScope.r.currentProject;
      }
      return currentProject;
    };

    this.updateProjectData = (projectToUpdateId, data) => {
      let projects = this.getList();
      let projectToUpdate = $window._.find(projects, (project) => {
        return project.id === projectToUpdateId;
      });

      // add default values to project
      // prevent circular data structure via omit
      angular.extend(projectToUpdate.data, $window._.omit(data, OMITTED_LS_FIELDS));
    };

    this.createNewFromCurrent = (projectTitle) => {
      if ($localStorage.projects.length > 0) {
        SimpleToast('ERROR: There is already a project');
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

        // update $localStorage.projects
        $localStorage.projects.push(newProject);

        // update data for current new project from current ls data
        this.updateProjectData(newProject.id, data);

        // switch to new project
        $rootScope.r.currentProject = $localStorage.currentProject = newProject;
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
  }

})();
