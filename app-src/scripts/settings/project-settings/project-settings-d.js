/**
 * @ngdoc directive
 * @name superProductivity.directive:projectSettings
 * @description
 * # projectSettings
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('projectSettings', projectSettings);

  /* @ngInject */
  function projectSettings() {
    return {
      templateUrl: 'scripts/settings/project-settings/project-settings-d.html',
      bindToController: true,
      controller: ProjectSettingsCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        allProjects: '=',
        selectedCurrentProject: '='
      }
    };
  }

  /* @ngInject */
  function ProjectSettingsCtrl(Projects, Dialogs, SimpleToast, $mdDialog, $rootScope) {
    let vm = this;

    // save project stuff
    vm.createNewProjectFromCurrent = (projectTitle) => {
      Projects.createNewFromCurrent(projectTitle);
      SimpleToast('SUCCESS', 'Project "' + projectTitle + '" successfully saved');
      Projects.getAndUpdateCurrent();
    };

    vm.createNewProject = () => {
      Dialogs('CREATE_PROJECT');
    };

    vm.deleteProject = (project) => {
      if (project.id === $rootScope.r.currentProject.id) {
        SimpleToast('ERROR', 'Cannot delete ' + project.title + ' as it is the current project!');
      } else {
        let confirm = $mdDialog.confirm()
          .title('Would you like to delete ' + project.title + '?')
          .textContent('All tasks and settings will be lost forever.')
          .ariaLabel('Delete Project')
          .ok('Please do it!')
          .cancel('Better not');

        $mdDialog.show(confirm).then(function () {
          Projects.remove(project);
        });
      }
    };

    vm.changeProject = (project) => {
      Projects.changeCurrent(project);
    };
  }

})();
