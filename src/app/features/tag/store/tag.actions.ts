import {createAction, props} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {Tag, TagState} from '../tag.model';
import {WorkContextAdvancedCfgKey} from '../../work-context/work-context.model';

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

export const updateAdvancedConfigForTag = createAction(
  '[Tag] Update Advanced Config',
  props<{ tagId: string; sectionKey: WorkContextAdvancedCfgKey; data: any }>(),
);

export const updateWorkStartForTag = createAction(
  '[Tag] Update Work Start for Tag',
  props< { id: string; date: string; newVal: number; }>(),
);

export const updateWorkEndForTag = createAction(
  '[Tag] Update Work End for Tag',
  props< { id: string; date: string; newVal: number; }>(),
);

export const updateBreakTimeForTag = createAction(
  '[Tag] Update Break Time for Tag',
  props< { id: string; date: string; newVal: number; }>(),
);

export const updateBreakNrForTag = createAction(
  '[Tag] Update Break Nr for Tag',
  props< { id: string; date: string; newVal: number; }>(),
);

