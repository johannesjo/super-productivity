import { FormlyFieldConfig } from '@ngx-formly/core';
import { ProjectCfgFormKey } from '../project/project.model';
import { LanguageCode, MODEL_VERSION_KEY } from '../../app.constants';
import { SyncProvider } from '../../imex/sync/sync-provider.model';
import { KeyboardConfig } from './keyboard-config.model';

export type MiscConfig = Readonly<{
  isDarkMode: boolean;
  isAutMarkParentAsDone: boolean;
  isAutoStartNextTask: boolean;
  isConfirmBeforeExit: boolean;
  isNotifyWhenTimeEstimateExceeded: boolean;
  isTurnOffMarkdown: boolean;
  isAutoAddWorkedOnToToday: boolean;
  isMinimizeToTray: boolean;
  isTrayShowCurrentTask: boolean;
  isDisableInitialDialog: boolean;
  // allow also false because of #569
  defaultProjectId: string | null | false;
  firstDayOfWeek: number;
  taskNotesTpl: string;
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
  takeABreakSnoozeTime: number;
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
  isCompressData: boolean;
  syncFileName: string;
  authCode: string | null;
  _syncFileNameForBackupDocId: string | null;
  _backupDocId: string | null;
}

export interface DropboxSyncConfig {
  accessToken: string | null;
}

export interface WebDavConfig {
  baseUrl: string | null;
  userName: string | null;
  password: string | null;
  syncFilePath: string | null;
}

export type LocalBackupConfig = Readonly<{
  isEnabled: boolean;
}>;

export type LanguageConfig = Readonly<{
  lng: LanguageCode | null;
}>;

export type SoundConfig = Readonly<{
  isPlayDoneSound: boolean;
  isIncreaseDoneSoundPitch: boolean;
  doneSound: string;
  volume: number;
}>;

export type SyncConfig = Readonly<{
  isEnabled: boolean;
  syncProvider: SyncProvider | null;
  syncInterval: number;

  dropboxSync: DropboxSyncConfig;
  googleDriveSync: GoogleDriveSyncConfig;
  webDav: WebDavConfig;
}>;

export type TimelineConfig = Readonly<{
  isWorkStartEndEnabled: boolean;
  workStart: string;
  workEnd: string;
}>;

export type TrackingReminderConfig = Readonly<{
  isEnabled: boolean;
  isShowOnMobile: boolean;
  minTime: number;
}>;

// NOTE: config properties being undefined always means that they should be overwritten with the default value
export type GlobalConfigState = Readonly<{
  lang: LanguageConfig;
  misc: MiscConfig;
  evaluation: EvaluationConfig;
  idle: IdleConfig;
  takeABreak: TakeABreakConfig;
  pomodoro: PomodoroConfig;
  keyboard: KeyboardConfig;
  localBackup: LocalBackupConfig;
  sound: SoundConfig;
  trackingReminder: TrackingReminderConfig;
  timeline: TimelineConfig;

  sync: SyncConfig;

  [MODEL_VERSION_KEY]?: number;
}>;

export type GlobalConfigSectionKey = keyof GlobalConfigState | 'EMPTY';

export type GlobalSectionConfig =
  | MiscConfig
  | PomodoroConfig
  | KeyboardConfig
  | TimelineConfig
  | SyncConfig;
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface LimitedFormlyFieldConfig<FormModel>
  extends Omit<FormlyFieldConfig, 'key'> {
  key?: keyof FormModel;
}

export type CustomCfgSection = 'FILE_IMPORT_EXPORT' | 'JIRA_CFG' | 'SIMPLE_COUNTER_CFG';

// Intermediate model
export interface ConfigFormSection<FormModel> {
  title: string;
  key: GlobalConfigSectionKey | ProjectCfgFormKey;
  help?: string;
  helpArr?: { h?: string; p: string; p2?: string; p3?: string; p4?: string }[];
  customSection?: CustomCfgSection;
  items?: LimitedFormlyFieldConfig<FormModel>[];
  isElectronOnly?: boolean;
}

export interface GenericConfigFormSection
  extends Omit<ConfigFormSection<unknown>, 'items'> {
  items?: FormlyFieldConfig[];
}

export type ConfigFormConfig = Readonly<GenericConfigFormSection[]>;
