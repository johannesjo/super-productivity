import {createAction, props} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {Tag, TagState } from '../tag.model';

export const loadTagState = createAction(
  '[Tag] Load Tag State',
  props<{ state: TagState }>(),
);

export const addTag = createAction(
  '[Tag] Add Tag',
  props<{ tag: Tag }>(),
);

export const updateTag = createAction(
  '[Tag] Update Tag',
  props<{ tag: Update<Tag> }>(),
);

export const upsertTag = createAction(
  '[Tag] Upsert Tag',
  props<{ tag: Tag }>(),
);

export const deleteTag = createAction(
  '[Tag] Delete Tag',
  props<{ id: string }>(),
);

export const deleteTags = createAction(
  '[Tag] Delete multiple Tags',
  props<{ ids: string[] }>(),
);
