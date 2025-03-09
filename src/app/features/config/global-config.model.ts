import { FormlyFieldConfig } from '@ngx-formly/core';
import { ProjectCfgFormKey } from '../project/project.model';
import { LanguageCode, MODEL_VERSION_KEY } from '../../app.constants';
import { SyncProvider } from '../../imex/sync/sync-provider.model';
import { KeyboardConfig } from './keyboard-config.model';
import { LegacyCalendarProvider } from '../issue/providers/calendar/calendar.model';

export type DarkModeCfg = 'dark' | 'light' | 'system';

export type MiscConfig = Readonly<{
  darkMode: DarkModeCfg;
  isAutMarkParentAsDone: boolean;
  isConfirmBeforeExit: boolean;
  isConfirmBeforeExitWithoutFinishDay: boolean;
  isTurnOffMarkdown: boolean;
  isAutoAddWorkedOnToToday: boolean;
  isMinimizeToTray: boolean;
  isTrayShowCurrentTask: boolean;
  // allow also false because of #569
  defaultProjectId: string | null | false;
  firstDayOfWeek: number;
  startOfNextDay: number;
  taskNotesTpl: string;
  isUseMinimalNav: boolean;
  isDisableAnimations: boolean;
}>;

export type ShortSyntaxConfig = Readonly<{
  isEnableProject: boolean;
  isEnableDue: boolean;
  isEnableTag: boolean;
}>;

export type TimeTrackingConfig = Readonly<{
  trackingInterval: number;
  defaultEstimate: number;
  defaultEstimateSubTasks: number;
  isAutoStartNextTask: boolean;
  isNotifyWhenTimeEstimateExceeded: boolean;
  isTrackingReminderEnabled: boolean;
  isTrackingReminderShowOnMobile: boolean;
  trackingReminderMinTime: number;
}>;

export type EvaluationConfig = Readonly<{
  isHideEvaluationSheet: boolean;
}>;

export type IdleConfig = Readonly<{
  isEnableIdleTimeTracking: boolean;
  minIdleTime: number;
  isOnlyOpenIdleWhenCurrentTask: boolean;
}>;

export type TakeABreakConfig = Readonly<{
  isTakeABreakEnabled: boolean;
  isLockScreen: boolean;
  isTimedFullScreenBlocker: boolean;
  timedFullScreenBlockerDuration: number;
  isFocusWindow: boolean;
  takeABreakMessage: string;
  takeABreakMinWorkingTime: number;
  takeABreakSnoozeTime: number;
  motivationalImgs: string[];
}>;

export type PomodoroConfig = Readonly<{
  isEnabled: boolean;
  isStopTrackingOnBreak: boolean;
  isStopTrackingOnLongBreak: boolean;
  isManualContinue: boolean;
  isManualContinueBreak: boolean;
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

export type DropboxSyncConfig = object;

export interface WebDavConfig {
  baseUrl: string | null;
  userName: string | null;
  password: string | null;
  // TODO remove and migrate
  syncFilePath?: string | null;
  syncFolderPath: string | null;
}

export interface LocalFileSyncConfig {
  // TODO remove and migrate
  syncFilePath?: string | null;
  syncFolderPath: string | null;
}

export type LocalBackupConfig = Readonly<{
  isEnabled: boolean;
}>;

export type LanguageConfig = Readonly<{
  lng: LanguageCode | null;
}>;

export type SoundConfig = Readonly<{
  isIncreaseDoneSoundPitch: boolean;
  doneSound: string | null;
  breakReminderSound: string | null;
  volume: number;
}>;

export type SyncConfig = Readonly<{
  isEnabled: boolean;
  isEncryptionEnabled: boolean;
  encryptionPassword: string | null;
  isCompressionEnabled: boolean;
  syncProvider: SyncProvider | null;
  syncInterval: number;

  dropboxSync: DropboxSyncConfig;
  webDav: WebDavConfig;
  localFileSync: LocalFileSyncConfig;
}>;
export type LegacyCalendarIntegrationConfig = Readonly<{
  calendarProviders: LegacyCalendarProvider[];
}>;

export type ScheduleConfig = Readonly<{
  isWorkStartEndEnabled: boolean;
  workStart: string;
  workEnd: string;
  isLunchBreakEnabled: boolean;
  lunchBreakStart: string;
  lunchBreakEnd: string;
}>;

export type ReminderConfig = Readonly<{
  isCountdownBannerEnabled: boolean;
  countdownDuration: number;
}>;

export type TrackingReminderConfigOld = Readonly<{
  isEnabled: boolean;
  isShowOnMobile: boolean;
  minTime: number;
}>;

export type DominaModeConfig = Readonly<{
  isEnabled: boolean;
  text: string;
  interval: number;
  volume: number;
  voice: string;
}>;

export type FocusModeConfig = Readonly<{
  isAlwaysUseFocusMode: boolean;
  isSkipPreparation: boolean;
}>;

export type DailySummaryNote = Readonly<{
  txt?: string;
  lastUpdateDayStr?: string;
}>;

// NOTE: config properties being undefined always means that they should be overwritten with the default value
export type GlobalConfigState = Readonly<{
  lang: LanguageConfig;
  misc: MiscConfig;
  shortSyntax: ShortSyntaxConfig;
  evaluation: EvaluationConfig;
  idle: IdleConfig;
  takeABreak: TakeABreakConfig;
  pomodoro: PomodoroConfig;
  keyboard: KeyboardConfig;
  localBackup: LocalBackupConfig;
  sound: SoundConfig;
  timeTracking: TimeTrackingConfig;
  calendarIntegration?: LegacyCalendarIntegrationConfig;
  reminder: ReminderConfig;
  schedule: ScheduleConfig;
  dominaMode: DominaModeConfig;
  focusMode: FocusModeConfig;

  sync: SyncConfig;
  dailySummaryNote?: DailySummaryNote;

  [MODEL_VERSION_KEY]?: number;
}>;

export type GlobalConfigSectionKey = keyof GlobalConfigState | 'EMPTY';

export type GlobalSectionConfig =
  | MiscConfig
  | PomodoroConfig
  | KeyboardConfig
  | ScheduleConfig
  | ReminderConfig
  | DailySummaryNote
  | SyncConfig;
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface LimitedFormlyFieldConfig<FormModel>
  extends Omit<FormlyFieldConfig, 'key'> {
  key?: keyof FormModel;
}

export type CustomCfgSection =
  | 'FILE_IMPORT_EXPORT'
  | 'JIRA_CFG'
  | 'SIMPLE_COUNTER_CFG'
  | 'OPENPROJECT_CFG';

// Intermediate model
export interface ConfigFormSection<FormModel> {
  title: string;
  key: GlobalConfigSectionKey | ProjectCfgFormKey;
  help?: string;
  helpArr?: { h?: string; p: string; p2?: string; p3?: string; p4?: string }[];
  customSection?: CustomCfgSection;
  items?: LimitedFormlyFieldConfig<FormModel>[];
  isElectronOnly?: boolean;
  isHideForAndroidApp?: boolean;
}

export interface GenericConfigFormSection
  extends Omit<ConfigFormSection<unknown>, 'items'> {
  items?: FormlyFieldConfig[];
}

export type ConfigFormConfig = Readonly<GenericConfigFormSection[]>;
