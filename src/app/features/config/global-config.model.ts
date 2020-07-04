import { FormlyFieldConfig } from '@ngx-formly/core';
import { ProjectCfgFormKey } from '../project/project.model';
import { LanguageCode, MODEL_VERSION_KEY } from '../../app.constants';

export type KeyboardConfig = Readonly<{
  globalShowHide: string,
  globalAddNote: string,
  globalAddTask: string,
  toggleBacklog: string,
  goToWorkView: string,
  // goToFocusMode: string,
  // goToDailyAgenda: string,
  goToSettings: string,
  addNewTask: string,
  globalToggleTaskStart: string,
  showHelp: string,
  addNewNote: string,
  openProjectNotes: string,
  toggleBookmarks: string;
  openDistractionPanel: string,
  zoomIn: string,
  zoomOut: string,
  zoomDefault: string,
  taskEditTitle: string,
  taskToggleAdditionalInfoOpen: string,
  taskOpenEstimationDialog: string,
  taskToggleDone: string,
  taskAddSubTask: string,
  taskMoveToProject: string,
  taskDelete: string,
  taskSchedule: string,
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
  isDarkMode: boolean;
  isAutMarkParentAsDone: boolean;
  isAutoStartNextTask: boolean;
  isConfirmBeforeExit: boolean;
  isNotifyWhenTimeEstimateExceeded: boolean;
  isTurnOffMarkdown: boolean;
  isAutoAddWorkedOnToToday: boolean;
  defaultProjectId: string | null;
}>;

export type EvaluationConfig = Readonly<{
  isHideEvaluationSheet: boolean;
}>;

export type IdleConfig = Readonly<{
  isEnableIdleTimeTracking: boolean;
  isUnTrackedIdleResetsBreakTimer: boolean;
  minIdleTime: number;
  isOnlyOpenIdleWhenCurrentTask: boolean;
}>;

export type TakeABreakConfig = Readonly<{
  isTakeABreakEnabled: boolean;
  isLockScreen: boolean;
  isFocusWindow: boolean;
  takeABreakMessage: string;
  takeABreakMinWorkingTime: number;
  motivationalImg: string;
}>;

export type PomodoroConfig = Readonly<{
  isEnabled: boolean;
  isStopTrackingOnBreak: boolean;
  isStopTrackingOnLongBreak: boolean;
  isManualContinue: boolean;
  isPlaySound: boolean;
  isPlaySoundAfterBreak: boolean;
  // isGoToWorkView: boolean;
  isPlayTick: boolean;

  duration: number;
  breakDuration: number;
  longerBreakDuration: number;
  cyclesBeforeLongerBreak: number;
}>;

// NOTE: needs to be writable due to how we use it
export interface GoogleDriveSyncConfig {
  isEnabled: boolean;
  isAutoLogin: boolean;
  isAutoSyncToRemote: boolean;
  isNotifyOnSync: boolean;
  isLoadRemoteDataOnStartup: boolean;
  isCompressData: boolean;
  syncInterval: number;
  syncFileName: string;
  _backupDocId: string;
}

export interface DropboxSyncConfig {
  isEnabled: boolean;
  authCode: string;
  accessToken: string;
  syncInterval: number;
  _backupDocId: string;
  // isCompressData: boolean;
}

export type LocalBackupConfig = Readonly<{
  isEnabled: boolean,
}>;

export type LanguageConfig = Readonly<{
  lng: LanguageCode,
}>;

export type GlobalConfigState = Readonly<{
  lang: LanguageConfig;
  misc: MiscConfig;
  evaluation: EvaluationConfig;
  idle: IdleConfig;
  takeABreak: TakeABreakConfig;
  pomodoro: PomodoroConfig;
  googleDriveSync: GoogleDriveSyncConfig;
  dropboxSync: DropboxSyncConfig;
  keyboard: KeyboardConfig;
  localBackup: LocalBackupConfig;

  [MODEL_VERSION_KEY]?: number;
}>;

export type GlobalConfigSectionKey = keyof GlobalConfigState | 'EMPTY';

export type GlobalSectionConfig
  = MiscConfig
  | PomodoroConfig
  | DropboxSyncConfig
  | KeyboardConfig
  ;
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface LimitedFormlyFieldConfig<FormModel> extends Omit<FormlyFieldConfig, 'key'> {
  key?: keyof FormModel;
}

export type CustomCfgSection =
  'FILE_IMPORT_EXPORT'
  | 'GOOGLE_SYNC'
  | 'JIRA_CFG'
  | 'SIMPLE_COUNTER_CFG'
  | 'DROPBOX_SYNC';

// Intermediate model
export interface ConfigFormSection<FormModel> {
  title: string;
  key: GlobalConfigSectionKey | ProjectCfgFormKey;
  help?: string;
  helpArr?: { h?: string; p: string; p2?: string; p3?: string; p4?: string; }[];
  customSection?: CustomCfgSection;
  items?: LimitedFormlyFieldConfig<FormModel>[];
  isElectronOnly?: boolean;
}

export interface GenericConfigFormSection extends Omit<ConfigFormSection<any>, 'items'> {
  items?: FormlyFieldConfig[];
}

export type ConfigFormConfig = Readonly<GenericConfigFormSection[]>;


