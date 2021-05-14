import { WorklogExportSettings } from '../worklog/worklog.model';

// normally imported from here, but this includes non type files as well..
// import {HueValue} from 'angular-material-css-vars';
type HueValue =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | 'A100'
  | 'A200'
  | 'A400'
  | 'A700';

export interface BreakTimeCopy {
  [key: string]: number;
}

export type BreakTime = Readonly<BreakTimeCopy>;

export interface BreakNrCopy {
  [key: string]: number;
}

export type BreakNr = Readonly<BreakNrCopy>;

export interface WorkStartEndCopy {
  [key: string]: number;
}

export type WorkStartEnd = Readonly<WorkStartEndCopy>;

export type WorkContextAdvancedCfg = Readonly<{
  worklogExportSettings: WorklogExportSettings;
}>;

export type WorkContextThemeCfg = Readonly<{
  isAutoContrast: boolean;
  isDisableBackgroundGradient: boolean;
  primary: string;
  huePrimary: HueValue;
  accent: string;
  hueAccent: HueValue;
  warn: string;
  hueWarn: HueValue;
  backgroundImageDark: string | null;
  backgroundImageLight: string | null;
}>;

export enum WorkContextType {
  PROJECT = 'PROJECT',
  TAG = 'TAG',
}

export interface WorkContextCommon {
  workStart: WorkStartEnd;
  workEnd: WorkStartEnd;
  breakTime: BreakTime;
  breakNr: BreakNr;
  advancedCfg: WorkContextAdvancedCfg;
  theme: WorkContextThemeCfg;
}

export type WorkContextAdvancedCfgKey = keyof WorkContextAdvancedCfg;

export interface WorkContextCopy extends WorkContextCommon {
  id: string;
  title: string;
  icon: string | null;
  routerLink: string;
  taskIds: string[];
  backlogTaskIds?: string[];
  type: WorkContextType;
}

export type WorkContext = Readonly<WorkContextCopy>;

export interface WorkContextState {
  activeId: string;
  activeType: WorkContextType;
  // additional entities state properties
}
