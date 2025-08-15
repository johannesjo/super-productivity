export interface SyncConfig {
  filePath: string;
  projectId: string;
  enabled: boolean;
}

export interface Project {
  id: string;
  title: string;
  themeColor?: string;
  isDone?: boolean;
  created?: number;
  updated?: number;
  taskIds?: string[];
  backlogTaskIds?: string[];
  noteIds?: string[];
}

export interface Task {
  id: string;
  title: string;
  isDone: boolean;
  projectId: string;
  parentId?: string;
  notes?: string;
  subTaskIds?: string[];
}
