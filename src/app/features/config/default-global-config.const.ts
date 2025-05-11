import { GlobalConfigState } from './global-config.model';
import { getDefaultVoice } from '../domina-mode/getAvailableVoices';
import { TRACKING_INTERVAL } from '../../app.constants';

const minute = 60 * 1000;
const defaultVoice = getDefaultVoice();

export const DEFAULT_DAY_START = '9:00';
export const DEFAULT_GLOBAL_CONFIG: GlobalConfigState = {
  lang: {
    lng: null,
  },
  misc: {
    isConfirmBeforeExit: false,
    isConfirmBeforeExitWithoutFinishDay: true,
    isAutMarkParentAsDone: false,
    isTurnOffMarkdown: false,
    isAutoAddWorkedOnToToday: true,
    isMinimizeToTray: false,
    isTrayShowCurrentTask: true,
    defaultProjectId: null,
    firstDayOfWeek: 1,
    startOfNextDay: 0,
    isUseMinimalNav: false,
    isDisableAnimations: false,
    isShowTipLonger: false,
    taskNotesTpl: `**How can I best achieve it now?**

**What do I want?**

**Why do I want it?**
`,
  },
  shortSyntax: {
    isEnableProject: true,
    isEnableDue: true,
    isEnableTag: true,
  },
  evaluation: {
    isHideEvaluationSheet: false,
  },
  idle: {
    isOnlyOpenIdleWhenCurrentTask: false,
    isEnableIdleTimeTracking: true,
    minIdleTime: 5 * minute,
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
    voice: defaultVoice,
  },
  focusMode: {
    isAlwaysUseFocusMode: false,
    isSkipPreparation: false,
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
    toggleIssuePanel: 'p',
    toggleSideNav: 'Shift+D',
    showHelp: '?',
    showSearchBar: 'Shift+F',
    toggleBacklog: 'b',
    goToFocusMode: 'f',
    goToWorkView: 'w',
    goToScheduledView: 'Shift+S',
    goToTimeline: 'Shift+T',
    // goToDailyAgenda: null,
    // goToFocusMode: 'Shift+F',
    goToSettings: null,
    zoomIn: 'Ctrl++',
    zoomOut: 'Ctrl+-',
    zoomDefault: 'Ctrl+0',
    saveNote: 'Ctrl+s',
    triggerSync: 'Ctrl+s',
    taskEditTitle: null,
    taskToggleDetailPanelOpen: 'i',
    taskOpenEstimationDialog: 't',
    taskSchedule: 's',
    taskToggleDone: 'd',
    taskAddSubTask: 'a',
    taskAddAttachment: 'l',
    taskDelete: 'Backspace',
    taskMoveToProject: 'e',
    taskOpenContextMenu: 'q',
    selectPreviousTask: 'k',
    selectNextTask: 'j',
    moveTaskUp: 'Ctrl+Shift+ArrowUp',
    moveTaskDown: 'Ctrl+Shift+ArrowDown',
    moveTaskToTop: 'Ctrl+Alt+ArrowUp',
    moveTaskToBottom: 'Ctrl+Alt+ArrowDown',
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
    doneSound: 'ding-small-bell.mp3',
    breakReminderSound: null,
    trackTimeSound: null,
  },
  timeTracking: {
    trackingInterval: TRACKING_INTERVAL,
    defaultEstimate: 0,
    defaultEstimateSubTasks: 0,
    isNotifyWhenTimeEstimateExceeded: true,
    isAutoStartNextTask: false,
    isTrackingReminderEnabled: false,
    isTrackingReminderShowOnMobile: false,
    trackingReminderMinTime: 5 * minute,
    isTrackingReminderNotify: false, // Show desktop notification when tracking reminder is triggered
    isTrackingReminderFocusWindow: false, // Focus the application window when tracking reminder is triggered
  },
  reminder: {
    isCountdownBannerEnabled: true,
    countdownDuration: minute * 10,
  },
  schedule: {
    isWorkStartEndEnabled: true,
    workStart: DEFAULT_DAY_START,
    workEnd: '17:00',
    isLunchBreakEnabled: false,
    lunchBreakStart: '13:00',
    lunchBreakEnd: '14:00',
  },

  sync: {
    isEnabled: false,
    // TODO maybe enable later if it works well
    isCompressionEnabled: false,
    isEncryptionEnabled: false,
    encryptKey: null,
    syncProvider: null,
    syncInterval: minute,

    webDav: {
      baseUrl: null,
      userName: null,
      password: null,
      syncFolderPath: 'super-productivity',
    },

    localFileSync: {
      syncFolderPath: '',
    },
  },
};
