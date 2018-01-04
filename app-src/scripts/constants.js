/**
 * @ngdoc constant
 * @name superProductivity.Dialogs
 * @description
 * # Dialogs
 * Constant in the superProductivity.
 */

(function() {
  'use strict';

  angular
    .module('superProductivity')
    .constant('DEFAULT_THEME', 'blue-theme')
    .constant('GLOBAL_LS_FIELDS', [
      'currentProject',
      'projects',
      'keys',
      'isShowWelcomeDialog',
      'config',
      'keys'
    ])
    .constant('ON_DEMAND_LS_FIELDS', [
      'doneBacklogTasks',
    ])
    .constant('TMP_FIELDS', [
      '$$hashKey',
      '$$mdSelectId',
      'bodyClass',
      '$$applyAsyncQueue',
      '$$asyncQueue',
      '$$childHead',
      '$$childTail',
      '$$destroyed',
      '$$isolateBindings',
      '$$listenerCount',
      '$$listeners',
      '$$nextSibling',
      '$$phase',
      '$$postDigestQueue',
      '$$prevSibling',
      '$$watchers',
      '$$watchersCount',
      '$id',
      '$parent',
      '$root',
      '$state'
    ])
    .constant('ON_DEMAND_LS_FIELDS_FOR_PROJECT', [
      'data',
    ])
    .constant('EV', {
      UPDATE_CURRENT_TASK: 'UPDATE_CURRENT_TASK',
      IS_IDLE: 'IS_IDLE',
      IS_BUSY: 'IS_BUSY',
    })
    .constant('EV_PROJECT_CHANGED', 'EV_PROJECT_CHANGED')
    .constant('LS_DEFAULTS', {
      note: undefined,
      tomorrowsNote: undefined,
      theme: undefined,
      currentTask: undefined,
      lastCurrentTask: undefined,
      currentProject: undefined,
      currentSession: {
        timeWorkedWithoutBreak: undefined,
        pomodoro: {
          status: undefined,
          isOnBreak: false,
          currentCycle: 0,
          currentSessionTime: undefined,
        }
      },
      tasks: [],
      backlogTasks: [],
      doneBacklogTasks: [],
      distractions: [],
      projects: [],
      globalLinks: [],
      git: {
        isShowIssuesFromGit: false,
        isAutoImportToBacklog: false,
        repo: undefined,
        projectDir: undefined,
        prPrefix: 'Check PR: '
      },
      keys: {
        globalShowHide: 'Ctrl+Shift+X',
        goToDailyPlanner: 'p',
        goToWorkView: 'w',
        goToDailyAgenda: '',
        goToSettings: '',
        addNewTask: '*',
        showHelp: '?',
        openProjectNotes: 'N',
        openDistractionPanel: 'D',
        taskEditTitle: 'e',
        taskToggleNotes: 'n',
        taskOpenEstimationDialog: 't',
        taskToggleDone: 'd',
        taskAddSubTask: '+',
        taskDelete: 'Delete',
        taskOpenOriginalLink: 'o',
        selectPreviousTask: 'k',
        selectNextTask: 'j',
        moveTaskUp: 'Ctrl+Shift+ArrowUp',
        moveTaskDown: 'Ctrl+Shift+ArrowDown',
        moveToBacklog: 'B',
        moveToTodaysTasks: 'T',
        expandSubTasks: '',
        collapseSubTasks: '',
        togglePlay: 'y',
      },
      config: {
        automaticBackups: {
          isEnabled: false,
          path: '~/backup-{date}.json',
          intervalInSeconds: 6,
          isSyncEnabled: false,
          syncPath: '~/sync.json',
        },
        pomodoro: {
          isEnabled: true,
          duration: moment.duration(45, 'minutes'),
          breakDuration: moment.duration(5, 'minutes'),
          longerBreakDuration: moment.duration(15, 'minutes'),
          cyclesBeforeLongerBreak: 4,
          isStopTrackingOnBreak: true,
          isStopTrackingOnLongBreak: true,
          isShowDistractionsOnBreak: true,
          isPlaySound: true,
          isGoToWorkView: false,
        },
        isTakeABreakEnabled: false,
        takeABreakMinWorkingTime: undefined,
        isAutoStartNextTask: true,
        isEnableIdleTimeTracking: true,
        minIdleTime: moment.duration(5, 'minutes'),
        isShortSyntaxEnabled: true,
        takeABreakMessage: 'Take a break! You have been working for ${duration} without one. Go away from the computer! Take a short walk! Makes you more productive in the long run!',
      },
      // non setting variables which are simply saved where they are entered
      uiHelper: {
        isShowWelcomeDialog: true,
        dailyTaskExportSettings: {
          separateBy: ', ',
          separateFieldsBy: '',
          isUseNewLine: false,
          isListSubTasks: true,
          isListDoneOnly: false,
          isWorkedOnTodayOnly: true,
          showTitle: true,
          showTime: false,
          showDate: false
        },
        timeTrackingHistoryExportSettings: {
          separateBy: '',
          separateFieldsBy: ';',
          isUseNewLine: true,
          isListSubTasks: true,
          isListDoneOnly: false,
          isWorkedOnTodayOnly: true,
          showTitle: true,
          showTimeSpent: true,
          isTimeSpentAsMilliseconds: true,
          showDate: false
        },
        csvExportSettings: {
          separateBy: '',
          separateFieldsBy: ';',
          isUseNewLine: true,
          isListSubTasks: true,
          isListDoneOnly: false,
          isWorkedOnTodayOnly: true,
          showTitle: true,
          showTimeSpent: true,
          isTimeSpentAsMilliseconds: true,
          showDate: false
        },
        dailyAgenda: {
          showSubTasks: true
        }
      },
      jiraSettings: {
        isJiraEnabled: false,
        isFirstLogin: true,
        isWorklogEnabled: true,
        isAutoWorklog: false,
        isUpdateIssueFromLocal: false,
        isAddWorklogOnSubTaskDone: true,
        defaultTransitionInProgress: undefined,
        defaultTransitionDone: undefined,
        jqlQuery: 'assignee = currentUser() AND resolution = Unresolved ORDER BY updatedDate DESC',
        isEnabledAutoAdd: true,
        jqlQueryAutoAdd: 'assignee = currentUser() AND sprint in openSprints() AND resolution = Unresolved ORDER BY updatedDate DESC',
        userName: undefined,
        password: undefined,
        host: undefined,
        transitions: {
          OPEN: 'ALWAYS_ASK',
          IN_PROGRESS: 'ALWAYS_ASK',
          DONE: 'ALWAYS_ASK'
        },
        userToAssignOnDone: undefined
      }
    })
    .constant('SAVE_APP_STORAGE_POLL_INTERVAL', 1000)
    .constant('BACKUP_POLL_INTERVAL', 60 * 1000)
    .constant('REQUEST_TIMEOUT', 15000)
    .constant('WORKLOG_DATE_STR_FORMAT', 'YYYY-MM-DD')
    .constant('JIRA_UPDATE_POLL_INTERVAL', 60 * 1000 * 5)
    .constant('GIT_UPDATE_POLL_INTERVAL', 60 * 1000 * 0.25)
    .constant('TRACKING_INTERVAL', 1000 * 1)
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
