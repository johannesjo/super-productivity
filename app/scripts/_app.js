/**
 * @ngdoc overview
 * @name superProductivity
 * @description
 * # superProductivity
 *
 * Main module of the application.
 */

(function () {
  'use strict';

  // Electron stuff
  // require ipcRenderer if available
  if (typeof require === 'function') {
    window.isElectron = true;

    const { ipcRenderer } = require('electron');
    window.ipcRenderer = ipcRenderer;
  }

  // app initialization
  angular
    .module('superProductivity', [
      'ngAnimate',
      'ngAria',
      'ngResource',
      'ui.router',
      'ngStorage',
      'ngMaterial',
      'ngMdIcons',
      'as.sortable',
      'angularMoment',
      'hc.marked',
      'mwl.calendar',
      'ngOrderObjectBy'
    ])
    .config(configMdTheme)
    .config(configMarked)
    .run(initGlobalModels)
    .run(initPollCurrentTaskUpdates)
    .run(handleProjectChange)
    .run(initMousewheelZoomForElectron)
    .run(initGlobalShortcuts);

  function configMarked(markedProvider) {
    markedProvider.setRenderer({
      link: function (href, title, text) {
        return '<a href="' + href + '"' + (title ? ' title="' + title + '"' : ' ') + 'target="_blank" external-link class="md-accent">' + text + '</a>';
      }
    });
  }

  function configMdTheme($mdThemingProvider, THEMES) {
    $mdThemingProvider.theme('default')
      .primaryPalette('blue');
    //.dark();

    let themes = THEMES;
    for (let index = 0; index < themes.length; ++index) {
      $mdThemingProvider.theme(themes[index] + '-theme')
        .primaryPalette(themes[index]);
      $mdThemingProvider.enableBrowserColor({
        theme: themes[index] + '-theme', // Default is 'default'
        palette: 'accent', // Default is 'primary', any basic material palette and extended palettes are available
        hue: '400' // Default is '800'
      });
      $mdThemingProvider.theme(themes[index] + '-dark')
        .primaryPalette(themes[index])
        .dark();
      $mdThemingProvider.enableBrowserColor({
        theme: themes[index] + '-dark', // Default is 'default'
        palette: 'accent', // Default is 'primary', any basic material palette and extended palettes are available
        hue: '400' // Default is '800'
      });
    }

    $mdThemingProvider.alwaysWatchTheme(true);
  }

  function initGlobalModels(LS_DEFAULTS, DEFAULT_THEME, $rootScope, Tasks, $localStorage, Projects, $state) {
    $localStorage.$default(LS_DEFAULTS);

    // we don't use r.$state because it looks more like something special
    // this way
    $rootScope.$state = $state;

    $rootScope.r = {};

    $rootScope.r.projects = Projects.getList();

    $rootScope.r.tasks = Tasks.getToday();
    $rootScope.r.backlogTasks = Tasks.getBacklog();
    $rootScope.r.currentTask = Tasks.getCurrent();
    $rootScope.r.doneBacklogTasks = Tasks.getDoneBacklog();

    $rootScope.r.currentSession = $localStorage.currentSession;
    // reset after for every start
    $rootScope.r.currentSession.timeWorkedWithoutBreak = undefined;

    $rootScope.r.distractions = $localStorage.distractions;

    $rootScope.r.jiraSettings = $localStorage.jiraSettings;

    $rootScope.r.tomorrowsNote = $localStorage.tomorrowsNote;

    $rootScope.r.git = $localStorage.git;

    $rootScope.r.theme = $localStorage.theme || DEFAULT_THEME;

    if ($rootScope.r.theme.indexOf('dark') > -1) {
      $rootScope.r.bodyClass = 'dark-theme';
    } else {
      $rootScope.r.bodyClass = '';
    }

    // needs to be last for the updates from current data via the watcher!!!
    $rootScope.r.currentProject = Projects.getAndUpdateCurrent();
  }

  function initGlobalShortcuts($document, Dialogs) {
    // we just use this single one as this usually does mess
    // up with the default browser shortcuts
    // better to use the global electron shortcuts here
    $document.bind('keypress', (ev) => {

      // only trigger if not in typing mode
      if (ev.target.tagName !== 'INPUT' && ev.target.tagName !== 'TEXTAREA') {
        // on star
        if (ev.key === '*') {
          Dialogs('ADD_TASK', undefined, true);
        }
      }

      if (window.isElectron) {
        if (ev.keyCode === 10 && ev.ctrlKey === true && ev.shiftKey === true) {
          window.ipcRenderer.send('TOGGLE_DEV_TOOLS');
        }
      }
    });
  }

  function initPollCurrentTaskUpdates($rootScope, Jira, IS_ELECTRON, $interval, JIRA_UPDATE_POLL_INTERVAL) {
    // handle updates that need to be made locally
    if (IS_ELECTRON) {
      $interval(() => {
        if ($rootScope.r.currentTask) {
          Jira.checkUpdatesForTaskOrParent($rootScope.r.currentTask);
        }
      }, JIRA_UPDATE_POLL_INTERVAL);
    }
  }

  function handleProjectChange($rootScope, $localStorage, Projects, $state) {
    // TODO refactor
    $rootScope.$watch('r.currentProject', (newCurrentProject, oldCurrentProject) => {
      if (newCurrentProject && newCurrentProject.id && oldCurrentProject && oldCurrentProject.id !== newCurrentProject.id) {
        // when there is an old current project existing
        if (oldCurrentProject && oldCurrentProject.id) {
          // save all current project data in $localStorage.projects[oldProject]
          Projects.updateProjectData(oldCurrentProject.id, $localStorage);
        }
        // update with new model fields, if we change the model
        Projects.updateNewFields(newCurrentProject);
        // remove omitted fields if we saved them for some reason
        Projects.removeOmittedFields(newCurrentProject);

        // update $rootScope data and ls for current project
        $rootScope.r.currentProject = $localStorage.currentProject = newCurrentProject;

        // switch to new project if operation is successfull
        for (let property in newCurrentProject.data) {
          if (newCurrentProject.data.hasOwnProperty(property)) {
            $rootScope.r[property] = $localStorage[property] = newCurrentProject.data[property];
          }
        }

        $state.reload();
      }
    });
  }

  function initMousewheelZoomForElectron($document, $window, IS_ELECTRON) {
    if (IS_ELECTRON) {
      const { webFrame } = require('electron');

      $window.Hamster($document[0]).wheel(function (event, delta, deltaX, deltaY) {
        if (event.originalEvent && event.originalEvent.ctrlKey) {
          const zoomFactor = webFrame.getZoomFactor();
          if (deltaY === 1) {
            webFrame.setZoomFactor(zoomFactor + 0.05);
          } else if (deltaY === -1) {
            webFrame.setZoomFactor(zoomFactor - 0.05);
          }
        }
      });
    }
  }

})();
