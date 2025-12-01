import { EntityState } from '@ngrx/entity';

export interface Note {
  id: string;
  projectId: string | null;
  isPinnedToToday: boolean;
  content: string;
  imgUrl?: string;
  isLock?: boolean;
  backgroundColor?: string;
  created: number;
  modified: number;
}

export interface NoteState extends EntityState<Note> {
  ids: string[];
  todayOrder: string[];
}
