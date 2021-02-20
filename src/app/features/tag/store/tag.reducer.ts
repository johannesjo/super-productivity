import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import * as tagActions from './tag.actions';
import { Tag, TagState } from '../tag.model';
import { Action, createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import {
  AddTask,
  ConvertToMainTask,
  DeleteMainTasks,
  DeleteTask,
  MoveToArchive,
  RestoreTask,
  TaskActionTypes,
  UpdateTaskTags
} from '../../tasks/store/task.actions';
import { TODAY_TAG } from '../tag.const';
import { WorkContextType } from '../../work-context/work-context.model';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskUpInTodayList
} from '../../work-context/store/work-context-meta.actions';
import { moveTaskForWorkContextLikeState } from '../../work-context/store/work-context-meta.helper';
import { arrayMoveLeft, arrayMoveRight } from '../../../util/array-move';
import { Update } from '@ngrx/entity/src/models';
import { unique } from '../../../util/unique';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { migrateTagState } from '../migrate-tag-state.util';

export const TAG_FEATURE_NAME = 'tag';
const WORK_CONTEXT_TYPE: WorkContextType = WorkContextType.TAG;

export const tagAdapter: EntityAdapter<Tag> = createEntityAdapter<Tag>();
export const selectTagFeatureState = createFeatureSelector<TagState>(TAG_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = tagAdapter.getSelectors();
export const selectAllTags = createSelector(selectTagFeatureState, selectAll);
export const selectAllTagsWithoutMyDay = createSelector(
  selectAllTags,
  (tags: Tag[]): Tag[] => tags.filter(tag => tag.id !== TODAY_TAG.id)
);

export const selectTagById = createSelector(
  selectTagFeatureState,
  (state: TagState, props: { id: string }): Tag => {
    const tag = state.entities[props.id];
    if (!tag) {
      throw new Error('No tag ' + props.id);
    }
    return tag;
  }
);
export const selectTagsByIds = createSelector(
  selectTagFeatureState,
  (state: TagState, props: { ids: string[]; isAllowNull: boolean }): Tag[] => (props.isAllowNull
    ? props.ids
      .map(id => state.entities[id])
      .filter(tag => !!tag) as Tag[]

    : props.ids.map(id => {
      const tag = state.entities[id];
      if (!tag) {
        throw new Error('No tag ' + id);
      }
      return tag;
    }))
);

const _addMyDayTagIfNecessary = (state: TagState): TagState => {
  const ids = state.ids as string[];
  if (ids && !ids.includes(TODAY_TAG.id)) {
    return {
      ...state,
      ids: ([TODAY_TAG.id, ...ids] as string[]),
      entities: {
        ...state.entities,
        [TODAY_TAG.id]: TODAY_TAG,
      }
    };
  }
  return state;
};

export const initialTagState: TagState = _addMyDayTagIfNecessary(tagAdapter.getInitialState({
  // additional entity state properties
}));

const _reducer = createReducer<TagState>(
  initialTagState,

  // META ACTIONS
  // ------------
  on(loadAllData, (oldState, {appDataComplete}) => _addMyDayTagIfNecessary(
    appDataComplete.tag
      ? migrateTagState({...appDataComplete.tag})
      : oldState)
  ),

  on(moveTaskInTodayList, (state: TagState, {
    taskId,
    newOrderedIds,
    src,
    target,
    workContextType,
    workContextId,
  }) => {
    if (workContextType !== WORK_CONTEXT_TYPE) {
      return state;
    }
    const tag = state.entities[workContextId];
    if (!tag) {
      throw new Error('No tag');
    }
    const taskIdsBefore = tag.taskIds;
    const taskIds = moveTaskForWorkContextLikeState(taskId, newOrderedIds, target, taskIdsBefore);
    return tagAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds
      }
    }, state);
  }),

  on(moveTaskUpInTodayList, (state: TagState, {
      taskId,
      workContextId,
      workContextType
    }) => (workContextType === WORK_CONTEXT_TYPE)
    ? tagAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds: arrayMoveLeft((state.entities[workContextId] as Tag).taskIds, taskId)
      }
    }, state)
    : state
  ),

  on(moveTaskDownInTodayList, (state: TagState, {
      taskId,
      workContextId,
      workContextType
    }) => (workContextType === WORK_CONTEXT_TYPE)
    ? tagAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds: arrayMoveRight((state.entities[workContextId] as Tag).taskIds, taskId)
      }
    }, state)
    : state
  ),

  // INTERNAL
  // --------
  on(tagActions.addTag, (state: TagState, {tag}) => tagAdapter.addOne(tag, state)),

  on(tagActions.updateTag, (state: TagState, {tag}) => tagAdapter.updateOne(tag, state)),

  on(tagActions.upsertTag, (state: TagState, {tag}) => tagAdapter.upsertOne(tag, state)),

  on(tagActions.deleteTag, (state: TagState, {id}) => tagAdapter.removeOne(id, state)),

  on(tagActions.deleteTags, (state: TagState, {ids}) => tagAdapter.removeMany(ids, state)),

  on(tagActions.updateWorkStartForTag, (state: TagState, {id, newVal, date}) => tagAdapter.updateOne({
    id, changes: {
      workStart: {
        ...(state.entities[id] as Tag).workStart,
        [date]: newVal,
      }
    }
  }, state)),

  on(tagActions.updateWorkEndForTag, (state: TagState, {id, newVal, date}) => tagAdapter.updateOne({
    id, changes: {
      workEnd: {
        ...(state.entities[id] as Tag).workEnd,
        [date]: newVal,
      }
    }
  }, state)),

  on(tagActions.addToBreakTimeForTag, (state: TagState, {id, valToAdd, date}) => {
      const oldTag = state.entities[id] as Tag;
      const oldBreakTime = oldTag.breakTime[date] || 0;
      const oldBreakNr = oldTag.breakNr[date] || 0;
      return tagAdapter.updateOne({
        id,
        changes: {
          breakNr: {
            ...oldTag.breakNr,
            [date]: oldBreakNr + 1,
          },
          breakTime: {
            ...oldTag.breakTime,
            [date]: oldBreakTime + valToAdd,
          }
        }
      }, state);
    }
  ),

  on(tagActions.updateAdvancedConfigForTag, (state: TagState, {tagId, sectionKey, data}) => {
    const tagToUpdate = state.entities[tagId] as Tag;
    return tagAdapter.updateOne({
      id: tagId,
      changes: {
        advancedCfg: {
          ...tagToUpdate.advancedCfg,
          [sectionKey]: {
            ...tagToUpdate.advancedCfg[sectionKey],
            ...data,
          }
        }
      }
    }, state);
  }),
);

