export interface BoardSrcCfg {
  projectId?: string;
  tagIds?: string[];
  filterDone?: boolean;
  filterTaskState?: number[];
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
  cols?: number;
  rows?: number;
  panels: BoardPanelCfg[];
}
