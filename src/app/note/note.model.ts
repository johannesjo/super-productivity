export interface Note {
  id: string;
  content: string;
  isLock?: boolean;
  backgroundColor?: string;
  created: number;
  modified: number;
  reminderId?: string;
}
