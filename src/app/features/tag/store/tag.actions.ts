import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Tag } from '../tag.model';
import { WorkContextAdvancedCfgKey } from '../../work-context/work-context.model';

export const addTag = createAction('[Tag] Add Tag', props<{ tag: Tag }>());

export const updateTag = createAction(
  '[Tag] Update Tag',
  props<{ tag: Update<Tag>; isSkipSnack?: boolean }>(),
);

export const upsertTag = createAction('[Tag] Upsert Tag', props<{ tag: Tag }>());

export const deleteTag = createAction('[Tag] Delete Tag', props<{ id: string }>());

export const deleteTags = createAction(
  '[Tag] Delete multiple Tags',
  props<{ ids: string[] }>(),
);

export const updateTagOrder = createAction(
  '[Tag] Update Tag Order',
  props<{ ids: string[] }>(),
);

export const updateAdvancedConfigForTag = createAction(
  '[Tag] Update Advanced Config',
  props<{ tagId: string; sectionKey: WorkContextAdvancedCfgKey; data: any }>(),
);
