import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import * as tagActions from './tag.actions';
import {Tag, TagState} from '../tag.model';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';
import {
  AddTask,
  DeleteMainTasks,
  DeleteTask,
  MoveToArchive,
  RestoreTask,
  TaskActionTypes,
  UpdateTaskTags
} from '../../tasks/store/task.actions';
import {TODAY_TAG} from '../tag.const';
import {WorkContextType} from '../../work-context/work-context.model';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskUpInTodayList
} from '../../work-context/store/work-context-meta.actions';
import {moveTaskForWorkContextLikeState} from '../../work-context/store/work-context-meta.helper';
import {arrayMoveLeft, arrayMoveRight} from '../../../util/array-move';
import {Update} from '@ngrx/entity/src/models';
import {unique} from '../../../util/unique';
import {Project} from '../../project/project.model';

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
  (state, props: { id: string }): Tag => state.entities[props.id]
);
export const selectTagsByIds = createSelector(
  selectTagFeatureState,
  (state, props: { ids }) => props.ids ? props.ids.map(
    id => state.entities[id]) : []
);
export const selectTagByName = createSelector(
  selectTagFeatureState,
  (state, props: { name: string }): Tag | undefined => {
    const results = Object.values(state.entities).filter(
      (tag: Tag) => tag.title === props.name
    ) as Tag[];
    return results.length ? results[0] : undefined;
  }
);


export const initialTagState: TagState = tagAdapter.getInitialState({
  // additional entity state properties
});


const _reducer = createReducer<TagState>(
  initialTagState,

  // META ACTIONS
  // ------------
  on(moveTaskInTodayList, (state, {
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

    const taskIdsBefore = state.entities[workContextId].taskIds;
    const taskIds = moveTaskForWorkContextLikeState(taskId, newOrderedIds, target, taskIdsBefore);
    return tagAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds
      }
    }, state);
  }),

  on(moveTaskUpInTodayList, (state, {taskId, workContextId, workContextType}) => (workContextType === WORK_CONTEXT_TYPE)
    ? tagAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds: arrayMoveLeft(state.entities[workContextId].taskIds, taskId)
      }
    }, state)
    : state
  ),

  on(moveTaskDownInTodayList, (state, {taskId, workContextId, workContextType}) => (workContextType === WORK_CONTEXT_TYPE)
    ? tagAdapter.updateOne({
      id: workContextId,
      changes: {
        taskIds: arrayMoveRight(state.entities[workContextId].taskIds, taskId)
      }
    }, state)
    : state
  ),


  // INTERNAL
  // --------
  on(tagActions.addTag, (state, {tag}) => tagAdapter.addOne(tag, state)),

  on(tagActions.updateTag, (state, {tag}) => tagAdapter.updateOne(tag, state)),

  on(tagActions.upsertTag, (state, {tag}) => tagAdapter.upsertOne(tag, state)),

  on(tagActions.deleteTag, (state, {id}) => tagAdapter.removeOne(id, state)),

  on(tagActions.deleteTags, (state, {ids}) => tagAdapter.removeMany(ids, state)),

  on(tagActions.loadTagState, (oldState, {state}) => ({...oldState, ...state})),

  on(tagActions.updateWorkStartForTag, (state, {id, newVal, date}) => tagAdapter.updateOne({
    id, changes: {
      workStart: {
        ...state.entities[id].workStart,
        [date]: newVal,
      }
    }
  }, state)),

  on(tagActions.updateWorkEndForTag, (state, {id, newVal, date}) => tagAdapter.updateOne({
    id, changes: {
      workEnd: {
        ...state.entities[id].workEnd,
        [date]: newVal,
      }
    }
  }, state)),

  on(tagActions.addToBreakTimeForTag, (state, {id, valToAdd, date}) => {
      const oldTag = state.entities[id];
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

  on(tagActions.updateAdvancedConfigForTag, (state, {tagId, sectionKey, data}) => {
    const tagToUpdate = state.entities[tagId];
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
  state = initialTagState,
  action: Action,
): TagState {

  switch (action.type) {
    // TASK STUFF
    // ---------
    case TaskActionTypes.AddTask: {
      const {payload} = action as AddTask;
      const {workContextId, workContextType, task, isAddToBottom} = payload;
      const updates: Update<Tag>[] = task.tagIds.map((tagId) => ({
        id: tagId,
        changes: {
          taskIds: isAddToBottom
            ? [
              ...state.entities[tagId].taskIds,
              task.id,
            ]
            : [
              task.id,
              ...state.entities[tagId].taskIds
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
          taskIds: state.entities[tagId].taskIds.filter(taskIdForTag => taskIdForTag !== task.id)
        }
      }));
      return tagAdapter.updateMany(updates, state);
    }

    case TaskActionTypes.MoveToArchive: {
      const {payload} = action as MoveToArchive;
      const {tasks} = payload;
      const taskIdsToMoveToArchive = tasks.map(t => t.id);
      const tagIds = unique(
        tasks.reduce((acc, t) => ([
          ...acc,
          ...t.tagIds
        ]), [])
      );
      const updates: Update<Project>[] = tagIds.map(pid => ({
        id: pid,
        changes: {
          taskIds: state.entities[pid].taskIds.filter(taskId => !taskIdsToMoveToArchive.includes(taskId)),
        }
      }));
      return tagAdapter.updateMany(updates, state);
    }

    // cleans up all occurrences
    case TaskActionTypes.DeleteMainTasks: {
      const {payload} = action as DeleteMainTasks;
      const {taskIds} = payload;
      const updates: Update<Project>[] = (state.ids as string[]).map(tagId => ({
        id: tagId,
        changes: {
          taskIds: state.entities[tagId].taskIds.filter(taskId => !taskIds.includes(taskId)),
        }
      }));
      return tagAdapter.updateMany(updates, state);
    }

    case TaskActionTypes.RestoreTask: {
      const {payload} = action as RestoreTask;
      const {task} = payload;

      return tagAdapter.updateMany(task.tagIds
        // NOTE: if the tag model is gone we don't update
        .filter(tagId => !!state.entities[tagId])
        .map(tagId => ({
            id: tagId,
            changes: {
              taskIds: [...state.entities[tagId].taskIds, task.id]
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
          taskIds: state.entities[tagId].taskIds.filter(id => id !== taskId),
        }
      }));
      const addTo: Update<Tag>[] = addedTo.map(tagId => ({
        id: tagId,
        changes: {
          taskIds: [...state.entities[tagId].taskIds, taskId],
        }
      }));
      return tagAdapter.updateMany([...removeFrom, ...addTo], state);
    }
    default:
      return _reducer(state, action);
  }
}


