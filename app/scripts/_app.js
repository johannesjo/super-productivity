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
      'angularMoment'
    ])
    .constant('DEFAULT_THEME', 'teal-theme')
    .constant('LS_DEFAULTS', {
      theme: undefined,
      currentTask: undefined,
      currentProject: undefined,
      tasks: [],
      backlogTasks: [],
      distractions: [],
      projects: [],
      git: {
        projectDir: undefined
      },
      jiraSettings: {
        isFirstLogin: true,
        defaultTransitionInProgress: undefined,
        defaultTransitionDone: undefined,
      }
    })
    .constant('IS_ELECTRON', (typeof window.ipcRenderer !== 'undefined'))
    .constant('THEMES', [
        'red',
        'pink',
        'purple',
        'deep-purple',
        'indigo',
        'blue',
        'light-blue',
        'cyan',
        'teal',
        'green',
        'light-green',
        'lime',
        'yellow',
        'amber',
        'orange',
        'deep-orange',
        'brown',
        'grey',
        'blue-grey'
      ]
    )
    .config(configMdTheme)
    .run(initGlobalModels)
    .run(initGlobalShortcuts);

  function configMdTheme($mdThemingProvider, THEMES) {
    $mdThemingProvider.theme('default')
      .primaryPalette('blue');
    //.dark();

    let themes = THEMES;
    for (let index = 0; index < themes.length; ++index) {
      $mdThemingProvider.theme(themes[index] + '-theme')
        .primaryPalette(themes[index]);

      $mdThemingProvider.theme(themes[index] + '-dark')
        .primaryPalette(themes[index])
        .dark();
    }

    $mdThemingProvider.alwaysWatchTheme(true);
  }

  function initGlobalModels(LS_DEFAULTS, DEFAULT_THEME, $rootScope, Tasks, $localStorage, Projects, IS_ELECTRON) {
    $localStorage.$default(LS_DEFAULTS);

    $rootScope.r = {};

    $rootScope.r.projects = Projects.getList();

    $rootScope.r.tasks = Tasks.getToday();
    $rootScope.r.backlogTasks = Tasks.getBacklog();
    $rootScope.r.currentTask = Tasks.getCurrent();
    $rootScope.r.doneBacklogTasks = Tasks.getDoneBacklog();

    $rootScope.r.distractions = $localStorage.distractions;

    $rootScope.r.jiraSettings = $localStorage.jiraSettings;

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

  function initGlobalShortcuts($document, Dialogs, GitLog) {
    // we just use this single one as this usually does mess
    // up with the default browser shortcuts
    // better to use the global electron shortcuts here
    $document.bind('keypress', (ev) => {
      if (ev.key === '*') {
        Dialogs('ADD_TASK');
      }
      if (window.isElectron) {
        if (ev.keyCode === 10 && ev.ctrlKey === true && ev.shiftKey === true) {
          ipcRenderer.send('TOGGLE_DEV_TOOLS');
        }
      }
    });
  }

})();
