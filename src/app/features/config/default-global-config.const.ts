import { GlobalConfigState } from './global-config.model';
import { IS_MAC } from '../../util/is-mac';

export const IS_USE_DARK_THEME_AS_DEFAULT: boolean =
  !IS_MAC ||
  !window.matchMedia ||
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const minute = 60 * 1000;

export const DEFAULT_DAY_START = '9:00';
export const DEFAULT_GLOBAL_CONFIG: GlobalConfigState = {
  lang: {
    lng: null,
  },
  misc: {
    isDarkMode: IS_USE_DARK_THEME_AS_DEFAULT,
    isAlwaysUseFocusMode: false,
    isConfirmBeforeExit: false,
    isConfirmBeforeExitWithoutFinishDay: true,
    isNotifyWhenTimeEstimateExceeded: true,
    isAutMarkParentAsDone: false,
    isAutoStartNextTask: false,
    isTurnOffMarkdown: false,
    isAutoAddWorkedOnToToday: true,
    isMinimizeToTray: false,
    isTrayShowCurrentTask: true,
    defaultProjectId: null,
    firstDayOfWeek: 1,
    startOfNextDay: 0,
    isDisableAnimations: false,
    taskNotesTpl: `**How can I best achieve it now?**

**What do I want?**

**Why do I want it?**
`,
  },
  evaluation: {
    isHideEvaluationSheet: false,
  },
  idle: {
    isOnlyOpenIdleWhenCurrentTask: false,
    isEnableIdleTimeTracking: true,
    minIdleTime: 5 * minute,
    isUnTrackedIdleResetsBreakTimer: true,
  },
  takeABreak: {
    isTakeABreakEnabled: true,
    isLockScreen: false,
    isTimedFullScreenBlocker: false,
    timedFullScreenBlockerDuration: 8000,
    isFocusWindow: false,
    /* eslint-disable-next-line */
    takeABreakMessage:
      'You have been working for ${duration} without one. Go away from the computer! Take a short walk! Makes you more productive in the long run!',
    takeABreakMinWorkingTime: 60 * minute,
    takeABreakSnoozeTime: 15 * minute,
    motivationalImgs: [],
  },
  dominaMode: {
    isEnabled: false,
    interval: 5 * minute,
    volume: 75,
    text: 'Your current task is: ${currentTaskTitle}',
  },
  pomodoro: {
    isEnabled: false,
    duration: 25 * minute,
    breakDuration: 5 * minute,
    longerBreakDuration: 15 * minute,
    cyclesBeforeLongerBreak: 4,
    isStopTrackingOnBreak: true,
    isStopTrackingOnLongBreak: true,
    isManualContinue: false,
    isManualContinueBreak: false,
    isPlaySound: true,
    isPlaySoundAfterBreak: false,
    // isGoToWorkView: false,
    isPlayTick: false,
  },
  keyboard: {
    globalShowHide: 'Ctrl+Shift+X',
    globalToggleTaskStart: null,
    globalAddNote: null,
    globalAddTask: null,
    addNewTask: 'Shift+A',
    addNewNote: 'n',
    openProjectNotes: 'Shift+N',
    toggleSideNav: 'Shift+D',
    showHelp: '?',
    showSearchBar: 'Shift+F',
    toggleBookmarks: 'Shift+V',
    toggleBacklog: 'b',
    goToWorkView: 'w',
    goToScheduledView: 'Shift+S',
    goToTimeline: 'Shift+T',
    // goToDailyAgenda: null,
    // goToFocusMode: 'Shift+F',
    goToSettings: null,
    zoomIn: 'Ctrl++',
    zoomOut: 'Ctrl+-',
    zoomDefault: 'Ctrl+0',
    taskEditTitle: null,
    taskToggleAdditionalInfoOpen: 'i',
    taskOpenEstimationDialog: 't',
    taskSchedule: 's',
    taskToggleDone: 'd',
    taskAddSubTask: 'a',
    taskDelete: 'Backspace',
    taskMoveToProject: 'e',
    taskOpenContextMenu: 'q',
    selectPreviousTask: 'k',
    selectNextTask: 'j',
    moveTaskUp: 'Ctrl+Shift+ArrowUp',
    moveTaskDown: 'Ctrl+Shift+ArrowDown',
    moveToBacklog: 'Shift+B',
    moveToTodaysTasks: 'Shift+T',
    expandSubTasks: null,
    collapseSubTasks: null,
    togglePlay: 'y',
    taskEditTags: 'g',
  },
  localBackup: {
    isEnabled: true,
  },
  sound: {
    volume: 75,
    isIncreaseDoneSoundPitch: true,
    doneSound: 'done2.mp3',
    breakReminderSound: null,
  },
  trackingReminder: {
    isEnabled: true,
    isShowOnMobile: false,
    minTime: minute * 2,
  },
  timeline: {
    isWorkStartEndEnabled: true,
    workStart: DEFAULT_DAY_START,
    workEnd: '17:00',
    calendarProviders: [],
  },

  sync: {
    isEnabled: false,
    // TODO maybe enable later if it works well
    isCompressionEnabled: false,
    syncProvider: null,
    syncInterval: minute,

    dropboxSync: {
      accessToken: null,
      refreshToken: null,
      _tokenExpiresAt: undefined,
    },

    webDav: {
      baseUrl: null,
      userName: null,
      password: null,
      syncFilePath: 'super-productivity-backup.json',
    },

    localFileSync: {
      syncFilePath: 'super-productivity-sync.json',
    },
  },
};
