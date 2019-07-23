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
    case TagActionTypes.LoadTagState:
      return {...action.payload.state};
    default:
      return state;
  }
}
