/**
 * Models for markdown parsing and task representation
 */

export interface ParsedTask {
  line: number;
  indent: number;
  completed: boolean;
  id: string | null;
  title: string;
  originalLine: string;
  parentId?: string | null;
  isSubtask: boolean;
  originalId?: string | null; // Track the original ID even if it's a duplicate
  depth: number; // Track depth level (0 = root, 1 = subtask, 2+ = notes content)
  noteLines?: string[]; // Third-level content to be synced as notes
}

export interface TaskParseResult {
  tasks: ParsedTask[];
  errors: string[];
  detectedIndentSize?: number;
}
