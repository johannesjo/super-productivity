import {WorklogExportSettings} from '../worklog/worklog.model';
import {HueValue} from 'angular-material-css-vars';

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
}>;

export enum WorkContextType {
  PROJECT = 'PROJECT',
  TAG = 'TAG'
}

export interface WorkContextCommon {
  workStart: WorkStartEnd;
  workEnd: WorkStartEnd;
  lastCompletedDay: string;
  breakTime: BreakTime;
  breakNr: BreakNr;
  advancedCfg: WorkContextAdvancedCfg;
  theme: WorkContextThemeCfg;
}

export type WorkContextAdvancedCfgKey = keyof WorkContextAdvancedCfg;


export interface WorkContextCopy extends WorkContextCommon {
  id: string;
  title: string;
  icon: string;
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
