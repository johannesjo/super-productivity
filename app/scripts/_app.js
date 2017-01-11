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
    .constant('JIRA_UPDATE_POLL_INTERVAL', 60 * 1000 * 5)
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

  function handleCurrentTaskUpdates($rootScope, $q, Jira, Tasks, IS_ELECTRON, $state, Notifier, $interval, SimpleToast, JIRA_UPDATE_POLL_INTERVAL, $localStorage) {

    function doAsyncSeries(arr) {
      return arr.reduce(function (promise, item) {
        return promise.then(function () {
          return Jira.updateStatus(item.val, item.type);
        });
      }, $q.when('NOT_YET'));
    }

    function checkJiraUpdatesForTask(task) {
      if (!task.originalKey && task.parentId) {
        let parentTask = Tasks.getById(task.parentId);
        if (parentTask.originalKey) {
          // set task to parent task
          task = parentTask;
        }
      }

      Jira.checkUpdatesForTicket(task).then((isUpdated) => {
        if (isUpdated) {
          Notifier({
            title: 'Jira Update',
            message: 'The task "' + task.title + '" has been updated as it was updated on Jira.',
            sound: true,
            wait: true
          });
          SimpleToast('The task "' + task.title + '" has been updated as it was updated on Jira.');
        }
      });
    }

    // handle updates that need to be made on jira
    $rootScope.$watch('r.currentTask', (newCurrent, prevCurrent) => {
      //console.log(newCurrent && newCurrent.title, $localStorage.currentTask && $localStorage.currentTask.title);
      Tasks.updateCurrent(newCurrent);

      // Jira Stuff
      // ----------
      // check if jira support is available
      if (IS_ELECTRON) {
        let dialogsAndRequestsForStatusUpdate = [];

        // handle old current first
        // if task (id) changed or no previous task
        if (!newCurrent || (newCurrent.id !== (prevCurrent && prevCurrent.id))) {
          // check if previous was jira task
          if (prevCurrent && prevCurrent.originalKey) {
            // and has not been worked on => OPEN
            // TODO this probably never happens due to autotracking
            if (!prevCurrent.timeSpent) {
              dialogsAndRequestsForStatusUpdate.push({ val: prevCurrent, type: 'OPEN' });
            }
            // or has been done => DONE
            if (prevCurrent.isDone) {
              dialogsAndRequestsForStatusUpdate.push({ val: prevCurrent, type: 'DONE' });
            }
          }
        }

        // handle new current
        // is jira task
        if (newCurrent && newCurrent.originalKey) {
          // current task (id) changed
          if (newCurrent.id !== (prevCurrent && prevCurrent.id)) {
            dialogsAndRequestsForStatusUpdate.push({ val: newCurrent, type: 'IN_PROGRESS' });
          }
        }

        if (dialogsAndRequestsForStatusUpdate.length > 0) {
          // execute all
          doAsyncSeries(dialogsAndRequestsForStatusUpdate).then(() => {
            // current task (id) changed
            if (newCurrent.id !== (prevCurrent && prevCurrent.id)) {
              checkJiraUpdatesForTask(newCurrent);
            }
          });
        }
      }

      // Non Jira stuff
      // --------------
      if (newCurrent && newCurrent.isDone) {
        let undoneTasks = Tasks.getUndoneToday();
        // go to daily planner if there are no undone tasks left
        if (!undoneTasks || undoneTasks.length === 0) {
          $state.go('daily-planner');
        } else {
          Tasks.updateCurrent(undoneTasks[0]);
        }
      }
    }, true);

    // handle updates that need to be made locally
    if (IS_ELECTRON) {
      $interval(() => {
        if ($rootScope.r.currentTask) {
          checkJiraUpdatesForTask($rootScope.r.currentTask);
        }
      }, JIRA_UPDATE_POLL_INTERVAL);
    }
  }

})();
