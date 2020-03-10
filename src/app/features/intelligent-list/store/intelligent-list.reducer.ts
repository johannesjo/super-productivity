import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import * as intelligentListActions from './intelligent-list.actions';
import {IntelligentList, IntelligentListState} from '../intelligent-list.model';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';

export const INTELLIGENT_LIST_FEATURE_NAME = 'intelligentList';


export const adapter: EntityAdapter<IntelligentList> = createEntityAdapter<IntelligentList>();
export const selectIntelligentListFeatureState = createFeatureSelector<IntelligentListState>(INTELLIGENT_LIST_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllIntelligentLists = createSelector(selectIntelligentListFeatureState, selectAll);
export const selectIntelligentListById = createSelector(
  selectIntelligentListFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);
export const selectCurrentIntelligentListId = createSelector(selectIntelligentListFeatureState, (state): string => state.currentId);


export const initialIntelligentListState: IntelligentListState = adapter.getInitialState<IntelligentListState>({
  currentId: null,
  ids: ['ALL'],
  entities: {
    ALL: {
      id: 'ALL',
      title: 'All Tasks',
      icon: 'wb_sunny',
      isTranslate: true,
      criteria: [
        {projects: 'ALL'}
      ]
    }
  }
});


const _reducer = createReducer<IntelligentListState>(
  initialIntelligentListState,

  on(intelligentListActions.addIntelligentList, (state, {intelligentList}) => adapter.addOne(intelligentList, state)),

  on(intelligentListActions.updateIntelligentList, (state, {intelligentList}) => adapter.updateOne(intelligentList, state)),

  on(intelligentListActions.upsertIntelligentList, (state, {intelligentList}) => adapter.upsertOne(intelligentList, state)),

  on(intelligentListActions.deleteIntelligentList, (state, {id}) => adapter.removeOne(id, state)),

  on(intelligentListActions.deleteIntelligentLists, (state, {ids}) => adapter.removeMany(ids, state)),

  on(intelligentListActions.loadIntelligentListState, (oldState, {state}) => ({...oldState, ...state})),
);


export function intelligentListReducer(
  state = initialIntelligentListState,
  action: Action,
): IntelligentListState {
  return _reducer(state, action);
}


