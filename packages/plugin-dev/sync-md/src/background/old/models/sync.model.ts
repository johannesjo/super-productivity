/**
 * Models for sync operations
 */

export interface SyncResult {
  success: boolean;
  taskCount?: number;
  error?: string;
  type: 'file-to-sp' | 'sp-to-file' | 'integrity-check';
}

export interface SpTask {
  id: string;
  title: string;
  projectId?: string;
  parentId?: string;
  isDone: boolean;
  notes?: string;
  subTaskIds?: string[];
}
