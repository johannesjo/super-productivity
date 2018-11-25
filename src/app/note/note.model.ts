export interface Note {
  id: string;
  title: string;
  content: string;
  isLock?: boolean;
  backgroundColor?: string;
  created: number;
  modified: number;
  reminderId?: string;
}
