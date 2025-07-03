export interface MarkdownTask {
  line: string;
  lineNumber: number;
  id?: string;
  title: string;
  isDone: boolean;
  indentLevel?: number;
  parentId?: string;
}

export interface SuperProductivityTask {
  id: string;
  title: string;
  isDone: boolean;
  projectId: string;
  // Other SP fields preserved but not synced
  timeSpent?: number;
  tags?: string[];
  attachments?: any[];
  parentId?: string;
  subTaskIds?: string[];
  notes?: string;
}

export interface ReplicationResult {
  markdownContent: string;
  superProductivityUpdates: SPUpdate[];
  stats: {
    created: number;
    updated: number;
    deleted: number;
  };
}

export interface SPUpdate {
  type: 'create' | 'update' | 'delete';
  task?: Partial<SuperProductivityTask>;
  id?: string;
}

export interface SPCommands {
  creates: SuperProductivityTask[];
  updates: { id: string; changes: Partial<SuperProductivityTask> }[];
  deletes: string[];
}
