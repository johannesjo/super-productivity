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

export enum BoardPanelCfgTaskTypeFilter {
  All = 1,
  NoBacklog = 2,
  OnlyBacklog = 3,
}

export enum BoardPanelSortField {
  None = 'none',
  DueDate = 'dueDate',
  TimeEstimate = 'timeEstimate',
  Priority = 'priority',
  CreatedAt = 'createdAt',
  Title = 'title',
  Project = 'project',
}

export enum BoardPanelSortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

export enum BoardPanelGroupField {
  None = 'none',
  Tags = 'tags',
  Project = 'project',
  Priority = 'priority',
  DueDateRange = 'dueDateRange',
  TimeEstimateRange = 'timeEstimateRange',
}

export interface BoardPanelSortCfg {
  primary: BoardPanelSortField;
  direction: BoardPanelSortDirection;
  secondary?: {
    field: BoardPanelSortField;
    direction: BoardPanelSortDirection;
  };
}

export interface BoardPanelGroupCfg {
  field: BoardPanelGroupField;
  customTags?: string[]; // for tag grouping
  showUngrouped: boolean;
  collapseGroups: boolean;
}

export interface BoardSrcCfg {
  // projectId?: string;
  includedTagIds: string[];
  excludedTagIds: string[];
  projectId?: string;
  taskDoneState: BoardPanelCfgTaskDoneState;
  scheduledState: BoardPanelCfgScheduledState;
  isParentTasksOnly: boolean;
  // optional since newly added
  backlogState?: BoardPanelCfgTaskTypeFilter;
  sortCfg?: BoardPanelSortCfg;
  groupCfg?: BoardPanelGroupCfg;
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
