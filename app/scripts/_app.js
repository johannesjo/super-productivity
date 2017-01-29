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
    .run(initGlobalModels)
    .run(initPollCurrentTaskUpdates)
    .run(initPollForSimpleTimeTracking)
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

  function initGlobalModels(InitGlobalModels, $localStorage, LS_DEFAULTS) {
    $localStorage.$default(LS_DEFAULTS);
    InitGlobalModels();
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

  function initPollCurrentTaskUpdates($localStorage, Jira, IS_ELECTRON, $interval, JIRA_UPDATE_POLL_INTERVAL) {
    // handle updates that need to be made locally
    if (IS_ELECTRON) {
      $interval(() => {
        if ($localStorage.currentTask) {
          Jira.checkUpdatesForTaskOrParent($localStorage.currentTask);
        }
      }, JIRA_UPDATE_POLL_INTERVAL);
    }
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
