import {Tag} from '../tag.model';
import {createEntityAdapter, EntityAdapter, EntityState} from '@ngrx/entity';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {TagActions, TagActionTypes} from './tag.actions';

export interface TagState extends EntityState<Tag> {}

export const adapter: EntityAdapter<Tag> = createEntityAdapter<Tag>();

export const initialTagState: TagState = adapter.getInitialState();

export const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal
} = adapter.getSelectors();

export const TAG_FEATURE_NAME = 'tag';
export const selectTagFeatureState = createFeatureSelector<TagState>(TAG_FEATURE_NAME);

export const selectAllTags = createSelector(selectTagFeatureState, selectAll);
export const selectTagsByIds = createSelector(
  selectTagFeatureState,
  (state, props: { ids }) => props.ids ? props.ids.map(
    id => state.entities[id]) : []
);

export const selectTagById = createSelector(
  selectTagFeatureState,
  (state, props: {id: string}) => state.entities[props.id]
);

export const selectTagByName = createSelector(
  selectTagFeatureState,
  (state, props: {name: string}): Tag | undefined => {
    const results = <Tag[]> Object.values(state.entities).filter(
      (tag: Tag) => tag.name === props.name);
    return results.length ? results[0] : undefined;
  }
);

export function tagReducer(
  state = initialTagState,
  action: TagActions
): TagState {
  switch (action.type) {
    case TagActionTypes.AddTag: {
      return adapter.addOne(action.payload.tag, state);
      // return {...state,
      //   entities: {
      //     ...state.entities,
      //     [action.payload.tag.id]: action.payload.tag
      //   },
      //   ids: [action.payload.tag.id, ...state.ids] as string[] | number[]
      //   };
    }
    case TagActionTypes.DeleteTag: {
      // action.payload.taskService.getTasksByTag(action.payload.id).subscribe(tasks => {
      //   // const taskIdsToRemove = tasks.reduce((ids: string[], task) => {
      //   //   return [...ids, ...task.subTasks.map(subTask => subTask.id), ...[task.id]];
      //   // }, []);
      //   tasks.forEach(task => action.payload.taskService.removeTags(task, [action.payload.id]));
      // });
      return adapter.removeOne(action.payload.id, state);
    }
    case TagActionTypes.UpdateTag: {
      return adapter.updateOne(action.payload, state);
    }
    case TagActionTypes.LoadTagState:
      // console.log('Loading tag state');
      // console.log(action.payload.state);
      return {...action.payload.state};
    default:
      return state;
  }
}
