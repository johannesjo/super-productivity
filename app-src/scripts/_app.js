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
      'mwl.calendar'
    ])
    .config(configMdTheme)
    .config(configMarked)
    .config(fixUnhandledRejectionError)
    .run(initGlobalModels)
    .run(initPollJiraTaskUpdates)
    .run(initPollGitTaskUpdates)
    .run(initPollForSimpleTimeTracking)
    .run(initMousewheelZoomForElectron)
    .run(initGlobalShortcuts)
    .run(showWelcomeDialog);

  /* @ngInject */
  function configMarked(markedProvider) {
    markedProvider.setRenderer({
      link: function (href, title, text) {
        return '<a href="' + href + '"' + (title ? ' title="' + title + '"' : ' ') + 'target="_blank" external-link class="md-accent">' + text + '</a>';
      }
    });
  }

  /* @ngInject */
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

  function fixUnhandledRejectionError($qProvider) {
    $qProvider.errorOnUnhandledRejections(false);
  }

  /* @ngInject */
  function initGlobalModels(Projects, InitGlobalModels, $localStorage, LS_DEFAULTS) {
    $localStorage.$default(LS_DEFAULTS);

    Projects.getAndUpdateCurrent();

    InitGlobalModels();
  }

  /* @ngInject */
  function initGlobalShortcuts($document, Dialogs, $localStorage, CheckShortcutKeyCombo, IS_ELECTRON) {
    $document.bind('keypress', (ev) => {
      // only trigger if not in typing mode
      if (ev.target.tagName !== 'INPUT' && ev.target.tagName !== 'TEXTAREA') {
        // on star
        if (CheckShortcutKeyCombo(ev, $localStorage.keys.addNewTask)) {
          Dialogs('ADD_TASK', undefined, true);
        }
        if (CheckShortcutKeyCombo(ev, $localStorage.keys.openProjectNotes)) {
          Dialogs('NOTES', undefined, true);
        }
        if (CheckShortcutKeyCombo(ev, $localStorage.keys.openDistractionPanel)) {
          Dialogs('DISTRACTIONS', undefined, true);
        }
        if (CheckShortcutKeyCombo(ev, $localStorage.keys.showHelp)) {
          Dialogs('HELP', { template: 'PAGE' }, true);
        }
      }

      // special hidden dev tools combo to use them for production
      if (IS_ELECTRON) {
        if (ev.keyCode === 10 && ev.ctrlKey === true && ev.shiftKey === true) {
          window.ipcRenderer.send('TOGGLE_DEV_TOOLS');
        }
      }
    });

    // Register electron shortcut(s)
    const IPC_REGISTER_GLOBAL_SHORTCUT_EVENT = 'REGISTER_GLOBAL_SHORTCUT';
    if (IS_ELECTRON && $localStorage.keys && $localStorage.keys.globalShowHide) {
      window.ipcRenderer.send(IPC_REGISTER_GLOBAL_SHORTCUT_EVENT, $localStorage.keys.globalShowHide);
    }
  }

  /* @ngInject */
  function initPollForSimpleTimeTracking($localStorage, IS_ELECTRON, $interval, SIMPLE_TIME_TRACKING_INTERVAL, Tasks) {
    // if NOT in electron context
    if (!IS_ELECTRON) {
      let currentTrackingStart;
      $interval(() => {
        if ($localStorage.currentTask) {
          if (currentTrackingStart) {
            let now = moment();
            let realIdleTime = moment.duration(now.diff(currentTrackingStart)).asMilliseconds();
            Tasks.addTimeSpent($localStorage.currentTask, realIdleTime);
          }
          currentTrackingStart = moment();
        }
      }, SIMPLE_TIME_TRACKING_INTERVAL);
    }
  }

  /* @ngInject */
  function initPollJiraTaskUpdates($localStorage, Jira, IS_ELECTRON, $interval, JIRA_UPDATE_POLL_INTERVAL) {
    if (IS_ELECTRON) {
      // one initial call
      if (Jira.isSufficientJiraSettings()) {
        Jira.checkForUpdates($localStorage.tasks);
      }

      $interval(() => {
        if (Jira.isSufficientJiraSettings()) {
          Jira.checkForUpdates($localStorage.tasks);
        }
      }, JIRA_UPDATE_POLL_INTERVAL);
    }
  }

  /* @ngInject */
  function initPollGitTaskUpdates($localStorage, Git, $interval, GIT_UPDATE_POLL_INTERVAL) {
    // one initial
    if ($localStorage.git.projectDir && $localStorage.git.repo) {
      Git.checkAndUpdateTasks($localStorage.tasks);
    }

    $interval(() => {
      if ($localStorage.git.projectDir && $localStorage.git.repo) {
        Git.checkAndUpdateTasks($localStorage.tasks);
      }
    }, GIT_UPDATE_POLL_INTERVAL);
  }

  /* @ngInject */
  function showWelcomeDialog($localStorage, Dialogs) {
    if ($localStorage.uiHelper.isShowWelcomeDialog) {
      Dialogs('WELCOME', undefined, true);
    }
  }

  /* @ngInject */
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
