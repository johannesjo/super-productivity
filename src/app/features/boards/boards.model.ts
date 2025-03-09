export enum BoardPanelCfgTaskDoneState {
  All = 1,
  Done = 2,
  UnDone = 3,
}

export enum BoardPanelCfgScheduledState {
  All = 1,
  Scheduled = 2,
  NotScheduled = 3,
}

export interface BoardSrcCfg {
  // projectId?: string;
  includedTagIds: string[];
  excludedTagIds: string[];
  projectId?: string;
  taskDoneState: BoardPanelCfgTaskDoneState;
  scheduledState: BoardPanelCfgScheduledState;
  isParentTasksOnly: boolean;
}

export interface BoarFieldsToRemove {
  tagIds?: string[];
}

export interface BoardPanelCfg extends BoardSrcCfg {
  id: string;
  title: string;
  taskIds: string[];
}

export interface BoardCfg {
  id: string;
  title: string;
  cols: number;
  panels: BoardPanelCfg[];
}
