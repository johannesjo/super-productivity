import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
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
import { updateAllInDictionary } from '../../../util/update-all-in-dictionary';
import { Update } from '@ngrx/entity/src/models';
import {
  addSimpleCounter,
  decreaseSimpleCounterCounterToday,
  deleteSimpleCounter,
  deleteSimpleCounters,
  increaseSimpleCounterCounterToday,
  setSimpleCounterCounterForDate,
  setSimpleCounterCounterOff,
  setSimpleCounterCounterOn,
  setSimpleCounterCounterToday,
  toggleSimpleCounterCounter,
  turnOffAllSimpleCounterCounters,
  updateAllSimpleCounters,
  updateSimpleCounter,
  upsertSimpleCounter,
} from './simple-counter.actions';

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

export const selectHasSimpleCounterData = createSelector(
  selectSimpleCounterFeatureState,
  (state: SimpleCounterState): boolean => state.ids.length > 0,
);

export const selectEnabledSimpleCounters = createSelector(
  selectAllSimpleCounters,
  (items): SimpleCounter[] => items.filter((item) => item.isEnabled),
);

export const selectEnabledAndToggledSimpleCounters = createSelector(
  selectAllSimpleCounters,
  (items) => items && items.filter((item) => item.isEnabled && item.isOn),
);

export const selectEnabledSimpleStopWatchCounters = createSelector(
  selectEnabledSimpleCounters,
  (items): SimpleCounter[] =>
    items.filter((item) => item.type === SimpleCounterType.StopWatch && item.isEnabled),
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
          ...disableIsOnForAll(appDataComplete.simpleCounter),
        }
      : oldState,
  ),

  on(updateAllSimpleCounters, (state, { items }) => {
    const allNewItemIds = items.map((item) => item.id);
    const itemIdsToRemove = state.ids.filter((id) => !allNewItemIds.includes(id));

    let newState = state;
    newState = adapter.removeMany(itemIdsToRemove, newState);
    newState = adapter.upsertMany(items, newState);
    return newState;
  }),

  on(setSimpleCounterCounterToday, (state, { id, newVal, today }) =>
    adapter.updateOne(
      {
        id,
        changes: {
          countOnDay: {
            ...(state.entities[id] as SimpleCounter).countOnDay,
            [today]: newVal,
          },
        },
      },
      state,
    ),
  ),

  on(setSimpleCounterCounterForDate, (state, { id, newVal, date }) =>
    adapter.updateOne(
      {
        id,
        changes: {
          countOnDay: {
            ...(state.entities[id] as SimpleCounter).countOnDay,
            [date]: newVal,
          },
        },
      },
      state,
    ),
  ),

  on(increaseSimpleCounterCounterToday, (state, { id, increaseBy, today }) => {
    const todayStr = today;
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
  }),

  on(decreaseSimpleCounterCounterToday, (state, { id, decreaseBy, today }) => {
    const todayStr = today;
    const oldEntity = state.entities[id] as SimpleCounter;
    const currentTotalCount = oldEntity.countOnDay || {};
    const currentVal = currentTotalCount[todayStr] || 0;
    const newValForToday = Math.max(0, currentVal - decreaseBy);
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
  }),

  on(toggleSimpleCounterCounter, (state, { id }) =>
    adapter.updateOne(
      {
        id,
        changes: { isOn: !(state.entities[id] as SimpleCounter).isOn },
      },
      state,
    ),
  ),

  on(setSimpleCounterCounterOn, (state, { id }) =>
    adapter.updateOne(
      {
        id,
        changes: { isOn: true },
      },
      state,
    ),
  ),

  on(setSimpleCounterCounterOff, (state, { id }) =>
    adapter.updateOne(
      {
        id,
        changes: { isOn: false },
      },
      state,
    ),
  ),

  on(addSimpleCounter, (state, { simpleCounter }) =>
    adapter.addOne(simpleCounter, state),
  ),

  on(updateSimpleCounter, (state, { simpleCounter }) =>
    adapter.updateOne(simpleCounter, state),
  ),

  on(upsertSimpleCounter, (state, { simpleCounter }) =>
    adapter.upsertOne(simpleCounter, state),
  ),

  on(deleteSimpleCounter, (state, { id }) => adapter.removeOne(id, state)),

  on(deleteSimpleCounters, (state, { ids }) => adapter.removeMany(ids, state)),

  on(turnOffAllSimpleCounterCounters, (state) => {
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
