import { EntityState } from '@ngrx/entity';

export interface Note {
  id: string;
  content: string;
  imgUrl?: string;
  isLock?: boolean;
  backgroundColor?: string;
  created: number;
  modified: number;
}

export type NoteState = EntityState<Note>;
