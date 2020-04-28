import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import * as simpleCounterActions from './simple-counter.actions';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';
import {SimpleCounter, SimpleCounterState} from '../simple-counter.model';
import {DEFAULT_SIMPLE_COUNTERS} from '../simple-counter.const';
import {arrayToDictionary} from '../../../util/array-to-dictionary';
import {loadDataComplete} from '../../../root-store/meta/load-data-complete.action';

export const SIMPLE_COUNTER_FEATURE_NAME = 'simpleCounter';


export const adapter: EntityAdapter<SimpleCounter> = createEntityAdapter<SimpleCounter>();
export const selectSimpleCounterFeatureState = createFeatureSelector<SimpleCounterState>(SIMPLE_COUNTER_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllSimpleCounters = createSelector(selectSimpleCounterFeatureState, selectAll);
export const selectSimpleCounterById = createSelector(
  selectSimpleCounterFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);

export const initialSimpleCounterState: SimpleCounterState = adapter.getInitialState<SimpleCounterState>({
  ids: DEFAULT_SIMPLE_COUNTERS.map(value => value.id),
  entities: arrayToDictionary<SimpleCounter>(DEFAULT_SIMPLE_COUNTERS),
});

const _reducer = createReducer<SimpleCounterState>(
  initialSimpleCounterState,

  on(loadDataComplete, (oldState, {appDataComplete}) =>
    appDataComplete.simpleCounter
      ? {...appDataComplete.simpleCounter}
      : oldState
  ),

  on(simpleCounterActions.addSimpleCounter, (state, {simpleCounter}) => adapter.addOne(simpleCounter, state)),

  on(simpleCounterActions.updateSimpleCounter, (state, {simpleCounter}) => adapter.updateOne(simpleCounter, state)),

  on(simpleCounterActions.upsertSimpleCounter, (state, {simpleCounter}) => adapter.upsertOne(simpleCounter, state)),

  on(simpleCounterActions.deleteSimpleCounter, (state, {id}) => adapter.removeOne(id, state)),

  on(simpleCounterActions.deleteSimpleCounters, (state, {ids}) => adapter.removeMany(ids, state)),
);


export function simpleCounterReducer(
  state = initialSimpleCounterState,
  action: Action,
): SimpleCounterState {
  return _reducer(state, action);
}


