import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import * as <%= camelize(name)%>Actions from './<%= dasherize(name) %>.actions';
import { <%= classify(name)%>, <%= classify(name)%>State } from '../<%= dasherize(name) %>.model';
import { Action, createReducer, createFeatureSelector, createSelector, on } from '@ngrx/store';

export const <%= underscore(name).toUpperCase()%>_FEATURE_NAME = '<%= camelize(name) %>';


export const adapter: EntityAdapter<<%= classify(name)%>> = createEntityAdapter<<%= classify(name)%>>();
export const select<%= classify(name)%>FeatureState = createFeatureSelector<<%= classify(name)%>State>(<%= underscore(name).toUpperCase()%>_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAll<%= classify(name)%>s = createSelector(select<%= classify(name)%>FeatureState, selectAll);
export const select<%= classify(name)%>ById = createSelector(
  select<%= classify(name)%>FeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);


export const initial<%= classify(name)%>State: <%= classify(name)%>State = adapter.getInitialState<<%= classify(name)%>State>({
    // additional entity state properties
});


const _reducer = createReducer<<%= classify(name)%>State>(
  initial<%= classify(name)%>State,

  on(<%= camelize(name)%>Actions.add<%= classify(name)%>, (state, {<%= camelize(name) %>}) => adapter.addOne(<%= camelize(name) %>, state)),

  on(<%= camelize(name)%>Actions.update<%= classify(name)%>, (state, {<%= camelize(name) %>}) => adapter.updateOne(<%= camelize(name) %>, state)),

  on(<%= camelize(name)%>Actions.upsert<%= classify(name)%>, (state, {<%= camelize(name) %>}) => adapter.upsertOne(<%= camelize(name) %>, state)),

  on(<%= camelize(name)%>Actions.delete<%= classify(name)%>, (state, {id}) => adapter.removeOne(id, state)),

  on(<%= camelize(name)%>Actions.delete<%= classify(name)%>s, (state, {ids}) => adapter.removeMany(ids, state)),

  on(<%= camelize(name)%>Actions.load<%= classify(name)%>State, (oldState, {state}) => ({...oldState, ...state})),
);



export function <%= camelize(name) %>Reducer(
    state = initial<%= classify(name)%>State,
    action: Action,
): <%= classify(name)%>State {
  return _reducer(state, action);
}


