export type KeyboardConfig = Readonly<{
  globalShowHide: string,
  toggleBacklog: string,
  goToWorkView: string,
  goToFocusMode: string,
  goToDailyAgenda: string,
  goToSettings: string,
  addNewTask: string,
  showHelp: string,
  openProjectNotes: string,
  openDistractionPanel: string,
  taskEditTitle: string,
  taskToggleAdditionalInfoOpen: string,
  taskOpenEstimationDialog: string,
  taskToggleDone: string,
  taskAddSubTask: string,
  taskDelete: string,
  selectPreviousTask: string,
  selectNextTask: string,
  moveTaskUp: string,
  moveTaskDown: string,
  moveToBacklog: string,
  moveToTodaysTasks: string,
  expandSubTasks: string,
  collapseSubTasks: string,
  togglePlay: string,
}>;


export type MiscConfig = Readonly<{
  isEnableIdleTimeTracking: boolean;
  minIdleTime: number;
  isOnlyOpenIdleWhenCurrentTask: boolean;

  isMinimizeToTrayOnExit: boolean;
  isConfirmBeforeExit: boolean;
  isNotifyWhenTimeEstimateExceeded: boolean;
  isBlockFinishDayUntilTimeTimeTracked: boolean;
  isTakeABreakEnabled: boolean;
  takeABreakMessage: string;
  takeABreakMinWorkingTime: number;
}>;


export type PomodoroConfig = Readonly<{
  [key: string]: any;
}>;

// NOTE: needs to be writable due to how we use it
export interface GoogleDriveSyncConfig {
  isEnabled: boolean;
  isAutoLogin: boolean;
  isAutoSyncToRemote: boolean;
  isNotifyOnSync: boolean;
  isLoadRemoteDataOnStartup: boolean;
  syncInterval: number;
  syncFileName: string;
  _lastLocalUpdate: string;
  _lastSyncToRemote: string;
  _backupDocId: string;
}


// SETTINGS (not configurable under config)
export type UiHelperSettings = Readonly<{
  [key: string]: any;
}>;

export type GoogleSession = Readonly<{
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
}>;


export type GlobalConfig = Readonly<{
  misc: MiscConfig;
  pomodoro: PomodoroConfig;
  googleDriveSync: GoogleDriveSyncConfig;
  keyboard: KeyboardConfig;
  _googleSession: GoogleSession;
  _uiHelper: UiHelperSettings;
}>;


export type ConfigSectionKey = keyof GlobalConfig;

export type SectionConfig
  = MiscConfig
  | PomodoroConfig
  | KeyboardConfig
  | GoogleSession
  | UiHelperSettings
  ;
