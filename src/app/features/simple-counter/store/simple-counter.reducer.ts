import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import * as simpleCounterActions from './simple-counter.actions';
import {
  Action,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
} from '@ngrx/store';
import {
  SimpleCounter,
  SimpleCounterState,
  SimpleCounterType,
} from '../simple-counter.model';
import { DEFAULT_SIMPLE_COUNTERS } from '../simple-counter.const';
import { arrayToDictionary } from '../../../util/array-to-dictionary';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { updateAllInDictionary } from '../../../util/update-all-in-dictionary';
import { migrateSimpleCounterState } from '../migrate-simple-counter-state.util';
import { Update } from '@ngrx/entity/src/models';

export const SIMPLE_COUNTER_FEATURE_NAME = 'simpleCounter';

export const adapter: EntityAdapter<SimpleCounter> = createEntityAdapter<SimpleCounter>();
export const selectSimpleCounterFeatureState = createFeatureSelector<SimpleCounterState>(
  SIMPLE_COUNTER_FEATURE_NAME,
);
export const { selectIds, selectEntities, selectAll, selectTotal } =
  adapter.getSelectors();
export const selectAllSimpleCounters = createSelector(
  selectSimpleCounterFeatureState,
  selectAll,
);
export const selectSimpleCounterById = createSelector(
  selectSimpleCounterFeatureState,
  (state: SimpleCounterState, props: { id: string }) => state.entities[props.id],
);

export const initialSimpleCounterState: SimpleCounterState =
  adapter.getInitialState<SimpleCounterState>({
    ids: DEFAULT_SIMPLE_COUNTERS.map((value) => value.id),
    entities: arrayToDictionary<SimpleCounter>(DEFAULT_SIMPLE_COUNTERS),
  });

const disableIsOnForAll = (state: SimpleCounterState): SimpleCounterState => {
  return {
    ...state,
    entities: updateAllInDictionary<SimpleCounter>(state.entities, { isOn: false }),
  };
};

const _reducer = createReducer<SimpleCounterState>(
  initialSimpleCounterState,

  on(loadAllData, (oldState, { appDataComplete }) =>
    appDataComplete.simpleCounter
      ? {
          // ...appDataComplete.simpleCounter,
          ...migrateSimpleCounterState(disableIsOnForAll(appDataComplete.simpleCounter)),
        }
      : oldState,
  ),

  on(simpleCounterActions.updateAllSimpleCounters, (state, { items }) => {
    const allNewItemIds = items.map((item) => item.id);
    const itemIdsToRemove = state.ids.filter((id) => !allNewItemIds.includes(id));

    let newState = state;
    newState = adapter.removeMany(itemIdsToRemove, newState);
    newState = adapter.upsertMany(items, newState);
    return newState;
  }),

  on(simpleCounterActions.setSimpleCounterCounterToday, (state, { id, newVal }) =>
    adapter.updateOne(
      {
        id,
        changes: {
          countOnDay: {
            ...(state.entities[id] as SimpleCounter).countOnDay,
            [getWorklogStr()]: newVal,
          },
        },
      },
      state,
    ),
  ),

  on(
    simpleCounterActions.increaseSimpleCounterCounterToday,
    (state, { id, increaseBy }) => {
      const todayStr = getWorklogStr();
      const oldEntity = state.entities[id] as SimpleCounter;
      const currentTotalCount = oldEntity.countOnDay || {};
      const currentVal = currentTotalCount[todayStr] || 0;
      const newValForToday = currentVal + increaseBy;
      return adapter.updateOne(
        {
          id,
          changes: {
            countOnDay: {
              ...currentTotalCount,
              [todayStr]: newValForToday,
            },
          },
        },
        state,
      );
    },
  ),

  on(simpleCounterActions.toggleSimpleCounterCounter, (state, { id }) =>
    adapter.updateOne(
      {
        id,
        changes: { isOn: !(state.entities[id] as SimpleCounter).isOn },
      },
      state,
    ),
  ),

  on(simpleCounterActions.setSimpleCounterCounterOn, (state, { id }) =>
    adapter.updateOne(
      {
        id,
        changes: { isOn: true },
      },
      state,
    ),
  ),

  on(simpleCounterActions.setSimpleCounterCounterOff, (state, { id }) =>
    adapter.updateOne(
      {
        id,
        changes: { isOn: false },
      },
      state,
    ),
  ),

  on(simpleCounterActions.addSimpleCounter, (state, { simpleCounter }) =>
    adapter.addOne(simpleCounter, state),
  ),

  on(simpleCounterActions.updateSimpleCounter, (state, { simpleCounter }) =>
    adapter.updateOne(simpleCounter, state),
  ),

  on(simpleCounterActions.upsertSimpleCounter, (state, { simpleCounter }) =>
    adapter.upsertOne(simpleCounter, state),
  ),

  on(simpleCounterActions.deleteSimpleCounter, (state, { id }) =>
    adapter.removeOne(id, state),
  ),

  on(simpleCounterActions.deleteSimpleCounters, (state, { ids }) =>
    adapter.removeMany(ids, state),
  ),

  on(simpleCounterActions.turnOffAllSimpleCounterCounters, (state) => {
    const updates: Update<SimpleCounter>[] = state.ids
      .filter(
        (id) =>
          state.entities[id]?.type === SimpleCounterType.StopWatch &&
          state.entities[id]?.isOn,
      )
      .map((id: string) => ({
        id,
        changes: {
          isOn: false,
        },
      }));
    return adapter.updateMany(updates, state);
  }),
);

export const simpleCounterReducer = (
  state: SimpleCounterState = initialSimpleCounterState,
  action: Action,
): SimpleCounterState => _reducer(state, action);
