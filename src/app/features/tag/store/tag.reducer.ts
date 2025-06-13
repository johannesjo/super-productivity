import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { Tag, TagState } from '../tag.model';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { TODAY_TAG } from '../tag.const';
import { WorkContextType } from '../../work-context/work-context.model';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskToBottomInTodayList,
  moveTaskToTopInTodayList,
  moveTaskUpInTodayList,
} from '../../work-context/store/work-context-meta.actions';
import { moveTaskForWorkContextLikeState } from '../../work-context/store/work-context-meta.helper';
import {
  arrayMoveLeftUntil,
  arrayMoveRightUntil,
  arrayMoveToEnd,
  arrayMoveToStart,
} from '../../../util/array-move';
import { unique } from '../../../util/unique';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { migrateTagState } from '../migrate-tag-state.util';
import { MODEL_VERSION_KEY } from '../../../app.constants';
import { MODEL_VERSION } from '../../../core/model-version';
import {
  addTag,
  deleteTag,
  deleteTags,
  moveTaskInTodayTagList,
  updateAdvancedConfigForTag,
  updateTag,
  updateTagOrder,
  upsertTag,
} from './tag.actions';
import { PlannerActions } from '../../planner/store/planner.actions';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { moveItemBeforeItem } from '../../../util/move-item-before-item';

export const TAG_FEATURE_NAME = 'tag';
const WORK_CONTEXT_TYPE: WorkContextType = WorkContextType.TAG;

export const tagAdapter: EntityAdapter<Tag> = createEntityAdapter<Tag>();
export const selectTagFeatureState = createFeatureSelector<TagState>(TAG_FEATURE_NAME);
export const { selectIds, selectEntities, selectAll, selectTotal } =
  tagAdapter.getSelectors();
export const selectAllTags = createSelector(selectTagFeatureState, selectAll);
export const selectAllTagIds = createSelector(selectTagFeatureState, selectIds);

export const selectAllTagsWithoutMyDay = createSelector(
  selectAllTags,
  (tags: Tag[]): Tag[] => tags.filter((tag) => tag.id !== TODAY_TAG.id),
);

export const selectTodayTagTaskIds = createSelector(
  selectTagFeatureState,
  (state: TagState): string[] => {
    return state.entities[TODAY_TAG.id]!.taskIds as string[];
  },
);

export const selectTagById = createSelector(
  selectTagFeatureState,
  (state: TagState, props: { id: string }): Tag => {
    const tag = state.entities[props.id];
    if (!tag) {
      throw new Error('No tag ' + props.id);
    }
    return tag;
  },
);

export const selectTagsByIds = createSelector(
  selectTagFeatureState,
  (state: TagState, props: { ids: string[]; isAllowNull: boolean }): Tag[] =>
    props.isAllowNull
      ? (props.ids.map((id) => state.entities[id]).filter((tag) => !!tag) as Tag[])
      : props.ids.map((id) => {
          const tag = state.entities[id];
          if (!tag) {
            throw new Error('No tag ' + id);
          }
          return tag;
        }),
);

// export const selectTodayTag = createSelector(
//   selectTagFeatureState,
//   (s): Tag => s.entities[TODAY_TAG.id] as Tag,
// );

// TODO also add no list tag
const _addMyDayTagIfNecessary = (state: TagState): TagState => {
  if (state.ids && !(state.ids as string[]).includes(TODAY_TAG.id)) {
    state = {
      ...state,
      ids: [TODAY_TAG.id, ...state.ids] as string[],
      entities: {
        ...state.entities,
        [TODAY_TAG.id]: TODAY_TAG,
      },
    };
  }

  return state;
};

export const initialTagState: TagState = _addMyDayTagIfNecessary(
  tagAdapter.getInitialState({
    // additional entity state properties
    [MODEL_VERSION_KEY]: MODEL_VERSION.TAG,
  }),
);