export function tagReducer(
  state: TagState = initialTagState,
  action: Action,
): TagState {
  switch (action.type) {
    // TASK STUFF
    // ---------
    case TaskActionTypes.AddTask: {
      const {payload} = action as AddTask;
      const {task, isAddToBottom} = payload;
      const updates: Update<Tag>[] = task.tagIds.map((tagId) => ({
        id: tagId,
        changes: {
          taskIds: isAddToBottom
            ? [
              ...(state.entities[tagId] as Tag).taskIds,
              task.id,
            ]
            : [
              task.id,
              ...(state.entities[tagId] as Tag).taskIds
            ]
        }
      }));
      return tagAdapter.updateMany(updates, state);
    }

    case TaskActionTypes.ConvertToMainTask: {
      const {payload} = action as ConvertToMainTask;
      const {task, parentTagIds} = payload;
      console.log(task);

      const updates: Update<Tag>[] = parentTagIds.map((tagId) => ({
        id: tagId,
        changes: {
          taskIds: [
            task.id,
            ...(state.entities[tagId] as Tag).taskIds
          ]
        }
      }));
      return tagAdapter.updateMany(updates, state);
    }

    case TaskActionTypes.DeleteTask: {
      const {payload} = action as DeleteTask;
      const {task} = payload;
      const updates: Update<Tag>[] = task.tagIds.map(tagId => ({
        id: tagId,
        changes: {
          taskIds: (state.entities[tagId] as Tag).taskIds.filter(taskIdForTag => taskIdForTag !== task.id)
        }
      }));
      return tagAdapter.updateMany(updates, state);
    }

    case TaskActionTypes.MoveToArchive: {
      const {payload} = action as MoveToArchive;
      const {tasks} = payload;
      const taskIdsToMoveToArchive = tasks.map(t => t.id);
      const tagIds = unique(
        tasks.reduce((acc: string[], t: TaskWithSubTasks) => ([
          ...acc,
          ...t.tagIds
        ]), [])
      );
      const updates: Update<Tag>[] = tagIds.map((pid: string) => ({
        id: pid,
        changes: {
          taskIds: (state.entities[pid] as Tag).taskIds.filter(taskId => !taskIdsToMoveToArchive.includes(taskId)),
        }
      }));
      return tagAdapter.updateMany(updates, state);
    }

    // cleans up all occurrences
    case TaskActionTypes.DeleteMainTasks: {
      const {payload} = action as DeleteMainTasks;
      const {taskIds} = payload;
      const updates: Update<Tag>[] = (state.ids as string[]).map(tagId => ({
        id: tagId,
        changes: {
          taskIds: (state.entities[tagId] as Tag).taskIds.filter(taskId => !taskIds.includes(taskId)),
        }
      }));
      return tagAdapter.updateMany(updates, state);
    }

    case TaskActionTypes.RestoreTask: {
      const {payload} = action as RestoreTask;
      const {task} = payload;

      return tagAdapter.updateMany(task.tagIds
        // NOTE: if the tag model is gone we don't update
        .filter(tagId => !!(state.entities[tagId] as Tag))
        .map(tagId => ({
            id: tagId,
            changes: {
              taskIds: [...(state.entities[tagId] as Tag).taskIds, task.id]
            }
          })
        ), state);
    }

    case TaskActionTypes.UpdateTaskTags: {
      const {payload} = action as UpdateTaskTags;
      const {newTagIds = [], oldTagIds = [], task} = payload;
      const taskId = task.id;
      const removedFrom: string[] = oldTagIds.filter(oldId => !newTagIds.includes(oldId));
      const addedTo: string[] = newTagIds.filter(newId => !oldTagIds.includes(newId));
      const removeFrom: Update<Tag>[] = removedFrom.map(tagId => ({
        id: tagId,
        changes: {
          taskIds: (state.entities[tagId] as Tag).taskIds.filter(id => id !== taskId),
        }
      }));
      const addTo: Update<Tag>[] = addedTo.map(tagId => ({
        id: tagId,
        changes: {
          taskIds: [taskId, ...(state.entities[tagId] as Tag).taskIds],
        }
      }));
      return tagAdapter.updateMany([...removeFrom, ...addTo], state);
    }
    default:
      return _reducer(state, action);
  }
}


