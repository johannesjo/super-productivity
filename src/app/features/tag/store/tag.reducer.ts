import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import * as tagActions from './tag.actions';
import {Tag, TagState} from '../tag.model';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';

export const TAG_FEATURE_NAME = 'tag';


export const adapter: EntityAdapter<Tag> = createEntityAdapter<Tag>();
export const selectTagFeatureState = createFeatureSelector<TagState>(TAG_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllTags = createSelector(selectTagFeatureState, selectAll);
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
      (tag: Tag) => tag.name === props.name
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
  return _reducer(state, action);
}


