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
        transitions: {
          OPEN: undefined,
          IN_PROGRESS: undefined,
          DONE: undefined
        }
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
    .run(handleCurrentTaskUpdates)
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

  function initGlobalModels(LS_DEFAULTS, DEFAULT_THEME, $rootScope, Tasks, $localStorage, Projects) {
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

  function initGlobalShortcuts($document, Dialogs) {
    // we just use this single one as this usually does mess
    // up with the default browser shortcuts
    // better to use the global electron shortcuts here
    $document.bind('keypress', (ev) => {
      if (ev.key === '*') {
        Dialogs('ADD_TASK');
      }
      if (window.isElectron) {
        if (ev.keyCode === 10 && ev.ctrlKey === true && ev.shiftKey === true) {
          window.ipcRenderer.send('TOGGLE_DEV_TOOLS');
        }
      }
    });
  }

  function handleCurrentTaskUpdates($rootScope, $q, Jira, Tasks, IS_ELECTRON, $state) {
    function doAsyncSeries(arr) {
      return arr.reduce(function (promise, item) {
        return promise.then(function () {
          return Jira.updateStatus(item.val, item.type);
        });
      }, $q.when('NOT_YET'));
    }

    $rootScope.$watch('vm.r.currentTask', (mVal, oldVal) => {
      // check if jira support is available
      if (IS_ELECTRON) {
        let dialogsAndRequests = [];

        // handle old current first
        // task (id) changed or no previous task
        if (!mVal || (mVal !== oldVal) && (mVal.id !== (oldVal && oldVal.id))) {
          // previous was jira task
          if (oldVal && oldVal.originalKey) {
            // and has not been worked on
            if (!oldVal.timeSpent) {
              // only execute after previous request/dialog if set
              dialogsAndRequests.push({ val: oldVal, type: 'OPEN' });
            }
            // or has been done
            if (oldVal.isDone) {
              // only execute after previous request/dialog if set
              dialogsAndRequests.push({ val: oldVal, type: 'DONE' });
            }
          }
        }

        // handle new current
        // is jira task
        if (mVal && mVal.originalKey) {
          // current task (id) changed
          if (mVal && (mVal.id !== (oldVal && oldVal.id))) {
            dialogsAndRequests.push({ val: mVal, type: 'IN_PROGRESS' });
          }
        }

        // TODO handle reopened
        if (dialogsAndRequests.length > 0) {
          doAsyncSeries(dialogsAndRequests);
        }
      }

      if (mVal && mVal.isDone) {
        let undoneTasks = Tasks.getUndoneToday();

        // go to daily planner if there are no undone tasks left
        if (!undoneTasks || undoneTasks.length === 0) {
          $state.go('daily-planner');
        } else {
          Tasks.updateCurrent(undoneTasks[0]);
        }
      }
    }, true);
  }

})();
