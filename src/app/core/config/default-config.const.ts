import { GlobalConfig } from './config.model';
import * as moment from 'moment';

export const DEFAULT_CFG: GlobalConfig = {
  misc: {
    isDoNotMinimizeToTray: false,
    isNotifyWhenTimeEstimateExceeded: false,
    isBlockFinishDayUntilTimeTimeTracked: false,
    isConfirmBeforeExit: false,
    isShowTimeWorkedWithoutBreak: false,
    isTakeABreakEnabled: false,
    takeABreakMinWorkingTime: undefined,
    isAutoStartNextTask: true,
    isEnableIdleTimeTracking: true,
    minIdleTime: moment.duration(5, 'minutes'),
    isShortSyntaxEnabled: true,
    /* tslint:disable-next-line */
    takeABreakMessage: 'Take a break! You have been working for ${duration} without one. Go away from the computer! Take a short walk! Makes you more productive in the long run!',
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
    isManualContinue: false,
    isPlaySound: true,
    isGoToWorkView: false,
    isPlayTick: false,
  },
  // googleDriveSync: {
  //   backupDocId: undefined,
  //   lastLocalUpdate: undefined,
  //   lastSyncToRemote: undefined,
  // },
  keyboard: {
    globalShowHide: 'Ctrl+Shift+X',
    goToDailyPlanner: 'p',
    goToWorkView: 'w',
    goToFocusMode: 'F',
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
  _uiHelper: {
    isShowWelcomeDialog: true,
    isShowBookmarkBar: false,
    showSubTasks: true
  },
  _dailyTaskExportSettings: {
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
  _timeSheetExportSettings: {
    spreadsheetId: undefined,
    isAutoLogin: false,
    isAutoFocusEmpty: false,
    isRoundWorkTimeUp: undefined,
    roundStartTimeTo: undefined,
    roundEndTimeTo: undefined,
    roundWorkTimeTo: undefined,
    defaultValues: [
      'AASDAS'
    ]
  },
  _timeTrackingHistoryExportSettings: {
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
  _csvExportSettings: {
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
  _dailyAgenda: {
  },
  _googleTokens: {
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined
  },
};