export const tagReducer = createReducer<TagState>(
  initialTagState,

  // META ACTIONS
  // ------------
  on(loadAllData, (oldState, { appDataComplete }) =>
    _addMyDayTagIfNecessary(
      appDataComplete.tag ? migrateTagState({ ...appDataComplete.tag }) : oldState,
    ),
  ),

  on(
    PlannerActions.transferTask,
    (state, { task, today, targetIndex, newDay, prevDay, targetTaskId }) => {
      const todayTag = state.entities[TODAY_TAG.id] as Tag;

      if (prevDay === today && newDay !== today) {
        return tagAdapter.updateOne(
          {
            id: TODAY_TAG.id,
            changes: {
              taskIds: todayTag.taskIds.filter((id) => id !== task.id),
            },
          },
          state,
        );
      }
      if (prevDay !== today && newDay === today) {
        const taskIds = [...todayTag.taskIds];
        const targetIndexToUse = targetTaskId
          ? todayTag.taskIds.findIndex((id) => id === targetTaskId)
          : targetIndex;
        taskIds.splice(targetIndexToUse, 0, task.id);
        return tagAdapter.updateOne(
          {
            id: TODAY_TAG.id,
            changes: {
              taskIds: unique(taskIds),
            },
          },
          state,
        );
      }

      return state;
    },
  ),

  on(PlannerActions.planTaskForDay, (state, { task, day, isAddToTop }) => {
    const todayStr = getWorklogStr();
    const todayTag = state.entities[TODAY_TAG.id] as Tag;

    if (day === todayStr && !todayTag.taskIds.includes(task.id)) {
      return tagAdapter.updateOne(
        {
          id: todayTag.id,
          changes: {
            taskIds: unique(
              isAddToTop
                ? [task.id, ...todayTag.taskIds]
                : [...todayTag.taskIds.filter((tid) => tid !== task.id), task.id],
            ),
          },
        },
        state,
      );
    } else if (day !== todayStr && todayTag.taskIds.includes(task.id)) {
      return tagAdapter.updateOne(
        {
          id: todayTag.id,
          changes: {
            taskIds: todayTag.taskIds.filter((id) => id !== task.id),
          },
        },
        state,
      );
    }

    return state;
  }),

  on(PlannerActions.moveBeforeTask, (state, { fromTask, toTaskId }) => {
    const todayTag = state.entities[TODAY_TAG.id] as Tag;
    if (todayTag.taskIds.includes(toTaskId)) {
      const taskIds = todayTag.taskIds.filter((id) => id !== fromTask.id);
      const targetIndex = taskIds.indexOf(toTaskId);
      taskIds.splice(targetIndex, 0, fromTask.id);

      return tagAdapter.updateOne(
        {
          id: todayTag.id,
          changes: {
            taskIds: unique(taskIds),
          },
        },
        state,
      );
    } else if (todayTag.taskIds.includes(fromTask.id)) {
      return tagAdapter.updateOne(
        {
          id: todayTag.id,
          changes: {
            taskIds: todayTag.taskIds.filter((id) => id !== fromTask.id),
          },
        },
        state,
      );
    }

    return state;
  }),

  // REGULAR ACTIONS
  // --------------------
  on(
    moveTaskInTodayList,
    (
      state: TagState,
      { taskId, newOrderedIds, src, target, workContextType, workContextId },
    ) => {
      if (workContextType !== WORK_CONTEXT_TYPE) {
        return state;
      }
      const tag = state.entities[workContextId];
      if (!tag) {
        throw new Error('No tag');
      }
      const taskIdsBefore = tag.taskIds;
      const taskIds = moveTaskForWorkContextLikeState(
        taskId,
        newOrderedIds,
        target,
        taskIdsBefore,
      );
      return tagAdapter.updateOne(
        {
          id: workContextId,
          changes: {
            taskIds,
          },
        },
        state,
      );
    },
  ),

  on(
    moveTaskUpInTodayList,
    (state: TagState, { taskId, workContextId, workContextType, doneTaskIds }) =>
      workContextType === WORK_CONTEXT_TYPE
        ? tagAdapter.updateOne(
            {
              id: workContextId,
              changes: {
                taskIds: arrayMoveLeftUntil(
                  (state.entities[workContextId] as Tag).taskIds,
                  taskId,
                  (id) => !doneTaskIds.includes(id),
                ),
              },
            },
            state,
          )
        : state,
  ),

  on(
    moveTaskDownInTodayList,
    (state: TagState, { taskId, workContextId, workContextType, doneTaskIds }) =>
      workContextType === WORK_CONTEXT_TYPE
        ? tagAdapter.updateOne(
            {
              id: workContextId,
              changes: {
                taskIds: arrayMoveRightUntil(
                  (state.entities[workContextId] as Tag).taskIds,
                  taskId,
                  (id) => !doneTaskIds.includes(id),
                ),
              },
            },
            state,
          )
        : state,
  ),

  on(moveTaskToTopInTodayList, (state, { taskId, workContextType, workContextId }) => {
    return workContextType === WORK_CONTEXT_TYPE
      ? tagAdapter.updateOne(
          {
            id: workContextId,
            changes: {
              taskIds: arrayMoveToStart(
                (state.entities[workContextId] as Tag).taskIds,
                taskId,
              ),
            },
          },
          state,
        )
      : state;
  }),

  on(moveTaskToBottomInTodayList, (state, { taskId, workContextType, workContextId }) => {
    return workContextType === WORK_CONTEXT_TYPE
      ? tagAdapter.updateOne(
          {
            id: workContextId,
            changes: {
              taskIds: arrayMoveToEnd(
                (state.entities[workContextId] as Tag).taskIds,
                taskId,
              ),
            },
          },
          state,
        )
      : state;
  }),

  // INTERNAL
  // --------
  on(addTag, (state: TagState, { tag }) => tagAdapter.addOne(tag, state)),

  on(updateTag, (state: TagState, { tag }) => tagAdapter.updateOne(tag, state)),

  on(upsertTag, (state: TagState, { tag }) => tagAdapter.upsertOne(tag, state)),

  on(deleteTag, (state: TagState, { id }) => tagAdapter.removeOne(id, state)),

  on(deleteTags, (state: TagState, { ids }) => tagAdapter.removeMany(ids, state)),

  on(updateTagOrder, (state: TagState, { ids }) => {
    if (ids.length !== state.ids.length) {
      console.log({ state, ids });
      throw new Error('Tag length should not change on re-order');
    }

    return {
      ...state,
      ids,
    };
  }),

  on(updateAdvancedConfigForTag, (state: TagState, { tagId, sectionKey, data }) => {
    const tagToUpdate = state.entities[tagId] as Tag;
    return tagAdapter.updateOne(
      {
        id: tagId,
        changes: {
          advancedCfg: {
            ...tagToUpdate.advancedCfg,
            [sectionKey]: {
              ...tagToUpdate.advancedCfg[sectionKey],
              ...data,
            },
          },
        },
      },
      state,
    );
  }),

  // TASK STUFF
  // ---------

  on(moveTaskInTodayTagList, (state, { toTaskId, fromTaskId }) => {
    const todayTag = state.entities[TODAY_TAG.id] as Tag;
    return tagAdapter.updateOne(
      {
        id: todayTag.id,
        changes: {
          taskIds: moveItemBeforeItem(todayTag.taskIds, fromTaskId, toTaskId),
        },
      },
      state,
    );
  }),
);
