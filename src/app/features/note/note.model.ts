export interface Note {
  id: string;
  content: string;
  imgUrl?: string;
  isLock?: boolean;
  backgroundColor?: string;
  created: number;
  modified: number;
  reminderId?: string | null;
}
