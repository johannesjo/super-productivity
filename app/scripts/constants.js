/**
 * @ngdoc constant
 * @name superProductivity.Dialogs
 * @description
 * # Dialogs
 * Constant in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .constant('DEFAULT_THEME', 'teal-theme')
    .constant('LS_DEFAULTS', {
      note: undefined,
      theme: undefined,
      currentTask: undefined,
      currentProject: undefined,
      currentSession: {
        timeWorkedWithoutBreak: undefined
      },
      tasks: [],
      backlogTasks: [],
      distractions: [],
      projects: [],
      git: {
        projectDir: undefined
      },
      config: {
        isTakeABreakEnabled: false,
        takeABreakMinWorkingTime: undefined,
        isShortSyntaxEnabled: true
      },
      jiraSettings: {
        isFirstLogin: true,
        isWorklogEnabled: true,
        isAutoWorklog: false,
        isUpdateIssueFromLocal: false,
        isAddWorklogOnSubTaskDone: true,
        defaultTransitionInProgress: undefined,
        defaultTransitionDone: undefined,
        transitions: {
          OPEN: 'ALWAYS_ASK',
          IN_PROGRESS: 'ALWAYS_ASK',
          DONE: 'ALWAYS_ASK'
        }
      }
    })
    .constant('REQUEST_TIMEOUT', 15000)
    .constant('WORKLOG_DATE_STR_FORMAT', 'YYYY-MM-DD')
    .constant('JIRA_UPDATE_POLL_INTERVAL', 60 * 1000 * 5)
    .constant('SIMPLE_TIME_TRACKING_INTERVAL', 1000 * 5)
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
    );
})();
