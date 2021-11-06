import { EntityState } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';

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
  [MODEL_VERSION_KEY]?: number;
}
