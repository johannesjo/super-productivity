import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Tag } from '../tag.model';
import { WorkContextAdvancedCfgKey } from '../../work-context/work-context.model';
import { PersistentActionMeta } from '../../../core/persistence/operation-log/persistent-action.interface';
import { OpType } from '../../../core/persistence/operation-log/operation.types';

export const addTag = createAction('[Tag] Add Tag', (tagProps: { tag: Tag }) => ({
  ...tagProps,
  meta: {
    isPersistent: true,
    entityType: 'TAG',
    entityId: tagProps.tag.id,
    opType: OpType.Create,
  } as PersistentActionMeta,
}));

export const updateTag = createAction(
  '[Tag] Update Tag',
  (tagProps: { tag: Update<Tag>; isSkipSnack?: boolean }) => ({
    ...tagProps,
    meta: {
      isPersistent: true,
      entityType: 'TAG',
      entityId: tagProps.tag.id as string,
      opType: OpType.Update,
    } as PersistentActionMeta,
  }),
);

export const upsertTag = createAction('[Tag] Upsert Tag', props<{ tag: Tag }>());

export const deleteTag = createAction('[Tag] Delete Tag', (tagProps: { id: string }) => ({
  ...tagProps,
  meta: {
    isPersistent: true,
    entityType: 'TAG',
    entityId: tagProps.id,
    opType: OpType.Delete,
  } as PersistentActionMeta,
}));

export const deleteTags = createAction(
  '[Tag] Delete multiple Tags',
  (tagProps: { ids: string[] }) => ({
    ...tagProps,
    meta: {
      isPersistent: true,
      entityType: 'TAG',
      entityIds: tagProps.ids,
      opType: OpType.Delete,
      isBulk: true,
    } as PersistentActionMeta,
  }),
);

export const updateTagOrder = createAction(
  '[Tag] Update Tag Order',
  (tagProps: { ids: string[] }) => ({
    ...tagProps,
    meta: {
      isPersistent: true,
      entityType: 'TAG',
      entityIds: tagProps.ids,
      opType: OpType.Move,
      isBulk: true,
    } as PersistentActionMeta,
  }),
);

export const updateAdvancedConfigForTag = createAction(
  '[Tag] Update Advanced Config',
  (tagProps: { tagId: string; sectionKey: WorkContextAdvancedCfgKey; data: any }) => ({
    ...tagProps,
    meta: {
      isPersistent: true,
      entityType: 'TAG',
      entityId: tagProps.tagId,
      opType: OpType.Update,
    } as PersistentActionMeta,
  }),
);
