/**
 * @ngdoc service
 * @name superProductivity.Projects
 * @description
 * # Projects
 * Service in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .service('Projects', Projects);

  /* @ngInject */
  function Projects(LS_DEFAULTS, $rootScope, Uid, $window, SimpleToast, $injector, GLOBAL_LS_FIELDS, EV_PROJECT_CHANGED, TMP_FIELDS, AppStorage) {

    const OMITTED_LS_FIELDS = GLOBAL_LS_FIELDS.concat(TMP_FIELDS);

    this.getList = () => {
      return $rootScope.r.projects;
    };

    this.getListWithLsData = () => {
      return AppStorage.getProjects();
    };

    this.getAndUpdateCurrent = () => {
      let currentProject;

      // set first to current if not set for some reason
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

    this.getWithLsDataById = (projectId) => {
      let projects = this.getListWithLsData();
      return _.find(projects, ['id', projectId]);
    };

    this.getById = (projectId) => {
      let projects = this.getListWithLsData();
      return _.find(projects, ['id', projectId]);
    };

    this.updateProjectTitle = (projectToUpdateId, newTitle) => {
      let projects = this.getListWithLsData();
      let projectToUpdate = $window._.find(projects, (project) => {
        return project.id === projectToUpdateId;
      });
      projectToUpdate.title = newTitle;
      AppStorage.saveProjects(projects);
    };

    this.updateProjectData = (projectToUpdateId, data) => {
      let projects = this.getListWithLsData();
      let projectToUpdate = $window._.find(projects, (project) => {
        return project.id === projectToUpdateId;
      });

      // prevent circular data structure via omit
      projectToUpdate.data = $window._.omit(data, OMITTED_LS_FIELDS);
      AppStorage.saveProjects(projects);
    };

    this.createNewFromCurrent = (projectTitle) => {
      const projects = this.getListWithLsData();

      if (projects && projects.length > 0) {
        SimpleToast('ERROR', 'ERROR: There is already a project');
        return;
      }

      this.createNew(projectTitle, $rootScope.r);
    };

    this.remove = (projectToRemove) => {
      const projects = this.getListWithLsData();
      const indexToDelete = projects.findIndex((lProj) => {
        return lProj.id === projectToRemove.id;
      });

      projects.splice(indexToDelete, 1);
      AppStorage.saveProjects(projects);

      // project has been deleted so show message already here
      // even if something below goes wrong
      SimpleToast('SUCCESS', projectToRemove.title + ' deleted!');

      // also delete from $rootScope
      const indexToDeleteViewModel = $rootScope.r.projects.findIndex((lProj) => {
        return lProj.id === projectToRemove.id;
      });
      $rootScope.r.projects.splice(indexToDeleteViewModel, 1);

    };

    this.createNew = (projectTitle, data) => {
      if (projectTitle && angular.isObject(data)) {
        data = $window._.omit(data, OMITTED_LS_FIELDS);

        // save new project
        let newProject = {
          title: projectTitle,
          id: Uid(),
          data: {}
        };

        this.updateNewFields(newProject);

        // update data for current new project from current data
        for (let field in data) {
          newProject.data[field] = data[field];
        }

        // update $rootScope.r.projects
        $rootScope.r.projects.push(newProject);

        // update ls
        const projects = this.getListWithLsData() || [];
        projects.push(newProject);
        AppStorage.saveProjects(projects);

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
      const newCurrentProject = this.getWithLsDataById(newCurrentProjectParam.id);

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
        _.forOwn($rootScope.r, (val, property) => {
          if (!angular.isFunction(val) && GLOBAL_LS_FIELDS.indexOf(property) === -1) {
            delete $rootScope.r[property];
          }
        });

        // load all other data from new project to $rootScope.r
        _.forOwn(newCurrentProject.data, (val, property) => {
          if (newCurrentProject.data.hasOwnProperty(property)) {
            $rootScope.r[property] = newCurrentProject.data[property];
          }
        });

        // update ls current project
        $rootScope.r.currentProject = newCurrentProject;

        // re-init all global models
        InitGlobalModels();

        // Show success message
        SimpleToast('SUCCESS', `Switched to project "${newCurrentProject.title}"`);

        $rootScope.$broadcast(EV_PROJECT_CHANGED);
      }
    };
  }

})();
