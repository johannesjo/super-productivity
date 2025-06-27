export type SyncDirection = 'bidirectional' | 'fileToProject' | 'projectToFile';

export interface SyncConfig {
  filePath: string;
  projectId: string;
  syncDirection: SyncDirection;
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

export interface MarkdownTask {
  title: string;
  isDone: boolean;
  lineNumber: number;
  indentLevel: number;
  subTasks: MarkdownTask[];
}

export interface SyncResult {
  tasksAdded: number;
  tasksUpdated: number;
  tasksDeleted: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  taskId: string;
  taskTitle: string;
  fileValue: any;
  projectValue: any;
  resolution?: 'file' | 'project' | 'skip';
}
