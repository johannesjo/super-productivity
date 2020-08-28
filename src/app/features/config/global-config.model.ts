import { FormlyFieldConfig } from '@ngx-formly/core';
import { ProjectCfgFormKey } from '../project/project.model';
import { LanguageCode, MODEL_VERSION_KEY } from '../../app.constants';

export type KeyboardConfig = Readonly<{
  globalShowHide: string | null,
  globalAddNote: string | null,
  globalAddTask: string | null,
  toggleBacklog: string | null,
  goToWorkView: string | null,
  // goToFocusMode: string|null,
  // goToDailyAgenda: string|null,
  goToSettings: string | null,
  addNewTask: string | null,
  globalToggleTaskStart: string | null,
  showHelp: string | null,
  addNewNote: string | null,
  openProjectNotes: string | null,
  toggleBookmarks: string | null;
  openDistractionPanel: string | null,
  zoomIn: string | null,
  zoomOut: string | null,
  zoomDefault: string | null,
  taskEditTitle: string | null,
  taskToggleAdditionalInfoOpen: string | null,
  taskOpenEstimationDialog: string | null,
  taskToggleDone: string | null,
  taskAddSubTask: string | null,
  taskMoveToProject: string | null,
  taskDelete: string | null,
  taskSchedule: string | null,
  selectPreviousTask: string | null,
  selectNextTask: string | null,
  moveTaskUp: string | null,
  moveTaskDown: string | null,
  moveToBacklog: string | null,
  moveToTodaysTasks: string | null,
  expandSubTasks: string | null,
  collapseSubTasks: string | null,
  togglePlay: string | null,
}>;

export type MiscConfig = Readonly<{
  isDarkMode: boolean;
  isAutMarkParentAsDone: boolean;
  isAutoStartNextTask: boolean;
  isConfirmBeforeExit: boolean;
  isNotifyWhenTimeEstimateExceeded: boolean;
  isTurnOffMarkdown: boolean;
  isAutoAddWorkedOnToToday: boolean;
  isDisableInitialDialog: boolean;
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
  motivationalImg: string | null;
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
  _backupDocId: string | null;
}

export interface DropboxSyncConfig {
  isEnabled: boolean;
  authCode: string | null;
  accessToken: string | null;
  syncInterval: number;
  _backupDocId: string | null;
  // isCompressData: boolean;
}

export type LocalBackupConfig = Readonly<{
  isEnabled: boolean,
}>;

export type LanguageConfig = Readonly<{
  lng: LanguageCode | null,
}>;

export type SoundConfig = Readonly<{
  isPlayDoneSound: boolean;
  isIncreaseDoneSoundPitch: boolean;
  doneSound: string;
  volume: number;
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
  sound: SoundConfig;

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

export interface GenericConfigFormSection extends Omit<ConfigFormSection<unknown>, 'items'> {
  items?: FormlyFieldConfig[];
}

export type ConfigFormConfig = Readonly<GenericConfigFormSection[]>;


