import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import * as tagActions from './tag.actions';
import {Tag, TagState} from '../tag.model';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';
import {AddTask, TaskActionTypes, UpdateTaskTags} from '../../tasks/store/task.actions';
import {MY_DAY_TAG} from '../tag.const';
import {WorkContextType} from '../../work-context/work-context.model';

export const TAG_FEATURE_NAME = 'tag';


export const adapter: EntityAdapter<Tag> = createEntityAdapter<Tag>();
export const selectTagFeatureState = createFeatureSelector<TagState>(TAG_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllTags = createSelector(selectTagFeatureState, selectAll);
export const selectAllTagsWithoutMyDay = createSelector(
  selectAllTags,
  (tags: Tag[]): Tag[] => tags.filter(tag => tag.id !== MY_DAY_TAG.id)
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


export const initialTagState: TagState = adapter.getInitialState({
  // additional entity state properties
});


const _reducer = createReducer<TagState>(
  initialTagState,

  on(tagActions.addTag, (state, {tag}) => adapter.addOne(tag, state)),

  on(tagActions.updateTag, (state, {tag}) => adapter.updateOne(tag, state)),

  on(tagActions.upsertTag, (state, {tag}) => adapter.upsertOne(tag, state)),

  on(tagActions.deleteTag, (state, {id}) => adapter.removeOne(id, state)),

  on(tagActions.deleteTags, (state, {ids}) => adapter.removeMany(ids, state)),

  on(tagActions.loadTagState, (oldState, {state}) => ({...oldState, ...state})),
);


export function tagReducer(
  state = initialTagState,
  action: Action,
): TagState {
  switch (action.type) {
    case TaskActionTypes.AddTask: {
      const {payload} = action as AddTask;
      const {workContextId, workContextType, task, isAddToBottom} = payload;
      const affectedEntity = state.entities[workContextId];
      return (workContextType === WorkContextType.TAG)
        ? {
          ...state,
          entities: {
            ...state.entities,
            [workContextId]: {
              ...affectedEntity,
              taskIds: isAddToBottom
                ? [
                  ...affectedEntity.taskIds,
                  task.id,
                ]
                : [
                  task.id,
                  ...affectedEntity.taskIds
                ]
            }
          },
        }
        : state;
    }

    // TODO handle delete task and possible add task
    case TaskActionTypes.UpdateTaskTags: {
      const {payload} = action as UpdateTaskTags;
      // const {newTagIds, oldTagIds, taskId} = payload;
      const {newTagIds = [], oldTagIds = [], taskId} = payload;
      const removedFrom: string[] = oldTagIds.filter(oldId => !newTagIds.includes(oldId));
      const addedTo: string[] = newTagIds.filter(newId => !oldTagIds.includes(newId));

      return {
        ...state,
        entities: (state.ids as string[]).reduce((acc, id) => {
          const tag = state.entities[id] as Tag;
          const tagTaskIds = tag.taskIds || [];
          if (removedFrom.includes(id)) {
            return {
              ...acc,
              [id]: ({
                ...tag,
                taskIds: tagTaskIds.filter(tagTaskId => tagTaskId !== taskId)
              } as Tag)
            };
          }
          if (addedTo.includes(id)) {
            return {
              ...acc,
              [id]: ({
                ...tag,
                taskIds: [...tagTaskIds, taskId]
              } as Tag)
            };
          }
          return acc;
        }, state.entities)
      };
    }
    default:
      return _reducer(state, action);
  }
}


