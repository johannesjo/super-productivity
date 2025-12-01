export interface ParsedTask {
  line: number;
  indent: number;
  completed: boolean;
  id: string | null;
  title: string;
  originalLine: string;
  parentId: string | null;
  isSubtask: boolean;
  depth: number;
  notes?: string;
}
