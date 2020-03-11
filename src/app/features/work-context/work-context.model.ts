import {WorklogExportSettings} from '../worklog/worklog.model';

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

export interface WorkContextCommon {
  workStart: WorkStartEnd;
  workEnd: WorkStartEnd;
  lastCompletedDay: string;
  breakTime: BreakTime;
  breakNr: BreakNr;
  advancedCfg: WorkContextAdvancedCfg;
}

export type WorkContextAdvancedCfgKey = keyof WorkContextAdvancedCfg;


export interface WorkContextCopy extends WorkContextCommon {
  id: string;
  title: string;
  icon: string;
  taskIds: string[];
  backlogTaskIds?: string[];
}

export enum WorkContextType {
  PROJECT = 'PROJECT',
  TAG = 'TAG'
}

export type WorkContext = Readonly<WorkContextCopy>;

export interface WorkContextState {
  activeId: string;
  activeType: WorkContextType;
  // additional entities state properties
}
